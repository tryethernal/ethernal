<template>
    <div>
        <div v-if="title" class="text-overline">{{ title }}</div>
        <div v-if="isLink">
            <a target="_blank" :href="value">{{ label || value }}</a>
        </div>
        <div v-else-if="isText">
            {{ value }}
        </div>
        <div v-else-if="isBigNumber">
            <template v-if="decimals">
                {{ $fromWei(value, decimals, symbol) }}
            </template>
            <template v-else>
                {{ value }}
            </template>
        </div>
        <div v-else-if="isHash || isAddress">
            <Hash-Link :type="type" :hash="value" :withName="true" :withTokenName="true" />
        </div>
    </div>
</template>
<script>
import HashLink from './HashLink.vue';

export default {
    name: 'CustomField',
    props: ['name', 'value', 'type', 'label', 'decimals', 'symbol', 'title'],
    components: {
        HashLink,
    },
    computed: {
        isText() { return this.type == 'text' },
        isLink() { return this.type == 'link' },
        isBigNumber() { return this.type == 'bigNumber' },
        isHash() { return this.type == 'hash' },
        isAddress() { return this.type == 'address' }
    }
}
</script>
