import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { amount, units } from './money.mjs';

const fixture = JSON.parse(readFileSync(new URL('../fixtures/snapshots.json', import.meta.url), 'utf8'));
const states = new Set(['seen', 'accepted', 'receipted', 'sweeping', 'swept', 'failed']);
const text = (value) => typeof value === 'string' && value.length > 0 && value.length <= 2048;
const optionalText = (value) => value === null || text(value);

export function sampleSnapshot(stage = 0) {
  const snapshot = structuredClone(fixture);
  if (stage >= 2) snapshot.deposits = snapshot.deposits.map((d) => ({
    ...d, state: 'swept', updatedAt: '2026-10-20T09:02:00.000Z',
    acceptUpdateId: `${d.id}-accept`, sweepUpdateId: `${d.id}-sweep`, receiptCid: `${d.id}-receipt`,
  }));
  if (stage === 0) snapshot.deposits = [];
  snapshot.deposits = snapshot.deposits.map((d) => ({ ...d, instrumentId: 'Amulet', instrumentAdmin: 'sample-amulet-admin' }));
  return snapshot;
}

export function validateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.customers) || !Array.isArray(snapshot.deposits)) {
    throw new Error('Naust must return customer and deposit arrays.');
  }
  if (snapshot.customers.length > 1000 || snapshot.deposits.length > 10000) throw new Error('Snapshot exceeds the example limit.');
  const customers = new Map();
  const refs = new Set();
  for (const c of snapshot.customers) {
    if (!c || !text(c.id) || !text(c.ref) || !text(c.address) || !text(c.accountCid)) throw new Error('Invalid or unready customer.');
    if (customers.has(c.id) || refs.has(c.ref)) throw new Error('Duplicate customer identity.');
    refs.add(c.ref);
    customers.set(c.id, c);
  }
  const deposits = new Map();
  for (const d of snapshot.deposits) {
    if (!d || !['id', 'customerId', 'customerRef', 'instrument', 'sender', 'seenAt', 'updatedAt'].every((k) => text(d[k])) || !states.has(d.state)) throw new Error('Invalid deposit identity or state.');
    if (![d.receiptCid, d.acceptUpdateId, d.sweepUpdateId].every(optionalText)) throw new Error('Invalid deposit proof fields.');
    if (d.instrumentId !== undefined && !text(d.instrumentId)) throw new Error('Invalid instrument ID.');
    if (d.instrumentAdmin !== undefined && !optionalText(d.instrumentAdmin)) throw new Error('Invalid instrument administrator.');
    if (!Number.isFinite(Date.parse(d.seenAt)) || !Number.isFinite(Date.parse(d.updatedAt))) throw new Error('Invalid deposit timestamp.');
    const normalized = { ...d, amount: amount(d.amount) };
    if (units(d.amount) === 0n) throw new Error('Deposit amount must be positive.');
    if (deposits.has(d.id)) throw new Error('Duplicate deposit ID in snapshot.');
    deposits.set(d.id, normalized);
  }
  return { customers: [...customers.values()], deposits: [...deposits.values()] };
}

export function configuration(env = process.env) {
  const mode = env.FUNDING_MODE ?? 'sample';
  if (!['sample', 'live'].includes(mode)) throw new Error('FUNDING_MODE must be sample or live.');
  if (mode === 'sample') return {
    mode, namespace: 'sample-v1', origin: null, creditEnabled: true,
    instrumentId: 'Amulet', instrumentAdmin: 'sample-amulet-admin',
    mappings: fixture.customers.map((c) => ({ accountId: `account-${c.ref.toLowerCase()}`, customerId: c.id, customerRef: c.ref })),
  };
  if (!env.NAUST_ORIGIN) throw new Error('Set NAUST_ORIGIN explicitly for live observation mode.');
  const url = new URL(env.NAUST_ORIGIN);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use HTTPS, or HTTP on loopback only.');
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('NAUST_ORIGIN must be an origin without credentials or a path.');
  const mappings = JSON.parse(env.FUNDING_MAPPINGS ?? '[]');
  if (!Array.isArray(mappings) || mappings.length > 1000 || mappings.some((m) => !m || !['accountId', 'customerId', 'customerRef'].every((k) => text(m[k])))) throw new Error('FUNDING_MAPPINGS must be an array of accountId, customerId and customerRef strings.');
  for (const key of ['accountId', 'customerId', 'customerRef']) {
    if (new Set(mappings.map((m) => m[key])).size !== mappings.length) throw new Error(`Duplicate mapping ${key}.`);
  }
  const instrumentId = env.FUNDING_INSTRUMENT_ID ?? null;
  const instrumentAdmin = env.FUNDING_INSTRUMENT_ADMIN ?? null;
  const creditEnabled = env.FUNDING_ENABLE_CREDITS === 'true';
  if (env.FUNDING_ENABLE_CREDITS && !['true', 'false'].includes(env.FUNDING_ENABLE_CREDITS)) throw new Error('FUNDING_ENABLE_CREDITS must be true or false.');
  if (creditEnabled && (!text(instrumentId) || !text(instrumentAdmin) || !mappings.length)) throw new Error('Local live credits require an expected instrument ID, administrator and explicit account mappings.');
  const identity = JSON.stringify({ origin: url.origin, creditEnabled, instrumentId, instrumentAdmin, mappings });
  return { mode, namespace: `live-${createHash('sha256').update(identity).digest('hex')}`, origin: url.origin, creditEnabled, instrumentId, instrumentAdmin, mappings };
}

async function readJson(response) {
  if (!response.ok) throw new Error(`Naust returned HTTP ${response.status}. Retry the sync after checking the endpoint.`);
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Naust did not return JSON.');
  const limit = 2 * 1024 * 1024;
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Naust response exceeds 2 MiB.');
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Naust returned an empty body.');
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) throw new Error('Naust response exceeds 2 MiB.');
      chunks.push(Buffer.from(value));
    }
  } finally { await reader.cancel(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function liveSnapshot(config, fetcher = fetch) {
  if (config.mode !== 'live' || !config.origin) throw new Error('Live source must be explicitly configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const get = async (path) => readJson(await fetcher(new URL(path, config.origin), {
      method: 'GET', headers: { accept: 'application/json' }, redirect: 'error', credentials: 'omit', signal: controller.signal,
    }));
    const [customers, deposits] = await Promise.all([get('/api/demo/customers'), get('/api/demo/deposits')]);
    return validateSnapshot({ customers, deposits });
  } catch (error) {
    controller.abort();
    throw new Error(`Live sync failed. ${error.name === 'AbortError' ? 'Request timed out.' : error.message}`);
  } finally { clearTimeout(timeout); }
}
