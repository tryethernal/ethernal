const axios = require('axios');
const db = require('../lib/firebase');
const { ERC721Connector } = require('../lib/rpc');
const { sanitize, withTimeout } = require('../lib/utils');

module.exports = async job => {
    const data = job.data;

    if (!data.workspaceId || !data.address || data.tokenId === undefined || data.tokenId === null)
        return 'Missing parameter.';

    const workspace = await db.getWorkspaceById(data.workspaceId);
    if (!workspace.erc721LoadingEnabled)
        return 'ERC721 caching is disabled';

    let contract = await db.getContractByWorkspaceId(workspace.id, data.address);

    if (!contract)
        contract = await db.storeContractDataWithWorkspaceId(workspace.id, data.address);

    const erc721Connector = new ERC721Connector(workspace.rpcServer, data.address, contract.abi);

    const tokenTotalSupply = await erc721Connector.totalSupply();
    if (tokenTotalSupply)
        await db.storeContractDataWithWorkspaceId(workspace.id, data.address, { tokenTotalSupply });

    const URI = await erc721Connector.tokenURI(data.tokenId);
    let metadata = {};
    if (URI) {
        const axiosableURI = URI.startsWith('ipfs://') ? `https://ipfs.io/ipfs/${URI.slice(7, URI.length)}` : URI;

        try {
            metadata = (await withTimeout(axios.get(axiosableURI))).data;
        } catch(error) {
            metadata = {};
        }
    }

    const owner = await erc721Connector.ownerOf(data.tokenId.toString());

    if (!URI && !Object.keys(metadata).length && !owner)
        return 'Nothing to update';

    await db.storeErc721Token(workspace.id, data.address, sanitize({ URI, tokenId: data.tokenId, metadata, owner }));

    return { URI, metadata, owner };
};
