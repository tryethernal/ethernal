const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../lib/logger');
const { isStripeEnabled } = require('../lib/flags');
const { getAuth } = require('firebase-admin/auth');
const uuidAPIKey = require('uuid-apikey');
const express = require('express');
const router = express.Router();
const db = require('../lib/firebase');
const { enqueue } = require('../lib/queue');
const { randomUUID } = require('crypto');
const authMiddleware = require('../middlewares/auth');
const { encrypt } = require('../lib/crypto');
const localAuth = require('../middlewares/passportLocalStrategy');
const tokenAuth = require('../middlewares/passportTokenStrategy');

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
        const firebaseUserId = randomUUID();

        // Workaround until we make the stripeCustomerId column nullable
        const customer = isStripeEnabled ? await stripe.customers.create({
            email: data.email
        }) : { id: 'dummy' };

        // If Stripe isn't setup we assume all users are premium
        const plan = isStripeEnabled ? 'free' : 'premium';

        const user = await db.createUser(firebaseUserId, {
            email: data.email,
            apiKey: encryptedKey,
            stripeCustomerId: customer.id,
            plan: plan
        });
        console.log(user)

        await enqueue('processUser', `processUser-${firebaseUserId}`, { uid: firebaseUserId });

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

router.get('/me', tokenAuth, async (req, res) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid, ['apiToken', 'apiKey']);

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
        const customer = isStripeEnabled ? await stripe.customers.create({
            email: authUser.email
        }) : { id: 'dummy' };

        // If Stripe isn't setup we assume all users are premium
        const plan = isStripeEnabled ? 'free' : 'premium';

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
