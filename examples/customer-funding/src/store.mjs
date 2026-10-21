import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { units, decimal } from './money.mjs';
import { validateSnapshot } from './source.mjs';

const now = () => new Date().toISOString();
const economic = (d) => JSON.stringify([d.customerId, d.customerRef, d.amount, d.instrument, d.instrumentId ?? null, d.instrumentAdmin ?? null]);
const proofs = (d) => JSON.stringify([d.acceptUpdateId, d.sweepUpdateId, d.receiptCid]);

export class FundingStore {
  constructor(path, config) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.config = config;
    this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS observations (id TEXT PRIMARY KEY, payload TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS credits (deposit_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, amount TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY, deposit_id TEXT NOT NULL, detail TEXT NOT NULL, created_at TEXT NOT NULL);
    `);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const fingerprint = JSON.stringify(config);
      const bound = this.get('config');
      if (bound && bound !== fingerprint) throw new Error('Database belongs to another source or mapping configuration. Use a separate data file.');
      this.set('config', fingerprint);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); this.db.close(); throw error; }
  }
  close() { this.db.close(); }
  get(key) { return this.db.prepare('SELECT value FROM settings WHERE key=?').get(key)?.value; }
  set(key, value) { this.db.prepare('INSERT INTO settings VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, String(value)); }
  event(id, detail) {
    this.db.prepare('INSERT INTO events(deposit_id,detail,created_at) VALUES (?,?,?)').run(id, detail, now());
  }
  stage() { return Number(this.get('stage') ?? 0); }
  fail(error) { this.set('error', error.message); }
  reconcile(input, stage) {
    const snapshot = validateSnapshot(input);
    const customers = new Map(snapshot.customers.map((c) => [c.id, c]));
    const mappings = new Map(this.config.mappings.map((m) => [m.customerId, m]));
    let added = 0;
    let rejected = 0;
    this.db.exec('BEGIN IMMEDIATE');
    try {
      for (const d of snapshot.deposits) {
        const old = this.db.prepare('SELECT * FROM observations WHERE id=?').get(d.id);
        const credit = this.db.prepare('SELECT * FROM credits WHERE deposit_id=?').get(d.id);
        const prior = old ? JSON.parse(old.payload) : null;
        const customer = customers.get(d.customerId);
        const mapping = mappings.get(d.customerId);
        let status = 'provisional';
        let detail = 'Waiting for a completed sweep. No credit posted.';
        let conflict = null;
        if (!customer || !mapping || customer.ref !== mapping.customerRef || d.customerRef !== mapping.customerRef) conflict = 'Customer identity does not match a configured product account.';
        else if (d.instrumentId !== this.config.instrumentId || d.instrumentAdmin !== this.config.instrumentAdmin || d.instrument !== this.config.instrumentId) conflict = 'Full instrument identity is missing or does not match the expected token.';
        if (credit) {
          const posted = JSON.parse(credit.payload);
          if (economic(posted) !== economic(d) || (d.state === 'swept' && proofs(posted) !== proofs(d))) conflict = 'A credited deposit changed. Original credit retained; investigate the source.';
          if (!conflict) { status = 'credited'; detail = 'Already credited once. Replay adds no credit.'; }
        } else if (prior && (prior.customerId !== d.customerId || prior.customerRef !== d.customerRef || prior.instrumentId !== d.instrumentId || prior.instrumentAdmin !== d.instrumentAdmin)) {
          conflict = 'Deposit identity changed. Investigate before crediting.';
        }
        if (old?.status === 'conflict' && !credit) conflict = old.detail;
        if (conflict) { status = 'conflict'; detail = conflict; rejected++; }
        else if (!credit && d.state === 'failed') { status = 'failed'; detail = 'Naust reports failure. No credit posted.'; }
        else if (!credit && d.state === 'swept') {
          if (!d.receiptCid || !d.acceptUpdateId || !d.sweepUpdateId) { status = 'conflict'; detail = 'Completed sweep is missing receipt or transaction identifiers.'; rejected++; }
          else if (!this.config.creditEnabled) { status = 'observed'; detail = 'Sweep observed. Local live credits are disabled.'; }
          else {
            this.db.prepare('INSERT INTO credits VALUES (?,?,?,?,?)').run(d.id, mapping.accountId, d.amount, JSON.stringify(d), now());
            added++; status = 'credited'; detail = 'Completed sweep posted one local demonstration credit.';
          }
        }
        if (!credit && prior && prior.amount !== d.amount) this.event(d.id, `Provisional amount changed from ${prior.amount} to ${d.amount}.`);
        if (!old || old.status !== status || old.detail !== detail || old.payload !== JSON.stringify(d)) this.event(d.id, detail);
        this.db.prepare('INSERT INTO observations VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,status=excluded.status,detail=excluded.detail').run(d.id, JSON.stringify(d), status, detail);
      }
      this.set('customers', JSON.stringify(snapshot.customers));
      this.set('lastSync', now());
      this.set('lastResult', JSON.stringify({ added, rejected, deposits: snapshot.deposits.length }));
      this.set('error', '');
      if (stage !== undefined) this.set('stage', stage);
      this.db.exec('COMMIT');
      return { added, rejected, deposits: snapshot.deposits.length };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  view() {
    const credits = this.db.prepare('SELECT * FROM credits ORDER BY created_at,deposit_id').all();
    const accounts = this.config.mappings.map((mapping) => ({ ...mapping,
      balance: decimal(credits.filter((c) => c.account_id === mapping.accountId).reduce((total, c) => total + units(c.amount), 0n)),
      credits: credits.filter((c) => c.account_id === mapping.accountId).length,
    }));
    return {
      accounts, credits, config: this.config, stage: this.stage(),
      observations: this.db.prepare('SELECT * FROM observations ORDER BY id').all().map((row) => ({ ...row, deposit: JSON.parse(row.payload) })),
      events: this.db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT 100').all(),
      customers: JSON.parse(this.get('customers') ?? '[]'), lastSync: this.get('lastSync'), error: this.get('error'),
      result: JSON.parse(this.get('lastResult') ?? 'null'),
    };
  }
}
