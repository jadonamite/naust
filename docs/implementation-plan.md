# Implementation plan: ledgers per business, preapproved addresses, scheduled sweeps

Written 15 October 2026. Status: specified, not started.

This turns Naust from one business on one shared node into software any Canton business can point at
its own node. In the same pass it changes how deposits arrive and leave: customer addresses accept
Canton Coin without an accept step, and deposits are swept to the treasury in batches on a schedule.
It extends Phases 2 to 5 of [engineering-roadmap.md](engineering-roadmap.md) and replaces the parts of
it that this plan settles.

## 1. Outcome

A business signs up, connects its Canton node, and creates customers. Each customer gets a deposit
address that is ready to receive at once. Deposits from any exchange or wallet land on that address
with no memo and no action from Naust. Every few minutes Naust writes a receipt for each new deposit
and moves the funds to the business's treasury, one transaction per customer. The customer signs in
and sees their receipts. Nobody does anything by hand.

## 2. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | When a customer's receipt appears | In the scheduled sweep transaction. Nothing is sent when a deposit arrives. The customer sees "Received" at once from Naust's record, then the receipt after the next sweep. |
| 2 | Sweep interval | Every 15 minutes by default, set per business, 1 minute to 24 hours. |
| 3 | Who provides each preapproval | The node's validator operator. The validator accepts and renews preapprovals itself, at no fee for 90-day terms. |
| 4 | Treasury keys | An external party (keys held outside the node) is the default for real money. A local party is allowed for DevNet and TestNet. |
| 5 | Where this work sits | Inside the per-business ledger work (Phase 3 of the product build), built and tested on LocalNet first. |
| 6 | Addresses | Created on demand on the business's own node or on a node Naust provides, through one connection layer. |
| 7 | Hosting | One codebase, self-hosted beside a business's node or run by Naust. Real money only on self-hosted copies until a legal review clears the hosted version. |

## 3. Ledger facts this plan relies on

Each was checked against source or a live node on 15 October 2026. Re-check them when Canton or
Splice versions change.

1. **Preapprovals remove the accept step for Canton Coin.** When the receiver has a `TransferPreapproval`,
   the token-standard transfer factory returns transfer kind `Direct` and the transfer runs
   `TransferPreapproval_SendV2` on the receiver's preapproval. Without one it returns `Offer`.
   (Splice: `HttpTokenStandardTransferInstructionHandler.scala`, `ExternalPartyAmuletRules.daml`.)
2. **Offers expire.** An offer locks the coins until `executeBefore`. After that the sender can take
   them back. (Splice: `AmuletTransferInstruction.daml`.)
3. **Preapprovals are free for 90-day terms.** `payForTransferPreapproval` charges only for time beyond
   `transferPreapprovalBaseDuration` (default 90 days). Beyond that the fee is
   `transferPreapprovalFee` (default 0.00274 USD a day). Both are unset on DevNet, so defaults apply.
4. **The validator accepts and renews.** The receiver signs a `TransferPreapprovalProposal` naming the
   validator operator's party as provider. `AcceptTransferPreapprovalProposalTrigger` accepts proposals
   for parties hosted on the validator's own participant, in about 20 seconds.
   `RenewTransferPreapprovalTrigger` extends each by 90 days once it is within 30 days of expiry.
5. **The receiver sees who sent a deposit.** The receiver is a signatory of `TransferPreapproval`, so it
   is an informee of the `TransferPreapproval_SendV2` exercise, whose argument names the `sender`.
6. **One transfer moves many holdings.** The token-standard `Transfer` takes a list,
   `inputHoldingCids`. One Ledger API submission carries any number of commands and acting parties
   and commits them as one transaction.
7. **Party allocation.** `POST /v2/parties` needs `ParticipantAdmin`, identity-provider admin, or the
   caller allocating for itself (`userId` set to its own user ID, which also grants it `CanActAs` on
   the new party). A participant can cap how many parties a user allocates for itself.
8. **Party count and memory.** From Canton 3.6.1, node memory no longer grows with the number of hosted
   parties, but only once the synchronizer runs protocol version 36. On protocol version 35 the
   old cost remains.
9. **Versions.** DevNet runs Canton 3.6.1 (Ledger API) and Splice 0.9.1 (validator). LocalNet must
   match.

