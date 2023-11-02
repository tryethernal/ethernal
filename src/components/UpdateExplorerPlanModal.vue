<template>
    <v-dialog v-model="dialog" max-width="1800" :persistent="true">
        <v-card>
            <v-card-title>
                Select A Plan
                <v-spacer></v-spacer>
                <v-btn icon @click="close()" ><v-icon>mdi-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text>
                <ul style="list-style: none;" v-if="!user.cryptoPaymentEnabled || user.canTrial" class="mb-4 pl-0">
                    <li v-if="!user.cryptoPaymentEnabled">To setup crypto payment (Explorer 150 or above), reach out to contact@tryethernal.com.</li>
                    <li v-if="user.canTrial">Each plan includes a 7 day free trial - No credit card needed.</li>
                </ul>
                <Explorer-Plan-Selector
                    :pendingCancelation="options.pendingCancelation"
                    :currentPlanSlug="options.currentPlanSlug"
                    :isTrialing="options.isTrialing"
                    :explorerId="options.explorerId"
                    :stripeSuccessUrl="`http://app.${mainDomain}/explorers/${options.explorerId}?justCreated=true`"
                    :stripeCancelUrl="`http://app.${mainDomain}/explorers/${options.explorerId}`"
                    @planUpdated="planUpdated"
                    @planCanceled="planCanceled"
                    @planCreated="planUpdated"></Explorer-Plan-Selector>
            </v-card-text>
        </v-card>
    </v-dialog>
</template>
<script>
import { mapGetters } from 'vuex';
import ExplorerPlanSelector from './ExplorerPlanSelector.vue';

export default {
    name: 'UpdateExplorerPlanModal',
    components: {
        ExplorerPlanSelector
    },
    data: () => ({
        dialog: false,
        resolve: null,
        reject: null,
        options: {},
        refresh: false
    }),
    methods: {
        open(options) {
            this.dialog = true;
            this.options = options;
            return new Promise((resolve, reject) => {
                this.resolve = resolve;
                this.reject = reject;
            });
        },
        planCreated(slug) {
            this.options.currentPlanSlug = slug;
            this.refresh = true;
        },
        planUpdated(slug) {
            this.options.currentPlanSlug = slug;
            this.options.pendingCancelation = false;
            this.refresh = true;
        },
        planCanceled() {
            this.options.pendingCancelation = true;
            this.refresh = true;
        },
        close() {
            this.resolve(this.refresh);
            this.reset();
        },
        reset: function() {
            this.dialog = false;
            this.resolve = null;
            this.reject = null;
            this.refresh = false;
        },
    },
    computed: {
        ...mapGetters([
            'user',
            'mainDomain'
        ])
    }
}
</script>
