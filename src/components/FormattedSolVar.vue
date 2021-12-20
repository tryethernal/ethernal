<template>
    <div>
        <span>{{ inputLabel }}
            (<template v-if="formatted"><a id="switchFormatted" @click="formatted = !formatted">Display Raw</a></template>
            <template v-if="!formatted"><a id="switchFormatted" @click="formatted = !formatted">Display Formatted</a></template>)
        </span>
        <template v-if="formatted">
            <span v-if="input.type == 'address'">
                <Hash-Link :type="'address'" :hash="value" :withName="true" />
            </span>
            <span v-else-if="input.type == 'string'">
                <span v-if="isValueJSON">
                    <vue-json-pretty
                        :data="JSONValue"
                        :custom-value-formatter="JSONPrettyCustomFormatter"
                    ></vue-json-pretty>
                </span>
                <span v-else v-html="formatString(value)"></span>
            </span>
            <span v-else>
                {{ formatResponse(value, formatted) }}
            </span>
        </template>
        <template v-else>{{ formatResponse(value, formatted) }}</template>
        &nbsp;
    </div>
</template>
<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import { formatResponse } from '@/lib/utils';
import HashLink from './HashLink';

export default {
    name: 'FormattedSolVar',
    props: ['input', 'value'],
    components: {
        HashLink,
        VueJsonPretty
    },
    data: () => ({
        formatted: true
    }),
    mounted: function() {
        if (this.input.type.startsWith('uint256'))
            this.formatted = false;
    },
    methods: {
        formatResponse: formatResponse,
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
        isValueDataUriJson: function() {
            return this.value.startsWith('data:application/json;base64,');
        },
        inputLabel: function() {
            if (this.input.name)
                return `\t${this.input.type} ${this.input.name}: `;
            else
                return `\t${this.input.type}: `;
        },
        isValueJSON: function() {
            if (this.isValueDataUriJson)
                return true;
            try {
                const parsed = JSON.parse(this.value);
                return JSON.stringify(parsed).startsWith('{') || JSON.stringify(parsed).startsWith('[');
            } catch(_) { return false; }
        },
        JSONValue: function() {
            if (this.isValueDataUriJson)
                return JSON.parse(atob(this.value.substring(29)));
            return JSON.parse(this.value)
        },
    }
}
</script>
