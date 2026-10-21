import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FundingStore } from '../src/store.mjs';
import { configuration, sampleSnapshot, validateSnapshot, liveSnapshot } from '../src/source.mjs';
import { units, decimal } from '../src/money.mjs';
import { application } from '../src/server.mjs';
import { render } from '../src/view.mjs';

const config = () => configuration({});
const memory = () => new FundingStore(':memory:', config());
const total = (store) => store.view().accounts[0].balance;

test('money is exact and rejects ambiguous or unbounded inputs', () => {
  assert.equal(decimal(units('0.1') + units('0.2')), '0.3000000000');
  assert.equal(decimal(units('1')), decimal(units('1.0000000000')));
  for (const input of [0.1, '-1', '1e2', 'NaN', '1.00000000001', '', '1'.repeat(29)]) assert.throws(() => units(input));
});

test('only completed sweeps credit, replay and restart preserve exactly one credit per deposit', () => {
  const folder = mkdtempSync(join(tmpdir(), 'naust-reference-'));
  const path = join(folder, 'funding.sqlite');
  let store = new FundingStore(path, config());
  try {
    assert.equal(store.reconcile(sampleSnapshot(1)).added, 0);
    assert.equal(total(store), '0.0000000000');
    assert.equal(store.reconcile(sampleSnapshot(2)).added, 2);
    assert.equal(total(store), '0.3000000000');
    assert.equal(store.reconcile(sampleSnapshot(2)).added, 0);
    store.close(); store = new FundingStore(path, config());
    assert.equal(store.reconcile(sampleSnapshot(2)).added, 0);
    assert.equal(total(store), '0.3000000000');
    assert.equal(store.view().credits.length, 2);
    assert.equal(store.view().accounts[1].balance, '0.0000000000');
    store.reconcile(sampleSnapshot(1));
    assert.equal(total(store), '0.3000000000');
    store.reconcile({ customers: sampleSnapshot().customers, deposits: [] });
    assert.equal(total(store), '0.3000000000');
  } finally { store.close(); rmSync(folder, { recursive: true }); }
});

test('foreign customer, token, missing proof, identity mutation and failed deposits do not credit', () => {
  for (const mutate of [
    (d) => { d.customerId = 'foreign'; }, (d) => { d.customerRef = 'foreign'; },
    (d) => { d.instrumentAdmin = 'another-admin'; }, (d) => { delete d.instrumentAdmin; },
    (d) => { d.instrument = 'another-token'; }, (d) => { d.sweepUpdateId = null; },
    (d) => { d.state = 'failed'; },
  ]) {
    const store = memory();
    try {
      const snapshot = sampleSnapshot(2); snapshot.deposits = [snapshot.deposits[0]]; mutate(snapshot.deposits[0]);
      store.reconcile(snapshot); assert.equal(total(store), '0.0000000000');
    } finally { store.close(); }
  }
});

test('posted economic and proof corrections are quarantined without altering original credit', () => {
  const store = memory();
  try {
    store.reconcile(sampleSnapshot(2));
    for (const mutate of [(d) => { d.amount = '999'; }, (d) => { d.customerId = 'sample-cus-ben'; d.customerRef = 'Ben'; }, (d) => { d.sweepUpdateId = 'changed'; }]) {
      const correction = sampleSnapshot(2); mutate(correction.deposits[0]);
      assert.equal(store.reconcile(correction).rejected, 1);
      assert.equal(total(store), '0.3000000000'); assert.equal(store.view().credits.length, 2);
    }
    const equivalent = sampleSnapshot(2); equivalent.deposits[0].amount = '0.1000000000';
    assert.equal(store.reconcile(equivalent).rejected, 0);
  } finally { store.close(); }
});

test('provisional corrections are audited; identity changes stay quarantined', () => {
  const store = memory();
  try {
    store.reconcile(sampleSnapshot(1));
    const snapshot = sampleSnapshot(1); snapshot.deposits[0].amount = '0.15'; store.reconcile(snapshot);
    assert.ok(store.view().events.some((event) => event.detail.includes('Provisional amount changed')));
    snapshot.deposits[0].customerId = 'sample-cus-ben'; snapshot.deposits[0].customerRef = 'Ben';
    assert.equal(store.reconcile(snapshot).rejected, 1);
    assert.equal(store.reconcile(sampleSnapshot(2)).added, 1);
    assert.equal(total(store), '0.2000000000');
  } finally { store.close(); }
});

test('reconciliation rolls back both credits and observations on storage failure', () => {
  const store = memory();
  try {
    store.db.exec("CREATE TRIGGER stop_second BEFORE INSERT ON credits WHEN NEW.deposit_id='sample-deposit-002' BEGIN SELECT RAISE(ABORT,'test fault'); END;");
    assert.throws(() => store.reconcile(sampleSnapshot(2)), /test fault/);
    assert.equal(store.view().credits.length, 0); assert.equal(store.view().observations.length, 0);
    store.db.exec('DROP TRIGGER stop_second');
    assert.equal(store.reconcile(sampleSnapshot(2)).added, 2);
  } finally { store.close(); }
});

test('bad response validation rejects a complete snapshot before any credit', () => {
  for (const mutate of [(s) => { s.deposits.push(s.deposits[0]); }, (s) => { s.deposits[1].amount = 0.2; }, (s) => { s.customers[1].id = s.customers[0].id; }, (s) => { s.deposits[1].state = 'magic'; }]) {
    const store = memory();
    try { const s = sampleSnapshot(2); mutate(s); assert.throws(() => store.reconcile(s)); assert.equal(store.view().credits.length, 0); } finally { store.close(); }
  }
  assert.throws(() => validateSnapshot({ error: 'upstream' }));
});

