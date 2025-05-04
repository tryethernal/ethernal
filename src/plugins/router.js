import { createWebHistory, createRouter } from 'vue-router';
import Blocks from '../components/Blocks.vue';
import Block from '../components/Block.vue';
import Transactions from '../components/Transactions.vue';
import InternalTransactions from '../components/InternalTransactions.vue';
import Accounts from '../components/Accounts.vue';
import Transaction from '../components/Transaction.vue';
import Address from '../components/Address.vue';
import Auth from '../components/Auth.vue';
import Contracts from '../components/Contracts.vue';
import Tokens from '../components/Tokens.vue';
import Settings from '../components/Settings.vue';
import Overview from '../components/Overview.vue';
import ERC721Token from '../components/ERC721Token.vue';
import ERC721Collections from '../components/ERC721Collections.vue';
import ERC721Collection from '../components/ERC721Collection.vue';
import ExplorerStatus from '../components/ExplorerStatus.vue';
import Explorers from '../components/Explorers.vue';
import Explorer from '../components/Explorer.vue';
import ExplorerAnalytics from '../components/ExplorerAnalytics.vue';
import ExplorerFaucet from '../components/ExplorerFaucet.vue';
import ExplorerDex from '../components/ExplorerDex.vue';
import GasTracker from '../components/GasTracker.vue';
import ExplorerBridge from '../components/ExplorerBridge.vue';
import TopERC20Tokens from '../components/TopERC20Tokens.vue';
import TopNFT from '../components/TopNFT.vue';
import WorkspaceTokenTransfer from '../components/WorkspaceTokenTransfer.vue';
import WorkspaceNFTTransfer from '../components/WorkspaceNFTTransfer.vue';
import TokenContract from '../components/TokenContract.vue';
import { useEnvStore } from '../stores/env';
import VerifiedContracts from '@/components/VerifiedContracts.vue'

const isLoggedIn = () => {
    return localStorage.getItem('apiToken') !== null;
};

const redirectIfLoggedIn = function (to, from, next) {
    next();
    // if (isLoggedIn() || !envStore.isOnMainDomain) {
    //     if (to.path == '/auth')
    //         next({ path: to.query.path || '/transactions', query: to.query });
    //     else
    //         next(to || { path: '/transactions', query: to.query });
    // } else
    //     next();
};

const redirectIfLoggedOut = function (to, from, next) {
    const envStore = useEnvStore();

    if (to.hash && to.hash.startsWith('#'))
        to.query.tab = to.hash.split('#')[1];
    if (isLoggedIn() || !envStore.isOnMainDomain)
        next();
    else
        next({ path: '/auth', query: to.query });
};

/**
 * Etherscan routes for compatibility
 */
const ESRoutes = [
    { path: '/gastracker', component: GasTracker, beforeEnter: redirectIfLoggedOut },
    { path: '/txsInternal', component: InternalTransactions, beforeEnter: redirectIfLoggedOut },
    { path: '/tokenstxn', component: WorkspaceTokenTransfer, beforeEnter: redirectIfLoggedOut },
    { path: '/nft-transfers', component: WorkspaceNFTTransfer, beforeEnter: redirectIfLoggedOut },
    { path: '/toptokens', component: TopERC20Tokens, beforeEnter: redirectIfLoggedOut },
    { path: '/nft-top-contracts', component: TopNFT, beforeEnter: redirectIfLoggedOut },
    { path: '/charts', component: ExplorerAnalytics, beforeEnter: redirectIfLoggedOut },
    { path: '/contractsverified', component: VerifiedContracts, beforeEnter: redirectIfLoggedOut },
    { path: '/tx/:hash', component: Transaction, props: true, beforeEnter: redirectIfLoggedOut },
]

const routes = [
    { path: '/auth', component: Auth, beforeEnter: redirectIfLoggedIn },
    { path: '/blocks', component: Blocks, beforeEnter: redirectIfLoggedOut },
    { path: '/overview', component: Overview, beforeEnter: redirectIfLoggedOut },
    { path: '/block/:number', component: Block, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/gas', component: GasTracker, beforeEnter: redirectIfLoggedOut },
    { path: '/transactions', component: Transactions, beforeEnter: redirectIfLoggedOut },
    { path: '/internal-transactions', component: InternalTransactions, beforeEnter: redirectIfLoggedOut },
    { path: '/latest-erc20-transfers', component: WorkspaceTokenTransfer, beforeEnter: redirectIfLoggedOut },
    { path: '/latest-nft-transfers', component: WorkspaceNFTTransfer, beforeEnter: redirectIfLoggedOut },
    { path: '/accounts', component: Accounts, beforeEnter: redirectIfLoggedOut },
    { path: '/transaction/:hash', component: Transaction, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/address/:address', component: Address, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/address/:hash/:tokenId', component: ERC721Token, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/token/:hash/:tokenId', component: ERC721Token, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/token/:address', component: TokenContract, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/contract/:address', redirect: '/address/:address' },
    { path: '/contracts', component: Contracts, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/verified-contracts', component: VerifiedContracts, beforeEnter: redirectIfLoggedOut },
    { path: '/tokens', component: Tokens, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/nfts', component: ERC721Collections, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/nft/:address', component: ERC721Collection, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/settings', component: Settings, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/analytics', component: ExplorerAnalytics, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/explorers', component: Explorers, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/explorers/:id', component: Explorer, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/status', component: ExplorerStatus, beforeEnter: redirectIfLoggedOut },
    { path: '/faucet', component: ExplorerFaucet, beforeEnter: redirectIfLoggedOut },
    { path: '/dex', component: ExplorerDex, beforeEnter: redirectIfLoggedOut },
    { path: '/bridge', component: ExplorerBridge, beforeEnter: redirectIfLoggedOut },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: Overview, beforeEnter: redirectIfLoggedOut }
];

const router = createRouter({
    history: createWebHistory(),
    routes: ESRoutes.concat(routes)
});

export default router;