## 4. The model after this change

### Parties

| Party | Hosted | Who acts as it | Role |
|---|---|---|---|
| Business | The business's node, local | Naust | Signs `CustomerAccount` and receipts. |
| Customer address | The business's node, local | Naust | Receives deposits; signs its preapproval proposal; sends sweeps. |
| Treasury | External (default) or local | Nobody through Naust, if external | Receives sweeps through its own preapproval. |
| Validator operator | The node | The validator app | Provider of every preapproval; renews them. |

In the demo and on DevNet pilots the business and treasury may be the same local party, as today.

### A deposit, start to finish

```
sender wallet ──TransferFactory (Direct)──▶ customer address
                                              │  holding created; nothing sent by Naust
                                              ▼
Naust reads the update stream ──▶ deposits row, state 'held'
                                              │  every sweep interval, per customer
                                              ▼
one transaction:  create Receipt × N  +  TransferFactory_Transfer(all N holdings ──▶ treasury, Direct)
                                              ▼
deposits rows ──▶ 'swept', receipt contract IDs recorded
```

If a deposit arrives as an offer instead (another token, a lapsed preapproval, a sender that forces an
offer), the offer path runs: accept as the customer, then the holding joins the next sweep like any
other.

### Deposit states

Offer path: `offered -> held -> swept`. Direct path: `held -> swept`. Either can end in `failed`.
The current states (`seen`, `accepted`, `receipted`, `sweeping`) remain readable for rows written
before this change and are finished by the old code path until none are left (section 15).

### Transactions per deposit

| | Today | After |
|---|---|---|
| On arrival | 0 | 0 |
| Accept | 1 | 0 (1 if it arrived as an offer) |
| Receipt | 1 | shared: N receipts ride in the sweep |
| Sweep | 1 | 1 per customer per sweep, for any number of deposits |
| Treasury accept | 0 or 1 | 0 |
| Record sweep on receipt | 1 | 0 |
| Per address, once | 1 (`CustomerAccount`) | 2 (`CustomerAccount`, preapproval proposal), plus the validator's accept and a renewal about every 90 days |

## 5. Milestones

Each milestone ends in a state that is tested and could be committed alone. Do them in order.

### M0. A ledger of our own for development

Goal: stop developing against the shared DevNet node that production uses.

- Download the Splice 0.9.1 node bundle (`0.9.1_splice-node.tar.gz` from the Splice releases), extract
  it outside the repo, and set `LOCALNET_DIR` to `splice-node/docker-compose/localnet` and
  `IMAGE_TAG=0.9.1`.
- Start it:
  ```
  docker compose --env-file $LOCALNET_DIR/compose.env --env-file $LOCALNET_DIR/env/common.env \
    -f $LOCALNET_DIR/compose.yaml -f $LOCALNET_DIR/resource-constraints.yaml \
    --profile sv --profile app-provider --profile app-user up -d
  ```
- Ports follow the bundle's pattern: `3975` is the app-provider participant's JSON Ledger API,
  `2975` the app-user's, `4975` the super validator's. Wallet UI on `wallet.localhost:3000`
  (provider) and `:2000` (user).
- LocalNet signs ledger tokens with HS256 and the shared secret `unsafe`, audience
  `https://canton.network.global`. The subject is the ledger user. `ledger-api-user` is the
  validator's user and has participant-admin rights.
- Use the app-provider node as "the business's node" and the app-user node as "an exchange" that
  sends deposits from its wallet.
- Add `scripts/localnet.sh` (start, stop, status) and a `.env.localnet.example` naming the settings
  the code reads for a LocalNet connection.
- Separate databases: `naust_dev` for local work against LocalNet, `naust_test` for tests. The
  local `.env` stops pointing at the production database.

Done when: a Node script authenticates to LocalNet, reads `/v2/version` (3.6.1) and the validator's
`/api/validator/version` (0.9.1), and lists the provider's parties.

### M1. Prove every ledger step before building on it

A throwaway script, kept out of the product code. It checks the facts in section 3 on LocalNet and
records timings and traffic per step.

1. Allocate a business party and a customer party on the provider node with `POST /v2/parties`,
   `userId` set to our user. Confirm `CanActAs` was granted.
