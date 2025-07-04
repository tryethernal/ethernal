<template>
    <v-card flat>
        <v-card-text v-if="(!userStore.plan || userStore.plan == 'free') && userStore.onboarded">
            <v-alert density="compact" text type="error">Free plan users are limited to one workspace. <a href="#" @click.stop="goToBilling()">Upgrade</a> to our Premium plan to create more.</v-alert>
        </v-card-text>
        <v-card-text v-else>
            <v-alert class="mb-3" v-show="errorMessage" density="compact" text type="error" v-html="errorMessage"></v-alert>
            <div class="mb-2">
                <v-alert type="warning" class="my-2" v-if="isUsingSafari">
                    Safari is preventing websites from making CORS requests to localhost. This will prevent you from connecting to a local blockchain. If you want to do so, you'll need to use another browser.
                    If you want to connect to a remote chain, or are not using Safari, you can ignore this message.
                </v-alert>
                <a id="detectServers" href="#" @click.prevent="detectNetwork()">Detect Networks</a>&nbsp;
                <v-tooltip location="top">
                    <template v-slot:activator="{ props }">
                        <v-icon size="small" v-bind="props">mdi-help-circle-outline</v-icon>
                    </template>
                    This will send a RPC request asking for a network ID to 127.0.0.1 on http and ws protocols on commonly used ports (7545, 8545 and 9545).<br>The address will be displayed below if the request is successful.
                </v-tooltip>
                <ul v-show="detectedNetworks.length" class="mx-4 mt-2">
                    <li v-for="(address, idx) in detectedNetworks" :key="idx">
                        {{ address }}&nbsp;<a href="#" :id="`serverDetected-${idx}`" @click.prevent="rpcServer = address">Use</a>
                    </li>
                </ul>
                <div v-show="noNetworks">
                    No networks detected. If you were expecting something, make sure they are running on 7545, 8545 or 9545 and that your browser is not blocking requests to localhost (looking at you Brave & Safari 👀!).
                </div>
            </div>
            <v-form @submit.prevent="initRpcServer(name, rpcServer)" v-model="valid">
                <v-text-field
                    :rules="[v => !!v || 'Name is required']"
                    variant="outlined" v-model="name" id="workspaceName" label="Name*" placeholder="My Ethereum Project" hide-details="auto" class="mb-2" required></v-text-field>
                <v-text-field
                    :rules="[
                        v => isUrlValid(v) || 'RPC needs to be a valid URL',
                        v => !!v || 'RPC server is required'
                    ]"
                    variant="outlined" v-model="rpcServer" id="workspaceServer" label="RPC Server*" placeholder="ws://localhost:8545" hide-details="auto" class="mb-2" required></v-text-field>
                <v-select id="chain" item-title="name" item-value="slug" variant="outlined" required label="Chain" v-model="chain" :items="availableChains" hide-details="auto"></v-select>

                <v-card-actions>
                    <v-spacer></v-spacer>
                    <v-btn variant="flat" id="createWorkspace" :loading="loading" color="primary" :disabled="!valid" type="submit">Create</v-btn>
                </v-card-actions>
            </v-form>
        </v-card-text>
    </v-card>
</template>
<script setup>
import { ref, computed, watch, onMounted, inject } from 'vue';
import { useEnvStore } from '@/stores/env';
import { useUserStore } from '@/stores/user';
const ipaddr = require('ipaddr.js');

const emit = defineEmits(['workspaceCreated', 'goToBilling', 'validatedWorkspaceSettings']);

const envStore = useEnvStore();
const userStore = useUserStore();

const $server = inject('$server');

const availableChains = ref([]);
const chain = ref('ethereum');
const errorMessage = ref(null);
const loading = ref(false);
const name = ref(null);
const rpcServer = ref(null);
const localNetwork = ref(false);
const detectedNetworks = ref([]);
const noNetworks = ref(false);
const workspace = ref(null);
const valid = ref(false);

onMounted(() => {
    availableChains.value = Object.values(envStore.chains).map((chain) => ({
        name: chain.name,
        slug: chain.slug
    }));
});

function isUrlValid(url) {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

function goToBilling() {
    emit('goToBilling');
}

function detectNetwork() {
    noNetworks.value = false;
    $server.searchForLocalChains().then((res) => {
        detectedNetworks.value = res;
        if (!res.length) {
            noNetworks.value = true;
        }
    });
}

function initRpcServer(nameVal, rpcServerVal) {
    loading.value = true;
    $server.initRpcServer(rpcServerVal)
        .then(data => {
            workspace.value = data;
            createWorkspace();
        })
        .catch(error => {
            loading.value = false;
            if (error.message.indexOf('Invalid URL') > -1)
                return errorMessage.value = `
                    URL of the rpc server looks invalid. Make sure you entered a valid ws(s) or http(s) url.
                `;
            else if (localNetwork.value && (rpcServerVal.startsWith('http://') || rpcServerVal.startsWith('ws://'))) {
                return errorMessage.value = `
                    Can't connect to rpc server, 
                    make sure your node is up, and reachable from the browser.<br>
                    If you are using Brave, you'll need to disable Shields. 
                    Try disabling adblockers as well.<br>
                    Another option is to setup a public URL such as <a href="https://ngrok.com/" target="_blank">ngrok</a>, and use https to connect.
                `;
            }
            else if (!localNetwork.value && (rpcServerVal.startsWith('http://') || rpcServerVal.startsWith('ws://'))) {
                return errorMessage.value = `
                    Can't connect to remote rpc server.<br>
                    Make sure your node is up, supports "eth_chainId" & "net_version" requests, and that you've allowed app.tryethernal.com to 
                    <a href="https://experienceleague.adobe.com/docs/target/using/experiences/vec/troubleshoot-composer/mixed-content.html" target="_blank">load insecure content</a>.<br>
                    Try using a secure connection (https or wss) if possible.
                `;
            }
            else if (!localNetwork.value && rpcServerVal.startsWith('wss://')) {
                return errorMessage.value = `
                    Can't connect to remote rpc server. Is your node up?<br>
                    Check as well that your node supports "eth_chainId" & "net_version" requests.<br>
                    Try using https if possible.
                `;
            }
            else
                return errorMessage.value = `
                    Can't connect to remote rpc server. Is your node up?<br>
                    Make sure CORS settings are allowing "${envStore.mainDomain}" to connect to it.<br>
                    Check as well that your node supports "eth_chainId" & "net_version" requests.<br>
                `;
        })
}

function createWorkspace() {
    errorMessage.value = null;
    $server.createWorkspace(name.value, { ...workspace.value, chain: chain.value })
        .then(({ data }) => {
            emit('workspaceCreated', data);
        })
        .catch(error => {
            console.log(error)
            if (error.response && error.response.data)
                return errorMessage.value = error.response.data;
            else
                return errorMessage.value = 'Error while creating workspace';
        })
        .finally(() => loading.value = false)
}

const isUsingSafari = computed(() => {
    return !!window.GestureEvent;
});

watch(rpcServer, (newVal) => {
    try {
        if (!isUrlValid(newVal)) {
            return;
        }
        const hostname = new URL(newVal).hostname;
        const localStrings = ['private', 'linkLocal', 'loopback', 'carrierGradeNat', 'localhost'];
        if (hostname == 'localhost') {
            localNetwork.value = true;
        }
        else {
            localNetwork.value = ipaddr.isValid(hostname) && localStrings.indexOf(ipaddr.parse(hostname).range()) > -1;
        }
    } catch (error) {
        console.log(error);
    }
});
</script>
