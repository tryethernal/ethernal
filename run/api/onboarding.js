/**
 * @fileoverview Atomic onboarding setup endpoint.
 * Creates user, Stripe customer, workspace, and optionally explorer in a single call.
 * Replaces the multi-step signup flow for the new onboarding wizard.
 * @module api/onboarding
 *
 * @route POST /setup - Atomic account + workspace + explorer creation
 */

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const uuidAPIKey = require('uuid-apikey');
const { randomUUID } = require('crypto');
const { getStripeSecretKey, getDefaultPlanSlug, getEnterpriseContactEmail } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
const { isStripeEnabled, isFirebaseAuthEnabled } = require('../lib/flags');
const { encrypt, firebaseHash, encode } = require('../lib/crypto');
const { sanitize, withTimeout } = require('../lib/utils');
const { ProviderConnector } = require('../lib/rpc');
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { managedError, unmanagedError } = require('../lib/errors');

const setupRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * POST /api/onboarding/setup
 * Atomically creates a user account, workspace, and optionally an explorer.
 * Public endpoint — no auth required.
 *
 * @param {string} req.body.email - User email
 * @param {string} req.body.password - User password
 * @param {string} req.body.path - "public" or "private"
 * @param {string} [req.body.rpcServer] - RPC URL (required for public path)
 * @param {string} [req.body.explorerName] - Explorer name (required for public path)
 * @param {string} [req.body.nativeToken] - Native token symbol (optional, public path)
 * @returns {{ token: string, user: Object, workspace: Object, explorer?: Object }}
 */
router.post('/setup', setupRateLimit, async (req, res, next) => {
    const data = req.body;

    try {
        // Validate required fields
        if (!data.email || !data.password || !data.path)
            return managedError(new Error('Missing parameter.'), req, res);

        // Public path validations
        if (data.path === 'public') {
            if (!data.rpcServer)
                return managedError(new Error('Missing parameter: rpcServer is required for public explorers.'), req, res);
            if (!data.explorerName)
                return managedError(new Error('Missing parameter: explorerName is required for public explorers.'), req, res);
        }

        // Check email uniqueness
        const existingUser = await db.getUserByEmail(data.email);
        if (existingUser)
            return managedError(new Error('This email is already in use.'), req, res);

        // Validate RPC for public path before creating anything
        let networkId;
        if (data.path === 'public') {
            const provider = new ProviderConnector(data.rpcServer);
            try {
                networkId = await withTimeout(provider.fetchNetworkId());
            } catch {
                networkId = null;
            }

            if (!networkId)
                return managedError(new Error("Our servers can't query this RPC. Please use an RPC that is reachable from the internet."), req, res);
        }

        // Generate API key
        const apiKey = uuidAPIKey.create().apiKey;
        const encryptedKey = encrypt(apiKey);

        // Generate auth credentials
        let uid, passwordSalt, passwordHash;
        if (isFirebaseAuthEnabled()) {
            const { getAuth } = require('firebase-admin/auth');
            await getAuth().createUser({ email: data.email, password: data.password });
            const firebaseUser = await getAuth().getUserByEmail(data.email);
            ({ uid, passwordSalt, passwordHash } = firebaseUser);
        } else {
            ({ uid, passwordSalt, passwordHash } = { uid: randomUUID(), ...(await firebaseHash(data.password)) });
        }

        // Create Stripe customer
        const customer = isStripeEnabled() ? await stripe.customers.create({
            email: data.email
        }) : { id: 'dummy' };

        // If Stripe isn't setup we assume all users are premium
        const plan = isStripeEnabled() ? 'free' : 'premium';

        // Create user
        const user = await db.createUser(uid, {
            email: data.email,
            apiKey: encryptedKey,
            stripeCustomerId: customer.id,
            plan: plan,
            passwordSalt,
            passwordHash
        });

        // Create workspace and explorer
        let workspace, explorer;
        if (data.path === 'public') {
            // createExplorerFromOptions creates its own workspace internally,
            // so we don't create one separately (would cause duplicate name error)
            const stripePlan = await db.getStripePlan(getDefaultPlanSlug());

            const options = sanitize({
                name: data.explorerName,
                networkId,
                backendRpcServer: data.rpcServer,
                dataRetentionLimit: 1,
                token: data.nativeToken || null,
                onboarding_source: 'onboarding',
                chain: data.chainParam || null,
                subscription: {
                    stripePlanId: stripePlan ? stripePlan.id : null,
                    stripeId: null,
                    cycleEndsAt: new Date(0),
                    status: 'active'
                }
            });

            explorer = await db.createExplorerFromOptions(user.id, options);
            // createExplorerFromOptions creates the workspace internally
            // and sets currentWorkspaceId, but doesn't return the workspace on the explorer.
            // Fetch the workspace via the explorer's workspaceId.
            workspace = await db.getWorkspaceById(explorer.workspaceId);
        } else {
            // Private path: create workspace directly
            const workspaceData = {
                name: data.workspaceName || `${data.email}'s workspace`,
                chain: data.chain || 'ethereum',
                public: false,
                rpcServer: data.rpcServer || 'http://localhost:8545',
                networkId: networkId || data.networkId || '1'
            };
            workspace = await db.createWorkspace(uid, workspaceData);
        }

        // Set as current workspace (for private path only — public path is handled by createExplorerFromOptions)
        if (data.path === 'private') {
            await db.setCurrentWorkspace(uid, workspace.name);
        }

        // Generate auth token
        const token = encode({ firebaseUserId: uid, apiKey });

        // Enqueue processUser job
        await enqueue('processUser', `processUser-${user.id}`, {
            id: user.id,
            source: 'onboarding',
            flow: data.path,
            chain: data.chainParam || null
        });

        const response = { token, user, workspace };
        if (explorer)
            response.explorer = explorer;

        res.status(200).json(response);
    } catch(error) {
        // Known user-facing errors — return clean JSON instead of HTML stack trace
        const knownErrors = [
            'You already have a workspace with this name',
            'This explorer name is already taken',
            'Failed to create user',
            'Failed to create workspace',
            'Could not find default plan'
        ];
        if (knownErrors.some(msg => error.message && error.message.includes(msg)))
            return managedError(error, req, res);

        unmanagedError(error, req, next);
    }
});

