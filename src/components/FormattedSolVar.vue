<template>
    <span :class="`ml-${4 * displayDepth} pl-${4 * titanicLevelDepth}`">
        <span v-if="!isArrayEl">{{ inputLabel }}</span>
        <span>
                            <template v-if="isFormattable && !notInteractive && (input.type == 'address' || isValueJSON || formatString(safeValue) != safeValue)">
                (<template v-if="formatted"><a style="cursor: pointer;" id="switchFormatted" @click="formatted = !formatted">Display Raw</a></template>
                <template v-if="!formatted"><a style="cursor: pointer;" id="switchFormatted" @click="formatted = !formatted">Display Formatted</a></template>)
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
                    <span :class="`ml-${4 * displayDepth} pl-${4 * titanicLevelDepth}`">&nbsp;}</span><br>
                </span>
                <span v-else-if="input.type == 'string'">
                    <span v-if="isValueJSON" style="white-space: normal;">
                        <vue-json-pretty :data="JSONValue">
                            <template #nodeValue="{ node }">
                                <Formatted-Sol-Var :input="{type: 'string'}" :value="node.content" :depth="0" />
                            </template>
                        </vue-json-pretty>
                    </span>
                    <span v-else v-html="formatString(safeValue)"></span>
                </span>
                <span v-else-if="input.type == 'tuple[]'">
                    <div class="pl-2">
                        <Formatted-Sol-Var :input="{ components: input.components, type: 'tuple' }" :value="value" :depth="displayDepth + titanicLevelDepth + 1" :isArrayEl="true" />
                    </div>
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
                <span v-else-if="safeValue">
                    {{ safeValue }}
                </span>
                <span v-else>
                    <i>null</i>
                </span>
            </span>
            <span style="white-space: break-spaces;" v-else-if="safeValue">{{ safeValue }}</span>
            <span v-else><i>null</i></span>
        </span>
    </span>
</template>
<script>
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';
import HashLink from './HashLink.vue';
import { ethers } from 'ethers';

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
    },
    methods: {
        JSONPrettyCustomFormatter: function(data, _key, _path, defaultFormatResult) {
            // Handle BigInt values using ethers
            if (typeof data === 'bigint') {
                return `"${ethers.BigNumber.from(data).toString()}"`;
            }
            if (ethers.BigNumber.isBigNumber(data)) {
                return `"${data.toString()}"`;
            }
            return typeof data === 'string' ? `"${this.formatString(data)}"` : defaultFormatResult;
        },
        formatString: function(data) {
            // Handle BigInt values using ethers
            if (typeof data === 'bigint') {
                return ethers.BigNumber.from(data).toString();
            }
            if (ethers.BigNumber.isBigNumber(data)) {
                return data.toString();
            }
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
        },
        processBigIntInJSON: function(jsonString) {
            // Simple BigInt handling for JSON strings using ethers
            try {
                return JSON.stringify(JSON.parse(jsonString, (key, value) => {
                    return typeof value === 'number' && !Number.isSafeInteger(value)
                        ? ethers.BigNumber.from(value).toString() 
                        : value;
                }));
            } catch (error) {
                return jsonString;
            }
        },
        convertBigIntsToStrings: function(obj) {
            // Use ethers to recursively convert BigInt values to strings
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    return obj.map(item => this.convertBigIntsToStrings(item));
                } else {
                    const result = {};
                    for (const key in obj) {
                        if (Object.prototype.hasOwnProperty.call(obj, key)) {
                            result[key] = this.convertBigIntsToStrings(obj[key]);
                        }
                    }
                    return result;
                }
            } else if (typeof obj === 'bigint') {
                return ethers.BigNumber.from(obj).toString();
            } else if (ethers.BigNumber.isBigNumber(obj)) {
                return obj.toString();
            }
            return obj;
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
                // Handle BigInt values in the string before parsing
                const processedValue = this.processBigIntInJSON(this.value);
                const parsed = JSON.parse(processedValue);
                return JSON.stringify(parsed).startsWith('{') || JSON.stringify(parsed).startsWith('[');
            } catch(_) { return false; }
        },
        JSONValue: function() {
            if (this.input.type != 'string') return;
            if (this.isValueDataUriJson)
                return JSON.parse(atob(this.value.substring(29)));
            
            // Handle BigInt values safely by converting them to strings before parsing
            try {
                // If the value is already an object (not a string), handle BigInt conversion
                if (typeof this.value === 'object' && this.value !== null) {
                    return this.convertBigIntsToStrings(this.value);
                }
                
                // If it's a string, try to parse it with BigInt handling
                const processedValue = this.processBigIntInJSON(this.value);
                return JSON.parse(processedValue);
            } catch (error) {
                console.warn('Failed to parse JSON value:', error);
                return this.value; // Return original value if parsing fails
            }
        },
        safeValue: function() {
            // Use ethers to safely convert BigInt values to strings for display
            if (typeof this.value === 'bigint') {
                return ethers.BigNumber.from(this.value).toString();
            }
            if (ethers.BigNumber.isBigNumber(this.value)) {
                return this.value.toString();
            }
            if (typeof this.value === 'object' && this.value !== null) {
                return this.convertBigIntsToStrings(this.value);
            }
            return this.value;
        }
    }
}
</script>
<style scoped>
/deep/ span.notInteractive a {
    text-decoration: none;
}
</style>
