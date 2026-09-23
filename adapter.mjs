import { parse as theirParse } from '/tmp/eurp.mjs';
export function parse(uri) {
  try {
    const o = theirParse(uri);
    const p = (o.parameters && typeof o.parameters === 'object') ? o.parameters : {};
    return {
      ok: true, scheme: 'ethereum',
      target: o.target_address ?? null,
      chainId: o.chain_id != null ? Number(o.chain_id) : null,
      functionName: o.function_name ?? null,
      params: p,
      recipient: p.address ?? null,
      amount: o.function_name === 'transfer' ? (p.uint256 ?? null) : (p.value ?? null),
      errors: [], canonical: uri,
    };
  } catch (e) {
    const m = String(e.message || e);
    const code = /Not an Ethereum URI/.test(m) ? 'bad-scheme'
      : /Missing prefix/.test(m) ? 'no-target'
      : /Invalid amount/.test(m) ? 'bad-amount' : 'parse-error';
    return { ok:false, errors:[{code, message:m}] };
  }
}
