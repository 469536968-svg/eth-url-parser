const test = require('tape');
const { parse, build } = require('../dist');

test('parse', (t) => {
    t.deepEqual(parse('ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'), {
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
    }, 'Can parse URI with payload starting with `0x`');

    t.deepEqual(parse('ethereum:pay-0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'), {
        scheme: 'ethereum',
        prefix: 'pay',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
    }, 'Can parse URI with payload starting with `0x` and `pay` prefix');

    t.deepEqual(parse('ethereum:foo-0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'), {
        scheme: 'ethereum',
        prefix: 'foo',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
    }, 'Can parse URI with payload starting with `0x` and `foo` prefix');

    t.deepEqual(parse('ethereum:foo-doge-to-the-moon.eth'), {
        scheme: 'ethereum',
        prefix: 'foo',
        target_address: 'doge-to-the-moon.eth',
    }, 'Can parse URI with an ENS name');

    t.deepEqual(parse('ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@42'), {
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        chain_id: '42'
    }, 'Can parse URI with chain id');

    t.deepEqual(parse('ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD/transfer?address=0x12345&uint256=1'), {
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        function_name: 'transfer',
        parameters: {
            'address': '0x12345',
            'uint256': '1'
        }
    }, 'Can parse an ERC20 token transfer');

    t.deepEqual(parse('ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?value=2.014e18&gas=10&gasLimit=21000&gasPrice=50'), {
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        parameters: {
            'value': '2014000000000000000',
            'gas': '10',
            'gasLimit': '21000',
            'gasPrice': '50',
        }
    }, 'Can parse a url with value and gas parameters');

    t.end();
});

test('build', (t) => {
    t.equals(build({
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
    }), 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
    'Can build a URL with payload starting with `0x`');

    t.equals(build({
        scheme: 'ethereum',
        prefix: 'pay',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
    }), 'ethereum:pay-0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
    'Can build a URL with payload starting with `0x` and `pay` prefix');

    t.equals(build({
        scheme: 'ethereum',
        prefix: 'foo',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD'
    }), 'ethereum:foo-0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
    'Can build a URL with payload starting with `0x` and `foo` prefix');

    t.equals(build({
        scheme: 'ethereum',
        prefix: 'foo',
        target_address: 'doge-to-the-moon.eth',
    }), 'ethereum:foo-doge-to-the-moon.eth',
    'Can build a URL with an ENS name');

    t.equals(build({
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        chain_id: '42'
    }), 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD@42',
    'Can build a URL with chain id');

    t.equals(build({
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        function_name: 'transfer',
        parameters: {
            'address': '0x12345',
            'uint256': '1'
        }
    }), 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD/transfer?address=0x12345&uint256=1',
    'Can build a URL for an ERC20 token transfer');

    t.equals(build({
        scheme: 'ethereum',
        target_address: '0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD',
        parameters: {
            'value': '2014000000000000000',
            'gas': '10',
            'gasLimit': '21000',
            'gasPrice': '50',
        }
    }), 'ethereum:0x1234DEADBEEF5678ABCD1234DEADBEEF5678ABCD?value=2.014e18&gas=10&gasLimit=21000&gasPrice=50',
    'Can build a url with value and gas parameters');

    t.end();
});

// --- regression tests: parse/build round-trip and RFC3986 scheme casing ---
// These cover bugs where build() produced URIs that its own parse() rejected.

test('build/parse round-trip preserves amounts in scientific notation', (t) => {
    const address = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';

    const native = build({ target_address: address, chain_id: '8453', parameters: { value: '10000000000000000' } });
    t.equal(native, 'ethereum:' + address + '@8453?value=1e16', 'build emits EIP-681 scientific notation');
    t.doesNotThrow(() => parse(native), 'parse accepts its own output (previously threw "Not a base 10 number: 1e16")');

    const erc20 = build({
        target_address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        chain_id: '8453',
        function_name: 'transfer',
        parameters: { address: '0x54235780057CC828C92aA40e3b02053881990153', uint256: '1000000' }
    });
    t.equal(erc20, 'ethereum:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913@8453/transfer?address=0x54235780057CC828C92aA40e3b02053881990153&uint256=1e6', 'build emits uint256 in scientific notation');
    t.doesNotThrow(() => parse(erc20), 'parse accepts erc20 URI produced by build (previously threw)');

    t.end();
});

test('scheme comparison is case-insensitive (RFC 3986 section 3.1)', (t) => {
    const address = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
    t.doesNotThrow(() => parse('Ethereum:' + address), 'accepts capitalised scheme');
    t.doesNotThrow(() => parse('ETHEREUM:' + address), 'accepts uppercase scheme');
    t.equal(parse('ETHEREUM:' + address).target_address, address, 'target_address is unchanged');
    t.end();
});

test('amount validation still rejects malformed values', (t) => {
    const address = '0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359';
    t.throws(() => parse('ethereum:' + address + '@8453?value=-5'), 'rejects negative amount');
    t.throws(() => parse('ethereum:' + address + '@8453?value=0x1f'), 'rejects hex amount');
    t.throws(() => parse('ethereum:' + address + '@8453?value=abc'), 'rejects non-numeric amount');
    t.end();
});
