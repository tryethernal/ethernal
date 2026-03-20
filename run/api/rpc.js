/**
 * @fileoverview Public RPC validation endpoint.
 * Validates RPC server reachability and returns chain info.
 * Used by the onboarding wizard before account creation.
 * @module api/rpc
 */
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { ProviderConnector } = require('../lib/rpc');
const { withTimeout } = require('../lib/utils');
const { managedError, unmanagedError } = require('../lib/errors');

const validateRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: 'Too many requests. Please try again later.',
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * POST /api/rpc/validate
 * Validates RPC reachability and returns chain/network ID.
 * Public endpoint — no auth required.
 * @param {string} req.body.rpcServer - RPC URL to validate
 * @returns {{ chainId: number, networkId: number }}
 */
router.post('/validate', validateRateLimit, async (req, res, next) => {
    try {
        const { rpcServer } = req.body;

        if (!rpcServer)
            return managedError(new Error('Missing parameter.'), req, res);

        try {
            new URL(rpcServer);
        } catch {
            return managedError(new Error('Invalid RPC URL.'), req, res);
        }

        const provider = new ProviderConnector(rpcServer);
        let networkId;
        try {
            networkId = await withTimeout(provider.fetchNetworkId());
        } catch {
            return managedError(new Error("Our servers can't query this RPC. Please use an RPC that is reachable from the internet."), req, res);
        }

        if (!networkId)
            return managedError(new Error("Our servers can't query this RPC. Please use an RPC that is reachable from the internet."), req, res);

        res.status(200).json({ chainId: networkId, networkId });
    } catch (error) {
        unmanagedError(error, req, next);
    }
});

module.exports = router;
