<template>
    <span :class="`ml-${4 * displayDepth} pl-${4 * titanicLevelDepth}`">
        <span v-if="!isArrayEl">{{ inputLabel }}</span>
        <span>
            <template v-if="isFormattable && !notInteractive && (input.type == 'address' || isValueJSON || formatString(value) != value)">
                (<template v-if="formatted"><a id="switchFormatted" @click="formatted = !formatted">Display Raw</a></template>
                <template v-if="!formatted"><a id="switchFormatted" @click="formatted = !formatted">Display Formatted</a></template>)
            </template>
            <span v-if="formatted" :class="{ notInteractive: notInteractive }">
                <span v-if="input.type == 'address'">
                    <Hash-Link :type="'address'" :hash="value" :withName="true" :notCopiable="notInteractive" />
                </span>
                <span v-else-if="input.type == 'tuple'">
                    {
                    <div class="pl-2">
                        <span v-for="(component, idx) in input.components" :key="idx">
                            <Formatted-Sol-Var :input="component" :value="value[component.name]" :depth="displayDepth + titanicLevelDepth + 1" />{{ '\n' }}
                        </span>
                    </div>
                    <span :class="`ml-${4 * displayDepth} pl-${4 * titanicLevelDepth}`">&nbsp;}</span>
                </span>
                <span v-else-if="input.type == 'string'">
                    <span v-if="isValueJSON" style="white-space: normal;">
                        <vue-json-pretty :data="JSONValue">
                            <template #nodeValue="{ node }">
                                <Formatted-Sol-Var :input="{type: 'string'}" :value="node.content" :depth="0" />
                            </template>
                        </vue-json-pretty>
                    </span>
                    <span v-else v-html="formatString(value)"></span>
                </span>
                <span v-else-if="isInputArray">
                    [
                    <div class="pl-2">
                        <span v-for="(el, idx) in value" :key="idx">
                            <Formatted-Sol-Var v-if="input.arrayChildren" :input="input.arrayChildren" :value="el" :depth="displayDepth + titanicLevelDepth + 1" :isArrayEl="true" />
                            <Formatted-Sol-Var v-else :input="input.type" :value="el" :depth="displayDepth + titanicLevelDepth + 1" :isArrayEl="true" />
                            {{ '\n' }}
                        </span>
                    </div>
                    <span :class="`ml-${4 * displayDepth} pl-${4 * titanicLevelDepth}`">&nbsp;]</span>
                </span>
                <span v-else>
                    {{ value }}
                </span>
            </span>
            <span style="white-space: break-spaces;" v-else>{{ value }}</span>
        </span>
    </span>
</template>
<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import HashLink from './HashLink.vue';

export default {
    name: 'FormattedSolVar',
    props: {
        input: {
            required: false,
            default: {}
        },
        value: {
            required: false
        },
        depth: {
            required: false
        },
        isArrayEl: {
            required: false
        },
        notInteractive: {
            required: false
        }
    },
    components: {
        HashLink,
        VueJsonPretty
    },
    data: () => ({
        formatted: true
    }),
    mounted() {
        if (this.input.type == 'uint256')
            this.formatted = false;
        console.log(this.input);
    },
    methods: {
        JSONPrettyCustomFormatter: function(data, _key, _path, defaultFormatResult) {
            return typeof data === 'string' ? `"${this.formatString(data)}"` : defaultFormatResult;
        },
        formatString: function(data) {
            if (typeof data != 'string')
                return data
            const urlPattern = new RegExp('^https?|ipfs://', 'i');
            if (urlPattern.test(data)) {
                return `<a href="${data}" target="_blank">${data}</a>`;
            }
            else if (data.startsWith('<svg')) {
                return `${data.replace('<svg', '<svg width="200px" height="200px"')}`;
            }
            else if (data.startsWith('data:image')) {
                return `<img src="${data}" />`;
            }
            else {
                return data;
            }
        }
    },
    computed: {
        titanicLevelDepth() {
            return this.depth !== undefined && this.depth !== null ? Math.abs(Math.min(0, 4 - this.depth)) : 0;
        },
        displayDepth: function() {
            return this.depth !== undefined && this.depth !== null ? Math.min(this.depth, 4) : 1;
        },
        isInputArray: function() {
            return !!this.input.arrayChildren || (this.input.type && this.input.type.endsWith('[]'));
        },
        isFormattable: function() {
            return ['address', 'string'].indexOf(this.input.type) > -1;
        },
        isValueDataUriJson: function() {
            if (this.input.type != 'string') return false;
            return typeof this.value == 'string' && this.value.startsWith('data:application/json;base64,');
        },
        inputLabel: function() {
            if (this.input.name)
                return `${this.input.type} ${this.input.name}: `;
            else
                return `${this.input.type}: `;
        },
        isValueJSON: function() {
            if (this.input.type != 'string') return false;
            if (this.isValueDataUriJson)
                return true;
            try {
                const parsed = JSON.parse(this.value);
                return JSON.stringify(parsed).startsWith('{') || JSON.stringify(parsed).startsWith('[');
            } catch(_) { return false; }
        },
        JSONValue: function() {
            if (this.input.type != 'string') return;
            if (this.isValueDataUriJson)
                return JSON.parse(atob(this.value.substring(29)));
            return JSON.parse(this.value)
        },
    }
}
</script>
<style scoped>
/deep/ span.notInteractive a {
    text-decoration: none;
    color: white !important;
}
</style>
