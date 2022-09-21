<template>
    <div>
        <v-row>
            <v-col cols="6">
                <h4>Api Token</h4>
                <v-card outlined class="mb-4">
                    <v-card-text v-if="apiToken && !loading">
                        <v-text-field id="apiToken" append-icon="mdi-content-copy" readonly @click:append="copyToken()" outlined dense hide-details="auto" :value="apiToken" v-show="apiToken"></v-text-field>
                        <input type="hidden" id="copyElement" :value="apiToken">
                    </v-card-text>
                    <v-card-text v-else>
                        <v-skeleton-loader type="list-item-two-line"></v-skeleton-loader>
                    </v-card-text>
                </v-card>
            </v-col>
        </v-row>
    </div>
</template>
<script>

export default {
    name: 'Account',
    data: () => ({
        apiToken: null,
        loading: false
    }),
    mounted: function() {
        this.loading = true;
        this.server.getApiToken()
            .then(({ data: { apiToken }}) => this.apiToken = apiToken)
            .catch(console.log)
            .finally(() => this.loading = false);
    },
    methods: {
        copyToken: function() {
            const webhookField = document.querySelector('#copyElement');
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                const copied = document.execCommand('copy');
                const message = copied ? 'Token copied!' : `Couldn't copy token`;
                alert(message);
            } catch(error) {
                alert(`Couldn't copy token`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
    }
}
</script>