test('source configuration requires opt-in, separates databases and binds full token identity and mappings', () => {
  const live = configuration({ FUNDING_MODE: 'live', NAUST_ORIGIN: 'https://example.test' });
  assert.equal(live.creditEnabled, false);
  assert.throws(() => configuration({ FUNDING_MODE: 'live', NAUST_ORIGIN: 'https://example.test', FUNDING_ENABLE_CREDITS: 'true' }));
  const enabled = configuration({ FUNDING_MODE: 'live', NAUST_ORIGIN: 'https://example.test', FUNDING_ENABLE_CREDITS: 'true', FUNDING_INSTRUMENT_ID: 'Amulet', FUNDING_INSTRUMENT_ADMIN: 'sample-amulet-admin', FUNDING_MAPPINGS: JSON.stringify(config().mappings) });
  assert.notEqual(live.namespace, enabled.namespace);
  const folder = mkdtempSync(join(tmpdir(), 'naust-bound-'));
  try {
    const path = join(folder, 'bound.sqlite'); const first = new FundingStore(path, config()); first.close();
    assert.throws(() => new FundingStore(path, live), /another source/);
  } finally { rmSync(folder, { recursive: true }); }
  const store = new FundingStore(':memory:', { ...config(), creditEnabled: false });
  try { store.reconcile(sampleSnapshot(2)); assert.equal(store.view().credits.length, 0); assert.equal(store.view().observations[0].status, 'observed'); } finally { store.close(); }
});

test('HTTP adapter uses exact public paths, no credentials or redirects, and never falls back', async () => {
  const live = configuration({ FUNDING_MODE: 'live', NAUST_ORIGIN: 'https://example.test' });
  const calls = [];
  const result = await liveSnapshot(live, async (url, options) => {
    calls.push(url.pathname); assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.equal(options.method, 'GET');
    return Response.json(url.pathname.endsWith('customers') ? sampleSnapshot(2).customers : sampleSnapshot(2).deposits);
  });
  assert.deepEqual(calls.sort(), ['/api/demo/customers', '/api/demo/deposits']); assert.equal(result.deposits.length, 2);
  for (const fetcher of [
    async () => new Response('down', { status: 503 }),
    async () => new Response('not-json', { headers: { 'content-type': 'application/json' } }),
    async () => new Response('html', { headers: { 'content-type': 'text/html' } }),
    async () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '3000000' } }),
    async () => { throw new Error('offline'); },
  ]) await assert.rejects(liveSnapshot(live, fetcher), /Live sync failed/);
});

test('explicit live credit configuration consumes matching HTTP data, while old payloads fail closed', async () => {
  const enabled = configuration({ FUNDING_MODE: 'live', NAUST_ORIGIN: 'https://example.test', FUNDING_ENABLE_CREDITS: 'true', FUNDING_INSTRUMENT_ID: 'Amulet', FUNDING_INSTRUMENT_ADMIN: 'sample-amulet-admin', FUNDING_MAPPINGS: JSON.stringify(config().mappings) });
  const fetcher = async (url) => Response.json(url.pathname.endsWith('customers') ? sampleSnapshot(2).customers : sampleSnapshot(2).deposits);
  const snapshot = await liveSnapshot(enabled, fetcher);
  const store = new FundingStore(':memory:', enabled);
  try { assert.equal(store.reconcile(snapshot).added, 2); assert.equal(store.reconcile(snapshot).added, 0); assert.equal(total(store), '0.3000000000'); } finally { store.close(); }
  const oldStore = new FundingStore(':memory:', enabled);
  try {
    snapshot.deposits.forEach((deposit) => { delete deposit.instrumentId; delete deposit.instrumentAdmin; });
    assert.equal(oldStore.reconcile(snapshot).added, 0);
    assert.equal(total(oldStore), '0.0000000000');
  } finally { oldStore.close(); }
});

test('loopback app guards mutations and escapes upstream content without opening a socket', async () => {
  const store = memory(); const origin = 'http://127.0.0.1:4317'; const token = 'test-token';
  const handle = application(store, { origin, token, fetcher: () => { throw new Error('sample must not fetch'); } });
  const request = (path, { method = 'GET', host = '127.0.0.1:4317', body, requestOrigin = origin } = {}) => new Request(origin + path, { method, headers: { host, origin: requestOrigin, 'content-type': 'application/x-www-form-urlencoded' }, ...(body ? { body } : {}) });
  try {
    assert.equal((await handle(request('/advance', { method: 'POST', body: 'token=wrong' }))).status, 403);
    assert.equal((await handle(request('/advance', { method: 'POST', body: 'token=test-token', requestOrigin: 'https://foreign.test' }))).status, 403);
    assert.equal((await handle(request('/', { host: 'foreign.test' }))).status, 403);
    assert.equal((await handle(request('/advance', { method: 'POST', body: 'token=test-token' }))).status, 303);
    assert.equal(total(store), '0.0000000000');
    await handle(request('/advance', { method: 'POST', body: 'token=test-token' }));
    await handle(request('/replay', { method: 'POST', body: 'token=test-token' }));
    assert.equal(total(store), '0.3000000000'); assert.equal(store.view().result.added, 0);
    const response = await handle(request('/'));
    const html = await response.text(); assert.match(html, /Deterministic sample data/); assert.match(html, /0\.3000000000/); assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    for (const path of ['/terms', '/privacy', '/cookies']) assert.equal((await handle(request(path))).status, 200);
    store.fail(new Error('<script>bad</script>'));
    assert.ok(!render(store.view(), token).includes('<script>bad</script>'));
    assert.match(render(store.view(), token), /&lt;script&gt;/);
  } finally { store.close(); }
});
