
<template>
    <v-app>
        <v-main>
            <v-container fluid>
                <Explorer v-if="explorerId" :id="explorerId" sso="true" />
                <v-skeleton-loader v-else type="list-item-three-line"></v-skeleton-loader>
            </v-container>
        </v-main>
    </v-app>
</template>
<script>
import Explorer from './components/Explorer.vue';
import { useUserStore } from './stores/user';

export default {
    name: 'Explorers',
    components: {
        Explorer
    },
    data: () => ({
        user: null,
        explorerId: null,
    }),
    mounted() {
        localStorage.setItem('ssoApiToken', this.$route.query.apiToken);
        this.$server.getCurrentUser()
            .then(({ data: { user }}) => {
                useUserStore().updateUser(user);
                this.explorerId = this.$route.query.explorerId;
            })
            .catch(error => {
                console.log(error)
            });
    }
}
</script>
