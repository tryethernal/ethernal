/**
 * @fileoverview Shared EVM utility functions for developer tool pages.
 * All ethers.js imports are dynamic to avoid SSR issues with vite-ssg.
 */

let _AbiCoder = null;
let _keccak256 = null;

async function getAbiCoder() {
    if (!_AbiCoder) {
        const { AbiCoder } = await import('ethers/abi');
        _AbiCoder = AbiCoder;
    }
    return _AbiCoder;
}

async function getKeccak256() {
    if (!_keccak256) {
        const { keccak256, toUtf8Bytes } = await import('ethers');
        _keccak256 = (text) => keccak256(toUtf8Bytes(text));
    }
    return _keccak256;
}

/**
 * Parse a Solidity function signature string into name and param types.
 * @param {string} signature - e.g. "transfer(address,uint256)"
 * @returns {{ name: string, types: string[] }} parsed result
 * @throws {Error} if signature format is invalid
 */
export function parseSignature(signature) {
    const trimmed = signature.trim();
    const parenIdx = trimmed.indexOf('(');
    if (parenIdx < 1 || !trimmed.endsWith(')'))
        throw new Error('Could not parse signature. Use format: functionName(type1,type2)');
    const name = trimmed.slice(0, parenIdx);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name))
        throw new Error('Could not parse signature. Use format: functionName(type1,type2)');
    const inner = trimmed.slice(parenIdx + 1, trimmed.length - 1);
    if (!inner) return { name, types: [] };
    const types = [];
    let depth = 0;
    let current = '';
    for (const ch of inner) {
        if (ch === '(') depth++;
        else if (ch === ')') depth--;
        if (ch === ',' && depth === 0) {
            types.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) types.push(current.trim());
    return { name, types };
}

/**
 * Compute the 4-byte function selector from a signature string.
 * @param {string} signature - e.g. "transfer(address,uint256)"
 * @returns {Promise<string>} 4-byte selector hex string (e.g. "0xa9059cbb")
 */
export async function computeSelector(signature) {
    const keccak = await getKeccak256();
    const { name, types } = parseSignature(signature);
    const canonical = `${name}(${types.join(',')})`;
    const hash = keccak(canonical);
    return hash.slice(0, 10);
}

function serializeDecodedValue(val) {
    if (typeof val === 'bigint') return val.toString();
    if (Array.isArray(val)) return `[${val.map(serializeDecodedValue).join(', ')}]`;
    if (val && typeof val === 'object') return `(${Object.values(val).map(serializeDecodedValue).join(', ')})`;
    return String(val);
}

/**
 * Decode calldata hex string using an ABI fragment.
 * @param {string} hexData - calldata hex (with or without 0x prefix)
 * @param {{ name: string, types: string[] }} fragment - parsed function signature
 * @returns {Promise<{ name: string, params: Array<{ index: number, type: string, value: string }> }>}
 */
export async function decodeCalldata(hexData, fragment) {
    const AbiCoder = await getAbiCoder();
    const coder = AbiCoder.defaultAbiCoder();
    const data = hexData.startsWith('0x') ? hexData : `0x${hexData}`;
    const paramData = `0x${data.slice(10)}`;
    const decoded = coder.decode(fragment.types, paramData);
    return {
        name: fragment.name,
        params: fragment.types.map((type, i) => ({
            index: i,
            type,
            value: serializeDecodedValue(decoded[i])
        }))
    };
}

/**
 * Decode calldata using a full ABI JSON array.
 * @param {string} hexData - calldata hex
 * @param {Array} abi - full ABI JSON array
 * @returns {Promise<{ name: string, params: Array<{ index: number, name: string, type: string, value: string }> }>}
 */
export async function decodeCalldataWithAbi(hexData, abi) {
    const AbiCoder = await getAbiCoder();
    const coder = AbiCoder.defaultAbiCoder();
    const data = hexData.startsWith('0x') ? hexData : `0x${hexData}`;
    const selector = data.slice(0, 10);
    const keccak = await getKeccak256();

    const func = abi.find(item => {
        if (item.type !== 'function') return false;
        const sig = `${item.name}(${item.inputs.map(i => i.type).join(',')})`;
        const hash = keccak(sig);
        return hash.slice(0, 10) === selector;
    });

    if (!func) throw new Error('No matching function found in ABI for this selector');

    const types = func.inputs.map(i => i.type);
    const paramData = `0x${data.slice(10)}`;
    const decoded = coder.decode(types, paramData);

    return {
        name: func.name,
        params: func.inputs.map((input, i) => ({
            index: i,
            name: input.name || `param${i}`,
            type: input.type,
            value: serializeDecodedValue(decoded[i])
        }))
    };
}

/**
 * Encode a function call into calldata.
 * @param {string} signature - e.g. "transfer(address,uint256)"
 * @param {string[]} values - parameter values as strings
 * @returns {Promise<string>} encoded calldata hex string
 */
export async function encodeCalldata(signature, values) {
    const AbiCoder = await getAbiCoder();
    const coder = AbiCoder.defaultAbiCoder();
    const { types } = parseSignature(signature);
    const selector = await computeSelector(signature);
    const encoded = coder.encode(types, values);
    return selector + encoded.slice(2);
}

/**
 * Look up function signatures by 4-byte selector from 4byte.directory.
 * @param {string} selector - hex selector (e.g. "0xa9059cbb")
 * @returns {Promise<Array<{ id: number, text_signature: string }>>}
 */
export async function lookup4byte(selector) {
    const hex = selector.startsWith('0x') ? selector : `0x${selector}`;
    const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${hex}&format=json`);
    if (!res.ok) throw new Error('Could not reach signature database');
    const data = await res.json();
    return data.results || [];
}

/**
 * Ethereum unit denominations with their decimal places.
 * @type {Array<{ name: string, decimals: number }>}
 */
export const ETH_UNITS = [
    { name: 'Wei', decimals: 0 },
    { name: 'Kwei', decimals: 3 },
    { name: 'Mwei', decimals: 6 },
    { name: 'Gwei', decimals: 9 },
    { name: 'Szabo', decimals: 12 },
    { name: 'Finney', decimals: 15 },
    { name: 'Ether', decimals: 18 }
];

/**
 * Convert a value from one Ethereum unit to all other units.
 * @param {string} value - the numeric string to convert
 * @param {number} fromDecimals - the decimal places of the source unit
 * @returns {Promise<Array<{ name: string, decimals: number, value: string }>>}
 */
export async function convertEthUnits(value, fromDecimals) {
    const { parseUnits, formatUnits } = await import('ethers');
    const weiValue = parseUnits(value, fromDecimals);
    return ETH_UNITS.map(unit => ({
        ...unit,
        value: formatUnits(weiValue, unit.decimals)
    }));
}

/**
 * Search function signatures by name from 4byte.directory.
 * @param {string} query - text query (e.g. "transfer")
 * @returns {Promise<Array<{ id: number, text_signature: string, hex_signature: string }>>}
 */
export async function search4byte(query) {
    const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?text_signature__icontains=${encodeURIComponent(query)}&format=json`);
    if (!res.ok) throw new Error('Could not reach signature database');
    const data = await res.json();
    const results = data.results || [];
    const q = query.toLowerCase();
    return results.filter(r => {
        const name = r.text_signature.split('(')[0].toLowerCase();
        return name.includes(q);
    });
}
