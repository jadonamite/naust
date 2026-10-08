// T009: sweep a customer address's Canton Coin to the treasury, then accept as the treasury.
// Usage: node scripts/spike-sweep.ts <customer-party> [--dry]
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const root = join(import.meta.dirname, '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8').split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const J = env.JSON_API;
const V = env.VALIDATOR_API + '/api/validator/v0';
const REG = V + '/scan-proxy/registry';
const USER = '86bb3d93-2187-41d4-8150-15a31b7d061e';
const NS = '12204a9d883d1158141d8f099d06dd2e42cb52615deb42da5a46f042c8d0e1dbdf0e';
const TREASURY = `${USER}::${NS}`;
const token = execFileSync(join(root, 'scripts/spike/token.sh')).toString();

const customer = process.argv[2];
const dry = process.argv.includes('--dry');
if (!customer) throw new Error('usage: node scripts/spike-sweep.ts <customer-party> [--dry]');

async function call(url: string, body?: unknown): Promise<any> {
  const res = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}\n${text}`);
  return JSON.parse(text);
}

async function active(party: string) {
  const end = (await call(J + '/v2/state/ledger-end')).offset;
  const acs = await call(J + '/v2/state/active-contracts', {
    activeAtOffset: end, verbose: false,
    eventFormat: { filtersByParty: { [party]: { cumulative: [
      { identifierFilter: { WildcardFilter: { value: { includeCreatedEventBlob: false } } } }] } } },
  });
  return acs.map((e: any) => e.contractEntry?.JsActiveContract?.createdEvent).filter(Boolean);
}

const isAmulet = (c: any) => c.templateId.endsWith(':Splice.Amulet:Amulet');
const isInstruction = (c: any) => c.templateId.endsWith('AmuletTransferInstruction:AmuletTransferInstruction');
const balance = (cs: any[]) => cs.filter(isAmulet)
  .reduce((s, c) => s + Number(c.createArgument.amount.initialAmount), 0);

const disclosed = (ctx: any) => ctx.disclosedContracts.map((d: any) => ({
  templateId: d.templateId, contractId: d.contractId,
  createdEventBlob: d.createdEventBlob, synchronizerId: d.synchronizerId ?? '',
}));

async function submit(actAs: string, command: unknown, ctx: any) {
  const res = await call(J + '/v2/commands/submit-and-wait-for-transaction', { commands: {
    commands: [command], commandId: 'sweep-' + randomUUID().slice(0, 8), userId: USER,
    actAs: [actAs], readAs: [actAs], disclosedContracts: disclosed(ctx),
  } });
  return res.transaction;
}

async function acceptAll(party: string) {
  for (const c of (await active(party)).filter(isInstruction)) {
    if (c.createArgument.transfer?.receiver !== party) continue;
    const ctx = await call(`${REG}/transfer-instruction/v1/${c.contractId}/choice-contexts/accept`, { meta: {} });
    const tx = await submit(party, { ExerciseCommand: {
      templateId: '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferInstruction',
      contractId: c.contractId, choice: 'TransferInstruction_Accept',
      choiceArgument: { extraArgs: { context: ctx.choiceContextData, meta: { values: {} } } },
    } }, ctx);
    console.log('accepted as', party.split('::')[0], 'instruction', c.contractId.slice(0, 16), 'update', tx.updateId);
  }
}

const before = await active(customer);
const holdings = before.filter(isAmulet);
const treasuryBefore = balance(await active(TREASURY));
console.log('customer amulets:', holdings.map((c: any) => c.createArgument.amount.initialAmount));
console.log('customer pending instructions:', before.filter(isInstruction).length);
console.log('treasury balance before:', treasuryBefore);
if (!holdings.length) throw new Error('customer holds no Amulet to sweep');

const admin = holdings[0].createArgument.dso;
const amount = balance(holdings).toFixed(10);
const now = new Date();
const transfer = {
  sender: customer, receiver: TREASURY, amount,
  instrumentId: { admin, id: 'Amulet' },
  requestedAt: now.toISOString(),
  executeBefore: new Date(now.getTime() + 3600_000).toISOString(),
  inputHoldingCids: holdings.map((c: any) => c.contractId),
  meta: { values: {} },
};
const factoryReq = {
  choiceArguments: { expectedAdmin: admin, transfer, extraArgs: { context: { values: {} }, meta: { values: {} } } },
  excludeDebugFields: true,
};
const factory = await call(`${REG}/transfer-instruction/v1/transfer-factory`, factoryReq);
console.log('factory request:', JSON.stringify({ ...factoryReq, choiceArguments: { ...factoryReq.choiceArguments, transfer: { ...transfer, sender: '<customer>', receiver: '<treasury>' } } }));
console.log('factory response keys:', Object.keys(factory), 'transferKind:', factory.transferKind,
  'disclosed:', factory.choiceContext?.disclosedContracts?.length);
if (dry) process.exit(0);

const tx = await submit(customer, { ExerciseCommand: {
  templateId: '#splice-api-token-transfer-instruction-v1:Splice.Api.Token.TransferInstructionV1:TransferFactory',
  contractId: factory.factoryId, choice: 'TransferFactory_Transfer',
  choiceArgument: {
    expectedAdmin: admin, transfer,
    extraArgs: { context: factory.choiceContext.choiceContextData, meta: { values: {} } },
  },
} }, factory.choiceContext);
console.log('sweep update', tx.updateId);

if (factory.transferKind !== 'direct') await acceptAll(TREASURY);
const after = await active(customer);
console.log('customer amulets after:', after.filter(isAmulet).map((c: any) => c.createArgument.amount.initialAmount));
console.log('treasury balance after:', balance(await active(TREASURY)), 'delta:', balance(await active(TREASURY)) - treasuryBefore);
