<template>
    <div v-if="isLink">
        <a target="_blank" :href="value">{{ label || value }}</a>
    </div>
    <div v-else-if="isText">
        {{ value }}
    </div>
    <div v-else-if="isBigNumber">
        <template v-if="decimals">
            {{ value | fromWei(decimals, symbol) }}
        </template>
        <template v-else>
            {{ value }}
        </template>
    </div>
    <div v-else-if="isHash || isAddress">
        <Hash-Link :type="type" :hash="value" :withName="true" :withTokenName="true" />
    </div>
</template>
<script>
import HashLink from './HashLink';
import FromWei from '../filters/FromWei';

export default {
    name: 'CustomField',
    props: ['name', 'value', 'type', 'label', 'decimals', 'symbol'],
    components: {
        HashLink,
    },
    filters: {
        FromWei
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
