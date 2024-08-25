const { getStripeSecretKey } = require('../lib/env');
const stripe = require('stripe')(getStripeSecretKey());
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
const { managedError, unmanagedError } = require('../lib/errors');

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

router.post('/resetPassword', async (req, res, next) => {
    const data = req.body;

    try {
        if (!data.token || !data.password)
            return managedError(new Error('Missing parameter.'), req, res);

        const tokenData = decode(data.token);

        if (!tokenData.expiresAt || !tokenData.email)
            return managedError(new Error('Invalid link, please send another password reset request.'), req, res);

        if (parseInt(tokenData.expiresAt) < Date.now())
            return managedError(new Error('This password reset link has expired.'), req, res);

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
        unmanagedError(error, req, next);
    }
});

router.post('/sendResetPasswordEmail', async (req, res, next) => {
    const data = req.body;

    try {
        if (!isSendgridEnabled())
            return managedError(new Error('Sendgrid has not been enabled.'), req, res);

        if (!data.email)
            return managedError(new Error('Missing parameter.'), req, res);

        await enqueue('sendResetPasswordEmail', `sendResetPasswordEmail-${Date.now()}`, { email: data.email });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/getFirebaseHashes', async (req, res, next) => {
    const data = req.query;
    try {
        if (data.secret != process.env.SECRET)
            return managedError(new Error(`Auth error`), req, res);

        await enqueue('batchInsertFirebasePasswordHashes', `batchInsertFirebasePasswordHashes-${Date.now()}`, { secret: data.secret });

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/signin', localAuth, async (req, res, next) => {
    try {
        analytics.track(req.user.id, 'auth:user_signin');
        analytics.shutdown();

        res.status(200).json({ user: req.user });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/signup', async (req, res, next) => {
    const data = req.body;

    try {
        if (!data.email || !data.password)
            return managedError(new Error('Missing parameter.'), req, res);

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
        unmanagedError(error, req, next);
    }
});

router.get('/me/apiToken', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        const user = await db.getUser(data.uid, ['apiKey', 'apiToken']);

        res.status(200).json({ apiToken: user.apiToken });
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/me/setCurrentWorkspace', authMiddleware, async (req, res, next) => {
    const data = req.body.data;

    try {
        await db.setCurrentWorkspace(data.uid, data.workspace);

        res.sendStatus(200);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.get('/me', authMiddleware, async (req, res, next) => {
    const data = req.body.data;
    try {
        const user = await db.getUser(data.uid, ['apiToken', 'apiKey', 'canTrial', 'canUseDemoPlan']);

        res.status(200).json(user);
    } catch(error) {
        unmanagedError(error, req, next);
    }
});

router.post('/', async (req, res, next) => {
    const data = req.body.data;

    try {
        if (!data.firebaseUserId)
            return managedError(new Error('Missing parameter.'), req, res);

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
        unmanagedError(error, req, next);
    }
});

module.exports = router;
