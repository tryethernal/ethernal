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
        if (!data.workspaceId || !data.address || data.index === undefined || data.index === null) {
            console.log(data);
            throw '[POST /tasks/reloadErc721] Missing parameter.';
        }

        const workspace = await db.getWorkspaceById(data.workspaceId);

        const erc721Connector = new ERC721Connector(workspace.rpcServer, data.address, { metadata: true, enumerable: true });

        const tokenId = await erc721Connector.tokenByIndex(data.index);
        const URI = await erc721Connector.tokenURI(tokenId.toString());
        const owner = await erc721Connector.ownerOf(tokenId.toString());

        const axiosableURI = URI.startsWith('ipfs://') ?
            `https://ipfs.io/ipfs/${URI.slice(7, URI.length)}` : URI;

        const metadata = (await axios.get(axiosableURI)).data;
        await db.updateErc721Token(workspace.id, data.address, data.index, { metadata, owner });

        res.sendStatus(200);
    } catch(error) {
        console.log(error);
        res.sendStatus(400);
    }
})

module.exports = router;