/**
 * POST /api/onboarding/contact
 * Sends an enterprise contact inquiry email via Mailjet.
 * Public endpoint — no auth required.
 *
 * @param {string} req.body.contact - Point of contact (email, Telegram, Discord)
 * @param {string} req.body.message - Freeform message
 * @param {string} [req.body.explorerName] - Explorer name from onboarding context
 * @param {string} [req.body.rpcServer] - RPC URL from onboarding context
 * @param {string} [req.body.email] - Signup email from onboarding context
 * @returns {200} on success
 */
const contactRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

router.post('/contact', contactRateLimit, async (req, res, next) => {
    const { contact, message, explorerName, rpcServer, email, source } = req.body;

    try {
        if (!contact || !message)
            return managedError(new Error('Missing required fields: contact and message.'), req, res);

        if (contact.length > 1000 || message.length > 5000)
            return managedError(new Error('Input too long.'), req, res);

        const { getMailjetPublicKey, getMailjetPrivateKey, getDemoExplorerSender } = require('../lib/env');
        const Mailjet = require('node-mailjet');
        const mailjet = Mailjet.apiConnect(getMailjetPublicKey(), getMailjetPrivateKey());

        const senderRaw = getDemoExplorerSender();
        const senderMatch = senderRaw ? senderRaw.match(/^(.+?)\s*<(.+)>$/) : null;
        const senderEmail = senderMatch ? senderMatch[2] : (senderRaw || 'noreply@tryethernal.com');
        const senderName = senderMatch ? senderMatch[1].trim() : 'Ethernal';

        // Escape HTML to prevent XSS in email body
        const esc = (str) => (str || 'N/A').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const isContact = source === 'contact';
        const subjectLabel = isContact ? 'Contact Form Message' : 'Enterprise Inquiry';

        const htmlBody = `
            <h2>${subjectLabel}</h2>
            <p><strong>Point of contact:</strong> ${esc(contact)}</p>
            <p><strong>Message:</strong></p>
            <p>${esc(message).replace(/\n/g, '<br>')}</p>
            <hr>
            <h3>Onboarding Context</h3>
            <ul>
                <li><strong>Explorer Name:</strong> ${esc(explorerName)}</li>
                <li><strong>RPC Server:</strong> ${esc(rpcServer)}</li>
                <li><strong>Signup Email:</strong> ${esc(email)}</li>
            </ul>
        `;

        await mailjet.post('send', { version: 'v3.1' }).request({
            Messages: [{
                From: { Email: senderEmail, Name: senderName },
                To: [{ Email: getEnterpriseContactEmail() }],
                Subject: `${subjectLabel} from ${contact}`,
                HTMLPart: htmlBody,
                CustomID: `${isContact ? 'contact' : 'enterprise-contact'}-${Date.now()}`
            }]
        });

        res.sendStatus(200);
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
