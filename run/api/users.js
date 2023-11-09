const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../lib/logger');
const Analytics = require('../lib/analytics');
const { isStripeEnabled, isSendgridEnabled, isFirebaseAuthEnabled } = require('../lib/flags');
const { getAuth } = require('firebase-admin/auth');
const uuidAPIKey = require('uuid-apikey');
const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { randomUUID } = require('crypto');
const authMiddleware = require('../middlewares/auth');
const { encrypt, decode, firebaseHash } = require('../lib/crypto');
const localAuth = require('../middlewares/passportLocalStrategy');

const analytics = new Analytics();

const findUser = async (email, nextPageToken) => {
    const listUsersResult = await getAuth().listUsers(500, nextPageToken);
    let result = null;
    listUsersResult.users.forEach(async userRecord => {
        if (userRecord.email == email)
            result = userRecord;
    });

    if (listUsersResult.pageToken && !result) {
        return await findUser(email, listUsersResult.pageToken);
    }

    return result;    
};

router.post('/resetPassword', async (req, res) => {
    const data = req.body;

    try {
        if (!data.token || !data.password)
            throw new Error('Missing parameter.');

        const tokenData = decode(data.token);

        if (!tokenData.expiresAt || !tokenData.email)
            throw new Error('Invalid link, please send another password reset request.')

        if (parseInt(tokenData.expiresAt) < Date.now())
            throw new Error('This password reset link has expired.')

        if (isFirebaseAuthEnabled()) {
            const user = await db.getUserByEmail(tokenData.email);
            await getAuth().updateUser(user.firebaseUserId, { password: data.password });
            const firebaseUser = await findUser(tokenData.email);
            const { passwordSalt, passwordHash } = firebaseUser;
            await db.updateUserFirebaseHash(tokenData.email, passwordSalt, passwordHash);
        }
        else
            await db.setUserPassword(tokenData.email, data.password);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.users.resetPassword', error: error, data: data});
        res.status(400).send(error.message);
    }
});

router.post('/sendResetPasswordEmail', async (req, res) => {
    const data = req.body;

    try {
        if (!isSendgridEnabled())
            throw new Error('Sendgrid has not been enabled.');

        if (!data.email)
            throw new Error('Missing parameter.');

        await enqueue('sendResetPasswordEmail', `sendResetPasswordEmail-${Date.now()}`, { email: data.email });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'post.api.users.sendResetPasswordEmail', error: error, data: data});
        res.status(400).send(error.message);
    }
});

router.post('/getFirebaseHashes', async (req, res) => {
    const data = req.query;
    try {
        if (data.secret != process.env.SECRET)
            throw new Error(`Auth error`);

        await enqueue('batchInsertFirebasePasswordHashes', `batchInsertFirebasePasswordHashes-${Date.now()}`, { secret: data.secret });

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.contracts.logs', error: error, data: { ...data, ...req.params }});
        res.status(400).send(error.message);
    }
});

router.post('/signin', localAuth, async (req, res) => {
    try {
        analytics.track(req.user.id, 'auth:user_signin');
        analytics.shutdown();

        res.status(200).json({ user: req.user });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.users.me.signin', error: error, user: req.user });
        res.status(400).send(error.message);
    }
});

router.post('/signup', async (req, res) => {
    const data = req.body;

    try {
        if (!data.email || !data.password)
            throw new Error('Missing parameter.');

        const apiKey = uuidAPIKey.create().apiKey;
        const encryptedKey = encrypt(apiKey);

        let uid, passwordSalt, passwordHash;
        if (isFirebaseAuthEnabled()) {
            await getAuth().createUser({ email: data.email, password: data.password });
            const firebaseUser = await findUser(data.email);
            ({ uid, passwordSalt, passwordHash } = firebaseUser);
        }
        else
            ({ uid, passwordSalt, passwordHash } = { uid: randomUUID(), ...(await firebaseHash(data.password)) });

        // Workaround until we make the stripeCustomerId column nullable
        const customer = isStripeEnabled() ? await stripe.customers.create({
            email: data.email
        }) : { id: 'dummy' };

        // If Stripe isn't setup we assume all users are premium
        const plan = isStripeEnabled() ? 'free' : 'premium';

        const user = await db.createUser(uid, {
            email: data.email,
            apiKey: encryptedKey,
            stripeCustomerId: customer.id,
            plan: plan,
            passwordSalt,
            passwordHash
        });

        res.status(200).json({ user });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.users', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/me/apiToken', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        const user = await db.getUser(data.uid, ['apiKey', 'apiToken']);

        res.status(200).json({ apiToken: user.apiToken });
    } catch(error) {
        logger.error(error.message, { location: 'get.api.users.me.apiToken', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/me/setCurrentWorkspace', authMiddleware, async (req, res) => {
    const data = req.body.data;

    try {
        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.users.me.setCurrentWorkspace', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.get('/me', authMiddleware, async (req, res) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid, ['apiToken', 'apiKey', 'canTrial', 'canUseDemoPlan']);

        res.status(200).json(user);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.users.me', error: error, data: data });
        res.status(400).send(error.message);
    }
});

router.post('/', async (req, res) => {
    const data = req.body.data;

    try {
        if (!data.firebaseUserId)
            throw new Error('Missing parameter.');

        const apiKey = uuidAPIKey.create().apiKey;
        const encryptedKey = encrypt(apiKey);

        const authUser = await getAuth().getUser(data.firebaseUserId);

        // Workaround until we make the stripeCustomerId column nullable
        const customer = isStripeEnabled() ? await stripe.customers.create({
            email: authUser.email
        }) : { id: 'dummy' };

        // If Stripe isn't setup we assume all users are premium
        const plan = isStripeEnabled() ? 'free' : 'premium';

        const user = await db.createUser(data.firebaseUserId, {
            email: authUser.email,
            apiKey: encryptedKey,
            stripeCustomerId: customer.id,
            plan: plan,
            passwordHash: authUser.passwordHash,
            passwordSalt: authUser.passwordSalt,
        });

        await enqueue('processUser', `processUser-${data.firebaseUserId}`, { uid: data.firebaseUserId });

        res.status(200).json(user);
    } catch(error) {
        logger.error(error.message, { location: 'get.api.users', error: error, data: data });
        res.status(400).send(error.message);
    }
});

module.exports = router;
