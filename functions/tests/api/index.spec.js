jest.mock('ethers', () => {
    const original = jest.requireActual('ethers');
    const Block = require('../fixtures/Block.json');
    const Transaction = require('../fixtures/Transaction.json');
    const TransactionReceipt = require('../fixtures/TransactionReceipt.json');

    const provider = {
        getTransaction: () => Transaction,
        getBlock: () => Block,
        getTransactionReceipt: () => TransactionReceipt
    };
    const ethers = jest.fn(() => provider);
    const providers = {
        JsonRpcProvider: jest.fn(() => { return provider }),
        WebSocketProvider: jest.fn(() => { return provider })
    };

    Object.defineProperty(ethers, 'providers', { value: providers });
    Object.defineProperty(ethers, 'BigNumber', { value: original.BigNumber });

    return ethers;
});
const ethers = require('ethers');
const express = require('express');
const supertest = require('supertest');
const stripe = require('stripe');
const Helper = require('../helper');
const routes = require('../../api/index');

const AlchemyPayload = require('../fixtures/AlchemyPayload.json');
const StripePaymentSucceededWebhookBody = require('../fixtures/StripePaymentSucceededWebhookBody')
const StripeCustomerUpdatedWebhookBody = require('../fixtures/StripeCustomerUpdatedWebhookBody');
const StripeSubscriptionDeletedWebhookBody = require('../fixtures/StripeSubscriptionDeletedWebhookBody');

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiIxMjMiLCJ3b3Jrc3BhY2UiOiJoYXJkaGF0IiwiYXBpS2V5IjoiR1Q4UDdGRC1SMk00U0NHLUdQQ1lFNTgtOEZDMTk2OSIsImlhdCI6MTYyNzM5MDExMX0.yRM2ZT2rxrhz4Uhfaz8gtyCnsKOkUmJwTEpaV1dsyhA';
const ENCRYPTED_API_KEY = 'a12fcf9289bf85dea1b50f2c8c941e12:0b3eef87b4b4faf01bfe775ddd238900a460c9f8afd33b66f44157e90d24c7d8';

const app = express();
let helper;

app.use('/', routes);

describe('/webhook/alchemy', () => {
    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ apiKey: ENCRYPTED_API_KEY });
    });

    it('Should sync received blocks & txs when activated', async () => {
        const { body } = await supertest(app)
            .post(`/webhooks/alchemy?token=${TOKEN}`)
            .type('json')
            .send(AlchemyPayload)
            .expect(200);

        const blockRef = await helper.workspace
            .collection('blocks')
            .doc('1')
            .get();

        const txRef = await helper.workspace
            .collection('transactions')
            .doc('0xb750fb9dd193bb4a46ea5426837c469815d2494abd68a94b1c2c190f3569c5b8')
            .get();

        expect(blockRef.data()).toMatchSnapshot();
        expect(txRef.data()).toMatchSnapshot();
    });

    afterEach(async () => {
        await helper.clean();
    });
});

describe.only('/webhooks/stripe', () => {
    let header, payloadString;

    beforeEach(async () => {
        helper = new Helper(process.env.GCLOUD_PROJECT);
        await helper.firestore
            .collection('users')
            .doc('123')
            .set({ stripeCustomerId: 'cus_KN6AD8pwBHd2sF' });
    });

    it('Should succeed on invoice.payment_succeeded', async () => {
        payloadString = JSON.stringify(StripePaymentSucceededWebhookBody, null, 2);

        header = stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret: 'whsec_test_secret'
        });

        await supertest(app)
            .post('/webhooks/stripe')
            .set('Content-Type', 'application/json')
            .set('stripe-signature', header)
            .send(payloadString)
            .expect(200);
    });

    it('Should succeed on customer.subscription.updated', async () => {
        payloadString = JSON.stringify(StripeCustomerUpdatedWebhookBody, null, 2);

        header = stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret: 'whsec_test_secret'
        });

        await supertest(app)
            .post('/webhooks/stripe')
            .set('Content-Type', 'application/json')
            .set('stripe-signature', header)
            .send(payloadString)
            .expect(200);
    });

    it('Should succeed on customer.subscription.deleted', async () => {
        payloadString = JSON.stringify(StripeSubscriptionDeletedWebhookBody, null, 2);

        header = stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret: 'whsec_test_secret'
        });

        await supertest(app)
            .post('/webhooks/stripe')
            .set('Content-Type', 'application/json')
            .set('stripe-signature', header)
            .send(payloadString)
            .expect(200);
    });

    it('Should fail if the signature is invalid', async () => {
        payloadString = JSON.stringify(StripePaymentSucceededWebhookBody, null, 2);

        header = stripe.webhooks.generateTestHeaderString({
            payload: payloadString,
            secret: 'wrongsecret'
        });

        await supertest(app)
            .post('/webhooks/stripe')
            .set('Content-Type', 'application/json')
            .set('stripe-signature', header)
            .send(payloadString)
            .expect(401);
    });

    afterEach(async () => {
        await helper.clean();
    });    
});