2. As the customer, create
   `#splice-wallet:Splice.Wallet.TransferPreapproval:TransferPreapprovalProposal`
   with `receiver` = customer, `provider` = the validator party
   (`GET /api/validator/v0/validator-user` → `party_id`), `expectedDso` = the DSO party
   (`GET /api/validator/v0/scan-proxy/dso-party-id`). Wait until
   `GET /api/validator/v0/scan-proxy/transfer-preapprovals/by-party/{customer}` returns it. Record
   the delay.
3. Allocate an external treasury party (`/v2/parties/external/generate-topology`, sign, then
   `/v2/parties/external/allocate`) with a key generated by the script. Give it a preapproval by
   having it sign the same proposal through interactive submission (prepare, sign, execute). Confirm
   the validator accepts it.
4. From the app-user node's wallet party, send Canton Coin to the customer through the transfer
   factory three times. Confirm the factory reports `Direct` each time and no offer appears.
5. Read the update stream for the customer with `TRANSACTION_SHAPE_LEDGER_EFFECTS`. Confirm the
   `TransferPreapproval_SendV2` exercise is visible with `sender`, and the new holding is visible.
6. In one submission, `actAs` business and customer: three receipt creates and one
   `TransferFactory_Transfer` of all three holdings to the treasury. Confirm one update ID, kind
   `Direct`, the treasury balance up by the sum, and that the amount the factory accepts is the sum
   of the holdings' current amounts (find out whether holding fees reduce it).
7. Let a proposal sit with the validator stopped. Confirm deposits to that address arrive as offers
   and the offer path takes them.
8. On the shared DevNet node, once and with one party only: try `POST /v2/parties` with `userId`
   set to our user. If it succeeds, self-allocation works there and the address pool can go.

Done when: every step passes, and section 3 is updated with anything that differed.

### M2. Connection layer: one ledger client per business

Goal: every ledger call goes through a connection object instead of global settings.

New table (migration 4):

```sql
CREATE TABLE ledger_connections (
  business_id      TEXT PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
  json_api         TEXT NOT NULL,
  validator_api    TEXT NOT NULL,
  auth_kind        TEXT NOT NULL CHECK (auth_kind IN ('password', 'client_credentials', 'hmac_dev')),
  token_url        TEXT,
  client_id        TEXT,
  username         TEXT,
  secret_enc       TEXT NOT NULL,          -- password, client secret or HMAC secret, encrypted
  audience         TEXT,
  ledger_user_id   TEXT NOT NULL,
  business_party   TEXT NOT NULL,
  treasury_party   TEXT NOT NULL,
  treasury_kind    TEXT NOT NULL CHECK (treasury_kind IN ('local', 'external')),
  validator_party  TEXT NOT NULL,
  dso_party        TEXT NOT NULL,
  address_source   TEXT NOT NULL DEFAULT 'allocate' CHECK (address_source IN ('allocate', 'pool')),
  pool_parties     TEXT[] NOT NULL DEFAULT '{}',
  sweep_interval_s INTEGER NOT NULL DEFAULT 900 CHECK (sweep_interval_s BETWEEN 60 AND 86400),
  next_sweep_at    TIMESTAMPTZ,
  checked_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Code:

- `web/lib/crypto.ts`: `seal(text)` and `open(sealed)` with AES-256-GCM, a random 12-byte nonce per
  value, key from the new setting `NAUST_ENCRYPTION_KEY` (64 hex characters). Format
  `v1:<nonce>:<ciphertext>:<tag>` in base64url, so the key can be rotated later.
- `web/lib/auth.ts` becomes `tokenSource(conn)`: one token cache per connection, keyed by business
  ID. Three kinds: Keycloak password grant with refresh (today's code), OAuth client credentials (what
  a business's own node usually issues), and HS256 signed locally (LocalNet only; refused when
  `NODE_ENV=production`).
- `web/lib/ledger.ts` becomes `class Ledger` built from a connection: `call`, `ledgerEnd`,
  `activeContracts`, `submit` (now takes `actAs: string[]` and `commands: unknown[]`),
  `updates(fromOffset, filter, shape)`, `findArchivingTransaction`, `allocateParty`, `grantRights`.
  `LedgerError` stays as is.
- `web/lib/registry.ts` takes a `Ledger` and builds transfers that can be returned as a command plus
  disclosed contracts (`transferCommand`) rather than always submitting, so a sweep can bundle it with
  receipts.
- `web/lib/connections.ts`: `connectionFor(businessId)`, `saveConnection`, and `testConnection(input)`.
  The test authenticates, reads `/v2/version`, the user's rights, the validator party, the DSO party
  and the treasury balance, and returns what it found without saving anything.
- The demo business gets a connection built once from today's settings (`KEYCLOAK_*`,
  `HACKCANTON_*`, `JSON_API`, `VALIDATOR_API`) by a migration step in code, `address_source = 'pool'`
  with today's pool, so the public demo keeps working unchanged. Those settings then become optional.

Done when: every existing test passes with the demo running through its connection, and a second
business on LocalNet works side by side with it.

### M3. Daml package `naust` 0.2.0

Upgrade-compatible with 0.1.0: existing contracts stay valid and readable.

- Keep `CustomerAccount` and `DepositReceipt` unchanged. `DepositReceipt` stays for receipts already
  on the ledger.
- Add `Receipt`, used for every new deposit:

```haskell
data Source
  = Offered with instructionCid : Text; acceptUpdateId : Text
  | Direct with depositUpdateId : Text
  deriving (Eq, Show)

