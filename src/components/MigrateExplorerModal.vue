<template>
    <v-dialog v-model="dialog" :max-width="user.canTrial || justMigrated ? 600 : 1800" :persistent="true">
        <v-card outlined v-if="explorerId" :class="{'pa-4': !user.canTrial && !justMigrated }">
            <v-card-title v-if="!user.canTrial && !justMigrated">Setup up your explorer</v-card-title>
            <v-card-title v-else>
                <template v-if="!finalized">
                    <v-progress-circular
                        class="mr-2"
                        indeterminate
                        size="16"
                        width="2"
                        color="primary"></v-progress-circular>
                        Finalizing your explorer
                </template>
                <span v-else class="success--text">
                    <v-icon class="success--text mr-2">mdi-check-circle-outline</v-icon>Your explorer is ready!
                </span>
            </v-card-title>
            <template v-if="user.canTrial || justMigrated">
                <v-card-text>
                    <template v-if="finalized">You can now:</template>
                    <template v-else>Your explorer is almost ready. You'll soon be able to:</template>
                    <ul style="list-style: none;" class="mt-2 pl-0">
                        <li class="my-2"><v-icon class="mr-2" color="primary">mdi-palette-outline</v-icon>Add your logo, colors, fonts</li>
                        <li class="my-2"><v-icon class="mr-2" color="primary">mdi-web</v-icon>Add external links</li>
                        <li class="my-2"><v-icon class="mr-2" color="primary">mdi-alpha-c-circle-outline</v-icon>Update your native token symbol</li>
                        <li class="my-2"><v-icon class="mr-2" color="primary">mdi-link</v-icon>Use your own domain name</li>
                    </ul>
                </v-card-text>
                <div align="center" class="mb-4">
                    <v-btn :disabled="!finalized" color="primary" @click="goToOverview()">Continue</v-btn>
                </div>
            </template>
            <template v-else>
                <v-card-text>
                    You've already used your free trial, please choose a plan below to finalize your explorer.
                    <div v-if="!user.cryptoPaymentEnabled">To setup crypto payment (Explorer 150 or above), reach out to contact@tryethernal.com.</div>
                </v-card-text>
                <Explorer-Plan-Selector
                    :explorerId="explorerId"
                    :stripeSuccessUrl="`http://app.${mainDomain}/overview?justMigrated=${explorerId}`"
                    :stripeCancelUrl="`http://app.${mainDomain}/overview?explorerToken=${explorerToken}`"
                    @planCreated="planCreated"></Explorer-Plan-Selector>
            </template>
        </v-card>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import ExplorerPlanSelector from './ExplorerPlanSelector.vue';

export default {
    name: 'MigrateExplorerModal',
    components: {
        ExplorerPlanSelector
    },
    data: () => ({
        explorerId: null,
        loading: false,
        dialog: false,
        resolve: null,
        reject: null,
        errorMessage: null,
        explorerToken: null,
        finalized: null,
        justMigrated: true
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.errorMessage = null;
            this.loading = false;
            this.explorerId = options.explorerId;
            this.explorerToken = options.explorerToken;
            this.justMigrated = !!options.justMigrated;

            if (this.user.canTrial)
                this.server.migrateDemoExplorer(this.explorerToken)
                    .then(this.waitForMigration)
                    .catch(console.log);
            else if (this.justMigrated)
                this.waitForMigration();

            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        waitForMigration() {
            this.server.getExplorer(this.explorerId)
                .then(({ data }) => {
                    if (data.isDemo || data.userId != this.user.id)
                        return setTimeout(this.waitForMigration, 3000);
                    else
                        this.finalized = true;
                })
                .catch(() => {
                    setTimeout(this.waitForMigration, 3000);
                });
        },
        planCreated() {
            this.justMigrated = true;
            this.finalized = true;
        },
        goToOverview() {
            document.location.assign(`//app.${this.mainDomain}/overview`);
        },
        close(refresh) {
            this.resolve(refresh);
            this.reset();
        },
        reset() {
            this.resolve = null;
            this.reject = null;
            this.dialog = false;
        }
    },
    computed: {
        ...mapGetters([
            'user',
            'isBillingEnabled',
            'mainDomain'
        ])
    }
}
</script>
