<template>
    <span>
        <router-link v-if="hash" :to="link()">{{ formattedHash }}</router-link>
        <span v-if="hash && !copied">
            &nbsp; <v-icon @click="copyHash()" x-small>mdi-content-copy</v-icon><input type="hidden" :id="`copyElement-${hash}`" :value="hash">
        </span>
        <span v-if="copied">
            &nbsp; <v-icon x-small>mdi-check</v-icon>
        </span>
    </span>
</template>
<script>
export default {
    name: 'HashLink',
    props: ['type', 'hash', 'fullHash'],
    data: () => ({
        copied: false
    }),
    computed: {
        formattedHash: function () {
            if (!this.hash) return;
            if (this.fullHash) {
                return this.hash;
            }
            else {
                return `${this.hash.slice(0, 10)}...${this.hash.slice(-5)}`;
            }
        }
    },
    methods: {
        link: function() { return `/${[this.type, this.hash].join('/')}`; },
        copyHash: function() {
            const webhookField = document.querySelector(`#copyElement-${this.hash}`);
            webhookField.setAttribute('type', 'text');
            webhookField.select();

            try {
                document.execCommand('copy');
                this.copied = true;
                setTimeout(() => this.copied = false, 1000);
            } catch(error) {
                alert(`Couldn't copy hash`);
            } finally {
                webhookField.setAttribute('type', 'hidden');
                window.getSelection().removeAllRanges();
            }
        },
    }
}
</script>