-- One deposit, written in the transaction that swept it to the treasury.
template Receipt
  with
    business : Party
    customer : Party
    customerRef : Text
    treasury : Party
    amount : Decimal
    instrumentAdmin : Party
    instrumentId : Text
    sender : Party
    holdingCid : Text
    source : Source
    receivedAt : Time
  where
    signatory business
    observer customer
    ensure amount > 0.0 && customer /= business && customer /= treasury
```

  Visibility stays as it is now: the business and that one customer only. The treasury is a field,
  not an observer, so an external treasury needs no signature.
- Tests in `daml/test/daml/Test.daml`: create with each source, visibility (another customer of the
  same business sees nothing; a customer of another business sees nothing), two businesses on one
  participant.
- Upload: through the Ledger API where the connection has the right, otherwise the business uploads
  the DAR through its node's console. The connection test reports whether `naust` 0.2.0 is vetted.

Done when: `daml test` passes and the DAR is vetted on LocalNet next to 0.1.0.

### M4. Addresses created on demand, preapproved from the start

`createCustomer(businessId, ref)` in `web/lib/customers.ts` becomes a resumable sequence. Each step
checks the ledger before acting, and command IDs are derived from the customer ID.

1. Insert the row with `party = NULL`, `address_state = 'allocating'`.
2. Allocate the party: hint `<Business>-<ref>` (cleaned to valid party characters, with a short suffix
   if taken), `userId` = the connection's ledger user. Store the party. For `address_source = 'pool'`,
   take the next free pool party instead.
3. Grant `CanActAs` if allocation did not (pool parties, admin allocation).
4. Create `CustomerAccount` as the business.
5. Create `TransferPreapprovalProposal` as the customer, provider = `validator_party`.
6. `address_state = 'pending_preapproval'`. When the preapproval appears, `address_state = 'ready'`.

New columns (migration 4): `customers.address_state` (`allocating`, `pending_preapproval`, `ready`,
`lapsed`), `customers.preapproval_cid`, `customers.preapproval_expires_at`; `customers.party` becomes
nullable until step 2.

`reconcileCustomers(conn)` finishes any customer stopped part way, and checks preapprovals for
`pending_preapproval` and `ready` customers through the scan proxy, at most every 10 minutes per
customer. An address in `pending_preapproval` or `lapsed` still takes deposits, through offers.

Backfill script `web/worker/preapprove.ts`: proposes preapprovals for every existing customer and,
for a local treasury, the treasury. Idempotent.

Done when: a new customer on LocalNet goes from request to `ready` with no manual step, and killing
the process after each step and restarting ends in the same state.

### M5. Treasury

- Local treasury: the business party, or another local party. The connection test proposes its
  preapproval the same way as a customer's.
- External treasury: `web/worker/treasury-setup.ts`, run by the business on its own machine, not on
  the server. It generates an Ed25519 key pair locally (or takes a public key from the business's own
  key store), requests the topology transaction from `/v2/parties/external/generate-topology`, prints
  the hash to sign, accepts the signature, calls `/v2/parties/external/allocate`, then prepares the
  preapproval proposal as an interactive submission, prints that hash, and executes it with the
  signature. The private key never reaches Naust's database or server.
- Naust's ledger user gets `CanReadAs` on the treasury only, to show its balance. Sweeps reach it
  through its preapproval and need no signature from it.
- The connection test refuses to save a treasury that has no preapproval.

Done when: an external treasury on LocalNet receives a batched sweep, and Naust's user has no
`CanActAs` on it.

### M6. Finding deposits from the update stream

Replace polling every address's active contracts with one update stream per business.

- Table `stream_cursors (business_id PRIMARY KEY, offset BIGINT, updated_at)`.
- Each tick reads `/v2/updates` from the cursor in pages of 200, with
  `TRANSACTION_SHAPE_LEDGER_EFFECTS`. Filter: `filtersForAnyParty` when the connection's user has
  `CanReadAsAnyParty`, otherwise `filtersByParty` over the business's customer parties, in chunks of
  500 parties per request. The cursor advances only after the page's rows are written, in the same
  database transaction.
- Classifier `classifyUpdate(tx, customersByParty)` in `web/lib/stream.ts`, pure and unit-tested:
  - `Amulet` created with `owner` = a customer, in a transaction with a
    `TransferPreapproval_SendV2` exercise whose receiver is that customer and whose `sender` is not:
    a **direct deposit** (sender, amount, holding ID, update ID).
  - `AmuletTransferInstruction` created with `transfer.receiver` = a customer: an **offered deposit**.
  - `Amulet` created for a customer in a transaction Naust submitted (command ID prefix `naust-`):
    our own change, ignored.
  - Any other `Amulet` created for a customer: a deposit with sender `unknown`, recorded and swept
    like the rest, and shown to the operator for review.
  - Other CIP-56 holdings (any contract implementing `Splice.Api.Token.HoldingV1:Holding` that is not
    `Amulet`): recorded as `unsupported`, not swept, shown to the operator. Supporting another token
    is a later, per-token change.
- Deposits table changes (migration 4): new primary key `id` (`dep_` + 16 hex). `holding_cid`
  unique. `instruction_cid` becomes nullable. New columns `kind` (`direct`, `offered`, `unknown`,
  `unsupported`), `deposit_update_id`, `sweep_batch_id`. New state values `offered`, `held`.

Done when: on LocalNet, 100 deposits sent across 20 customers while the watcher is stopped are
all found once, with the right sender and amount, when it starts.

### M7. Scheduled sweep

`web/lib/sweep.ts`, `sweepBusiness(conn)`, called by the tick when `next_sweep_at` has passed.

1. Load `held` deposits, grouped by customer, oldest first, at most 50 per customer per batch.
2. For each customer, create a `sweep_batches` row first:
   `(id, business_id, customer_id, holding_cids TEXT[], command_id, state, update_id, error, attempts,
   next_attempt_at, created_at)`. `command_id = naust-sweep-` + SHA-256 of the sorted holding IDs.
3. Check the ledger: if every holding is still active, submit one command list, acting as business and
   customer: a `Receipt` create per deposit and one `TransferFactory_Transfer` of all its holdings to
   the treasury, amount = their sum. Fetch the transfer factory context immediately before submitting.
4. If the holdings are gone, find the transaction that consumed them (`findArchivingTransaction`) and
   take its update ID and receipts. That covers a crash after submitting.
5. If only some holdings are gone, record the batch as `failed` with the reason, put the remaining
   deposits back to `held`, and alert. Nothing else in Naust moves these holdings, so this means
   someone else with rights on the address did.
6. On success, in one database transaction: batch `done` with its update ID; each deposit `swept`
   with its receipt contract ID.
7. Customers run concurrently with a limit of 8, using `Promise.allSettled`, so one failure never
   holds up another.
8. Retry with the existing backoff rules: ledger outages and overload never fail a batch; refusals
   fail it after 5 tries.
9. Set `next_sweep_at = now() + sweep_interval_s`.

If the treasury has no preapproval when a sweep runs, the factory returns `Offer`. Do not submit.
Mark the business's treasury as `not ready` and alert.

Done when: on LocalNet, 3 deposits for one customer become 1 transaction with 3 receipts, and
killing the process at every point in the sweep ends with each deposit swept exactly once.

### M8. The offer path on the new model

Today's `accept` step, moved onto the connection and the new deposit rows:

- `offered` deposit: accept as the customer (`TransferInstruction_Accept`), record the new holding,
  set `held`. It then sweeps like a direct deposit, and its receipt carries
  `Source Offered`.
- If the offer expired or was withdrawn before acceptance: `failed`, with that reason. The sender
  already has the coins back.
- Offers for unsupported tokens are not accepted, so they expire back to the sender. The operator sees
  them.

Done when: a deposit sent to a `pending_preapproval` address on LocalNet is accepted, then swept
in the next batch.

### M9. Ticks per business

- The tick claims one lease per business: `lease.name = 'tick:<business_id>'`. The watcher loops over
  businesses with a connection; a business whose node is down is logged and skipped.
- Each business's tick: reconcile customers, read the stream (M6), advance offers (M8), sweep if due
  (M7), finish rows still in the old states (section 15).
- `GET /api/tick` (cron) and the Render watcher both call the same entry point. The watcher's
  `/healthz` reports the last success per business.

Done when: two businesses on LocalNet, one with its node stopped, and the other keeps processing.

### M10. Preapproval and treasury health

- Every reconcile records each address's preapproval expiry.
- An address within 20 days of expiry is `lapsed`-at-risk. The validator renews at 30 days, so this
  means renewal has failed (usually the validator's wallet is out of traffic). Show it on `/app` and
  log it at error level.
- An address whose preapproval is gone: `lapsed`. Propose a new one; deposits keep arriving as offers
  meanwhile.
- The treasury: the same checks; a treasury without a preapproval stops sweeps (M7).

### M11. Security: treat the node as a hot wallet

Whoever controls the participant node controls every customer address on it.

- Small balances on the node. The default sweep interval keeps customer addresses close to empty.
  The operator dashboard shows the total waiting on customer addresses.
- **External treasury for real money** (M5). The connection screen says plainly when the treasury is
  local.
- Narrow rights. Naust's ledger user needs `CanActAs` on the business party and its customer
  parties, `CanReadAs` on the treasury, and party allocation for itself. It never needs
  participant-admin. The connection test lists the user's rights and warns about any it doesn't need.
- Secrets. Connection secrets are encrypted at rest (M2). `NAUST_ENCRYPTION_KEY` lives in the host's
  secret store. Decrypted secrets stay in memory, never in logs; the logger redacts token-shaped
  strings.
- Audit trail. `audit_log (id, business_id, user_id, action, detail JSONB, at)` records connection
  changes, customer creation, sweep interval changes, retries and dismissals.
- README section "Securing your node" for self-hosted businesses: network access to the Ledger
  API, user rights, key storage for the external treasury, backups.

### M12. Screens, API and words

Pages follow `docs/design-foundations.md` and `web/app/tokens.css`. Every word goes through the
content-writer pass.

- `/app/connect`: endpoints, sign-in kind, credentials, treasury. "Test connection" shows the node
  version, validator party, treasury and its balance, and the user's rights before anything is saved.
- `/app` customers: a "New customer" form (reference in, address out) and an address status for each
  customer: Ready, Setting up, Needs attention.
- `/app` deposits: Received, Swept to treasury (with time and transaction), Failed (with reason and
  Retry or Dismiss), Unsupported token, Unknown sender.
- `/app/settings`: sweep interval; "Sweep now" for an owner.
- `/me` (customer): "Received" at once; the receipt with its ledger ID after the sweep.
- Public demo `/operator` and `/customer/<ref>` keep their current look and read the new states.
- API (Phase 5 of the product build, specified here so the data model fits it):
  `POST /v1/customers` returns the address and its status; `GET /v1/deposits`; webhooks
  `deposit.received` and `deposit.swept`, signed with HMAC-SHA256 and retried until acknowledged.

### M13. Tests

| Level | What |
|---|---|
| Unit (`npm test`) | `classifyUpdate` for every case in M6; sweep batch command IDs; seal and open; token sources; state transitions; amount sums with exact decimals. |
| Database (`naust_test`) | Migration 4 on a copy of today's schema with data; cursor and deposit rows written in one transaction; batch recovery. |
| Daml (`daml test`) | `Receipt` creation and visibility; two businesses. |
| LocalNet (`npm run test:localnet`) | Address to `ready`; direct deposit found and swept; offer path; 3 deposits in one sweep; crash at every step of address creation and sweep; two businesses with one node down; lapsed preapproval; external treasury; 100 deposits across 20 customers. |
| DevNet smoke | The demo business, after deploy: one deposit from the `Exchange` party, swept on schedule. |

`worker/test-restart.ts`, `test-visibility.ts` and `test-timing.ts` are rewritten against the new
flow. `test-timing.ts` now measures time from send to "Received" and from send to swept.

### M14. Rolling out to the running demo

The public demo must keep working throughout.

1. Deploy M2 alone: the demo runs through its connection, nothing else changes.
2. Upload `naust` 0.2.0 to the DevNet node (console upload; the API refuses).
3. Run the backfill: preapproval proposals for the demo's customer addresses and treasury. Wait for
   `ready`.
4. Deploy M3 to M10. Rows in old states are finished by the old path; new deposits use the new one.
5. Smoke test: send from `Exchange`, see "Received", see it swept at the next interval.
6. Check `/operator`, `/customer/Ada`, `/api/demo/deposits` and the watcher's `/healthz`.

### M15. Documentation

- README: how a deposit flows now, cost per deposit (from M1's measurements), connecting a node,
  treasury choices, securing the node, LocalNet for development.
- `.env.example`: add `NAUST_ENCRYPTION_KEY`; mark the DevNet settings as "demo business only";
  remove `NAUST_POOL` once no business uses the pool.
- This file: mark each milestone done as it lands.

## 6. Settings

| Setting | Change |
|---|---|
| `NAUST_ENCRYPTION_KEY` | New, required. 64 hex characters. |
| `KEYCLOAK_TOKEN_URL`, `KEYCLOAK_CLIENT_ID`, `HACKCANTON_USERNAME`, `HACKCANTON_PASSWORD`, `JSON_API`, `VALIDATOR_API` | Optional. Read once to build the demo business's connection. |
| `NAUST_POOL` | Read once into the demo connection's pool, then removed. |
| `NAUST_POLL_MS` | Unchanged: how often the tick runs. Sweeps follow each business's own interval. |

## 7. Failure modes

| What happens | What Naust does |
|---|---|
| Naust is down when a deposit arrives | Nothing is lost. The holding sits on the address; the stream finds it on restart. |
| Validator is down | New preapprovals wait; existing ones still work. Renewals catch up within 30 days. |
| Preapproval lapses | Deposits arrive as offers and take the offer path. Alert raised. |
| Treasury preapproval missing | Sweeps stop for that business, deposits stay `held` on the addresses. Alert raised. |
| Crash during a sweep | The next tick finds the consumed holdings and records the existing transaction. |
| Ledger overload (429) or outage (5xx) | Backoff, no failure. |
| Ledger refuses a command | Retried, failed after 5 refusals, shown with its reason, retry or dismiss. |
| A business's node is unreachable | That business is skipped; others continue. |
| Unsupported token arrives | Recorded and shown, not swept. Offers of it expire back to the sender. |
| Someone else moves funds off an address | The sweep fails for that batch and alerts. |

## 8. Risks and open points

- **Self-allocation on shared nodes.** If a shared node caps self-allocated parties (20 observed on
  the HackCanton node), the demo stays on its pool. A business's own node has no such cap.
- **Party count before protocol version 36.** Until the synchronizer moves, each party still costs
  node memory. Tell businesses with very large customer counts to plan for it.
- **Holding fees.** Canton Coin holdings shrink slightly each round. M1 confirms how the sweep amount
  must be computed; long sweep intervals are discouraged for this reason too.
- **Hosted version.** A node run by Naust with customer funds on it is custody. Real money stays on
  self-hosted copies until a legal review clears it.
- **Stream filter size.** `filtersByParty` with thousands of parties may hit request limits. M6 chunks
  it; a business's own node can grant `CanReadAsAnyParty` instead.
