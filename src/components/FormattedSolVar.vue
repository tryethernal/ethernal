<template>
    <span :class="`ml-${4 * displayDepth}`">
        <span v-if="!isArrayEl">{{ inputLabel }}</span>
        <span>
            <template v-if="isFormattable">
                (<template v-if="formatted"><a id="switchFormatted" @click="formatted = !formatted">Display Raw</a></template>
                <template v-if="!formatted"><a id="switchFormatted" @click="formatted = !formatted">Display Formatted</a></template>)
            </template>
            <span v-if="formatted">
                <span v-if="input.type == 'address'">
                    <Hash-Link :type="'address'" :hash="value" :withName="true" />
                </span>
                <span v-else-if="input.type == 'tuple'">
                    { {{ '\n' }}
                    <span v-for="(el, idx) in value" :key="idx">
                        <Formatted-Sol-Var :input="input.components[idx]" :value="el" :depth="displayDepth + 1" />{{ '\n' }}
                    </span>
                     <span :class="`ml-${4 * displayDepth}`"> }</span>
                </span>
                <span v-else-if="input.type == 'string'">
                    <span v-if="isValueJSON" style="white-space: normal;">
                        <vue-json-pretty
                            :data="JSONValue"
                            :custom-value-formatter="JSONPrettyCustomFormatter"
                        ></vue-json-pretty>
                    </span>
                    <span v-else v-html="formatString(value)"></span>
                </span>
                <span v-else-if="isInputArray">
                    [{{ '\n' }}
                        <span v-for="(el, idx) in value" :key="idx">
                            <Formatted-Sol-Var :input="input.arrayChildren" :value="el" :depth="displayDepth + 1" :isArrayEl="true" />{{ '\n' }}
                        </span>
                    <span :class="`ml-${4 * displayDepth}`">]</span>
                </span>
                <span v-else>
                    {{ value }}
                </span>
            </span>
            <template v-else>{{ value }}</template>
        </span>
    </span>
</template>
<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import HashLink from './HashLink';

export default {
    name: 'FormattedSolVar',
    props: ['input', 'value', 'depth', 'isArrayEl'],
    components: {
        HashLink,
        VueJsonPretty
    },
    data: () => ({
        formatted: true
    }),
    mounted: function() {
        if (this.input.type == 'uint256')
            this.formatted = false;
    },
    methods: {
        JSONPrettyCustomFormatter: function(data, _key, _path, defaultFormatResult) {
            return typeof data === 'string' ? `"${this.formatString(data)}"` : defaultFormatResult;
        },
        formatString: function(data) {
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
        displayDepth: function() {
            return this.depth ? this.depth : 1;
        },
        isInputArray: function() {
            return !!this.input.arrayChildren;
        },
        isFormattable: function() {
            return ['address', 'string'].indexOf(this.input.type) > -1;
        },
        isValueDataUriJson: function() {
            if (this.input.type != 'string') return false;
            return this.value.startsWith('data:application/json;base64,');
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
