'use strict'

import qs from 'qs';
import { BigNumber } from 'bignumber.js';

/**
 * Parse an Ethereum URI according to ERC-831 and ERC-681
 *
 * @param  {string} uri string.
 *
 * @return {object}
 */
export function parse(uri) {

    if (!uri || typeof uri !== 'string') {
        throw new Error('uri must be a string');
    }

    // RFC 3986 §3.1: URI schemes are case-insensitive. `Ethereum:` and
    // `ETHEREUM:` are the same scheme as `ethereum:`. The previous strict
    // comparison rejected them as "Not an Ethereum URI".
    if (uri.substring(0, 9).toLowerCase() !== 'ethereum:') {
        throw new Error('Not an Ethereum URI');
    }

    let prefix;
    let address_regex = '(0x[\\w]{40})';


    if (uri.substring(9, 11).toLowerCase() === '0x') {
        prefix = null;
    } else {
        let cutOff = uri.indexOf('-', 9);

        if (cutOff === -1) {
            throw new Error('Missing prefix');
        }
        prefix = uri.substring(9, cutOff);
        const rest = uri.substring(cutOff + 1);

        // Adapting the regex if ENS name detected
        if(rest.substring(0,2).toLowerCase() !== '0x'){
            address_regex = '([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,})';
        }
    }

    const full_regex = '^ethereum:(' + prefix + '-)?'+address_regex + '\\@?([\\w]*)*\\/?([\\w]*)*';

    const exp = new RegExp(full_regex, 'i');
    const data = uri.match(exp);
    if(!data) {
        throw new Error('Couldn not parse the url');
    }

    let parameters = uri.split('?');
    parameters = parameters.length > 1 ? parameters[1] : '';
    const params = qs.parse(parameters);

    const obj = {
        scheme: 'ethereum',
        target_address: data[2],
    };

    if(prefix){
        obj.prefix = prefix;
    }

    if(data[3]){
        obj.chain_id = data[3];
    }

    if(data[4]){
        obj.function_name = data[4];
    }

    if(Object.keys(params).length){
        obj.parameters = params;
        const amountKey = obj.function_name === 'transfer' ? 'uint256' : 'value';

        if(typeof obj.parameters[amountKey] !== 'undefined' && obj.parameters[amountKey] !== '' && obj.parameters[amountKey] !== null) {
            const raw = String(obj.parameters[amountKey]).trim();

            // EIP-681 explicitly permits scientific notation for the amount
            // (`1e16`). This library's own build() emits exactly that form, so
            // constructing the BigNumber with an explicit base 10 made
            // parse(build(x)) throw "Not a base 10 number: 1e16" for every
            // amount >= 1e16 wei (0.01 ETH) and every uint256 written that way.
            // Validate the decimal/scientific grammar ourselves, then let
            // BigNumber auto-detect the base.
            if(!/^[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?$/.test(raw)) {
                throw new Error('Invalid amount');
            }

            const amount = new BigNumber(raw);
            if(!amount.isFinite()) throw new Error('Invalid amount');
            if(amount.isNegative()) throw new Error('Invalid amount');

            obj.parameters[amountKey] = amount.toString();
        }
    }

    return obj;
}

/**
 * Builds a valid Ethereum URI based on the initial parameters
 *
 * @param  {object} data
 *
 * @return {string}
 */
export function build({ prefix = null, target_address, chain_id = null, function_name = null, parameters = null }) {

    let query = null;
    if(parameters) {
        const amountKey = function_name === 'transfer' ? 'uint256' : 'value';
        if(parameters[amountKey]){
            // This is weird. Scientific notation in JS is usually 2.014e+18
            // but the EIP 681 shows no "+" sign ¯\_(ツ)_/¯
            // source: https://github.com/ethereum/EIPs/blob/master/EIPS/eip-681.md#semantics
            //
            // Same base-10 trap as in parse(): BigNumber must be given no base
            // so that an input already in scientific notation (`1e16`) is
            // accepted rather than thrown on.
            const amount = new BigNumber(String(parameters[amountKey]).trim());
            if (!amount.isFinite()) throw new Error('Invalid amount');
            if (amount.isNegative()) throw new Error('Invalid amount');
            parameters[amountKey] = amount.toExponential().replace('+','').replace('e0','');
        }
        query = qs.stringify(parameters);
    }

    const url = `ethereum:${prefix?prefix+'-':''}${target_address}${chain_id ? `@${chain_id}` : ''}${function_name ? `/${function_name}`:''}${query ? '?' + query : ''}`;
    return url;
}
