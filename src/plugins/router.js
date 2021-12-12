import VueRouter from 'vue-router';
import { auth } from './firebase';
import Blocks from '../components/Blocks.vue';
import Block from '../components/Block.vue';
import Transactions from '../components/Transactions.vue';
import Accounts from '../components/Accounts.vue';
import Transaction from '../components/Transaction.vue';
import Address from '../components/Address.vue';
import Auth from '../components/Auth.vue';
import Contracts from '../components/Contracts.vue';
import Tokens from '../components/Tokens.vue';
import Settings from '../components/Settings.vue';

var redirectIfLoggedIn = function (to, from, next) {
    if (auth().currentUser) {
        next({ path: '/transactions' });
    }
    else next();
};

var redirectIfLoggedOut = function (to, from, next) {
    if (!auth().currentUser) {
        next({ path: '/auth', query: { next: document.location.pathname, ...to.query }});
    }
    else next();
};

const routes = [
    { path: '/auth', component: Auth, beforeEnter: redirectIfLoggedIn },
    { path: '/blocks', component: Blocks, beforeEnter: redirectIfLoggedOut },
    { path: '/block/:number', component: Block, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/transactions', component: Transactions, beforeEnter: redirectIfLoggedOut },
    { path: '/accounts', component: Accounts, beforeEnter: redirectIfLoggedOut },
    { path: '/transaction/:hash', component: Transaction, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/address/:hash', component: Address, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/contracts', component: Contracts, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/tokens', component: Tokens, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '/settings', component: Settings, props: true, beforeEnter: redirectIfLoggedOut },
    { path: '*', redirect: '/transactions' }
];

export default new VueRouter({
    mode: 'history',
    routes: routes
});
