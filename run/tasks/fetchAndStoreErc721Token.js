const express = require('express');
const ethers = require('ethers');
const axios = require('axios');
const taskAuthMiddleware = require('../middlewares/taskAuth');
const db = require('../lib/firebase');
const { ERC721Connector } = require('../lib/rpc');
const { sanitize } = require('../lib/utils');

const router = express.Router();

router.post('/', taskAuthMiddleware, async (req, res) => {
    try {
        const data = req.body.data;
        if (!data.workspaceId || !data.address || !data.index) {
            console.log(data);
            throw '[POST /tasks/fetchAndStoreErc721Token] Missing parameter.';
        }

        const workspace = await db.getWorkspaceById(data.workspaceId);

        const erc721Connector = new ERC721Connector(workspace.rpcServer, data.address, { metadata: true, enumerable: true });

        const tokenId = await erc721Connector.tokenByIndex(ethers.BigNumber.from(data.index).toString());

        if (!tokenId)
            return res.sendStatus(200);

        const owner = await erc721Connector.ownerOf(tokenId.toString());
        const URI = await erc721Connector.tokenURI(tokenId.toString());

        const axiosableURI = URI.startsWith('ipfs://') ?
            `https://ipfs.io/ipfs/${URI.slice(7, URI.length)}` : URI;

        const metadata = (await axios.get(axiosableURI)).data;

        const token = sanitize({
            tokenId: tokenId.toString(),
            owner: owner,
            URI: URI,
            metadata: metadata
        });

        await db.storeErc721Token(workspace.id, data.address, token);

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
