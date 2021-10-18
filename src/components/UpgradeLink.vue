<template>
    <a @click.stop="goToBilling()"><slot>Upgrade</slot></a>
</template>
<script>
export default {
    name: 'UpgradeLink',
    props: ['emit'],
    methods: {
        goToBilling: function() {
            if (this.emit)
                this.$emit('goToBilling');
            else
                this.$router.push({ path: '/settings', query: { tab: 'billing' }});
        }
    }
}
</script>
<style scoped>
a {
    text-decoration: underline;
}
</style>
