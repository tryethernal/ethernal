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
const { getStripeSecretKey, getDefaultPlanSlug } = require('../lib/env');
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

        // Create workspace
        const workspaceName = data.path === 'public' ? data.explorerName : `${data.email}'s workspace`;
        const workspaceData = sanitize({
            name: workspaceName,
            public: data.path === 'public',
            rpcServer: data.rpcServer || null,
            networkId: networkId || null
        });
        const workspace = await db.createWorkspace(uid, workspaceData);

        // Set as current workspace
        await db.setCurrentWorkspace(uid, workspaceName);

        // Create explorer for public path
        let explorer;
        if (data.path === 'public') {
            const stripePlan = await db.getStripePlan(getDefaultPlanSlug());

            const options = sanitize({
                name: data.explorerName,
                networkId,
                backendRpcServer: data.rpcServer,
                dataRetentionLimit: 1,
                token: data.nativeToken || null,
                subscription: {
                    stripePlanId: stripePlan ? stripePlan.id : null,
                    stripeId: null,
                    cycleEndsAt: new Date(0),
                    status: 'active'
                }
            });

            explorer = await db.createExplorerFromOptions(user.id, options);
        }

        // Generate auth token
        const token = encode({ firebaseUserId: uid, apiKey });

        // Enqueue processUser job
        await enqueue('processUser', `processUser-${user.id}`, {
            id: user.id,
            source: 'onboarding',
            path: data.path
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

module.exports = router;
