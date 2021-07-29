<template>
    <router-link v-if="hash" :to="link()">{{ content() }}</router-link>
</template>
<script>
export default {
    name: 'HashLink',
    props: ['type', 'hash', 'fullHash'],
    methods: {
        link: function() { return `/${[this.type, this.hash].join('/')}`; },
        content: function() {
            if (this.fullHash) {
                return this.hash;
            }
            else {
                return `${this.hash.slice(0, 15)}...`;
            }
        }
    }
}
</script>
