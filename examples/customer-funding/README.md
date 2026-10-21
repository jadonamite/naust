# Customer funding reference integration

A separate sample Canton product maps Naust customers to its own account IDs, polls deposit snapshots and posts a local credit after a completed sweep. Its SQLite database belongs to the receiving product. Replaying the same deposit cannot add another credit, even after a restart.

The receiving product is fictitious. This is not a third-party partnership or a connection to another existing Canton product. Balances are local demonstration credits with no withdrawal or claim on funds.

## Run it

Requires Node.js 24 or later. There are no packages to install. Run from this directory:

```sh
npm start
```

Open `http://127.0.0.1:4317`. Observe the sample deposits, complete their sweeps, then replay them. Ada's balance becomes exactly `0.3000000000` and stays there on replay. Ben and Tokunbo remain at zero. Sample mode reads deterministic fixtures, makes no network requests and moves no funds.

The same sequence runs without a browser:

```sh
npm run walkthrough
npm test
```

The database is stored under gitignored `data/`. Restarting preserves all credits. Running the walkthrough again against the same database adds zero credits. To begin a fresh sample walkthrough, stop the app and remove `data/sample-v1.sqlite`, or choose a fresh `FUNDING_DB` path. Do not remove a database whose audit records you need to keep.

## What crosses the boundary

```text
Naust customer ID + deposit snapshot
                  |
          HTTP polling adapter
                  |
     explicit product account mapping
                  |
    validate token + completed sweep
                  |
   one immutable local credit per deposit
```

Naust owns the deposit address and reports its lifecycle. The receiving product owns its customer account IDs, balance calculation and credit policy. This adapter does not import Naust database code or share a database connection. Its two HTTP reads are the existing `/api/demo/customers` and `/api/demo/deposits` endpoints, not a proposed future API.

`seen`, `accepted`, `receipted` and `sweeping` stay provisional. A `failed` deposit receives no credit. A `swept` deposit needs a receipt contract ID, acceptance transaction ID and sweep transaction ID before it can post a local credit. The token ID and administrator must both match the configured pair. The immutable uniqueness key is the deposit ID within one source-bound database. A receipt ID is not used for duplicate protection because it can change during the lifecycle.

Amounts remain decimal strings with at most ten fractional digits. BigInt arithmetic gives an exact sum; SQLite stores money as text. Reconciliation and credit insertion commit together. A later amount, customer, token or completed-sweep proof correction creates a visible conflict and leaves the original credit unchanged. Earlier lifecycle snapshots and missing deposits never erase credits. A provisional amount correction is recorded in the activity log. Identity changes before credit stay quarantined.

## Connect an authorized Naust instance

Live mode defaults to observation only. It never falls back to sample data. Check that the service operator permits these reads first: the current demo GET handlers also schedule Naust's deposit tick, so a poll can advance existing ledger work.

```sh
FUNDING_MODE=live NAUST_ORIGIN=https://your-authorized-naust.example npm start
```

The origin is set in the process environment, without a path, query, username or password. No repository `.env` file is read. The browser never chooses an upstream URL. Sync is manual to avoid imposing an assumed polling rate. The UI shows the origin, source mode, last successful sync and errors. Live HTTP access has not been verified in this restricted environment; tests use an injected HTTP client.

To test local live credits, set all of the following explicitly using customer IDs from that authorized instance:

```sh
FUNDING_MODE=live \
NAUST_ORIGIN=https://your-authorized-naust.example \
FUNDING_MAPPINGS='[{"accountId":"your-product-account-42","customerId":"the-naust-customer-id","customerRef":"the-exact-naust-reference"}]' \
FUNDING_INSTRUMENT_ID=Amulet \
FUNDING_INSTRUMENT_ADMIN=the-expected-full-administrator-party \
FUNDING_ENABLE_CREDITS=true \
npm start
```

Mappings must use exact, unique IDs and references. They never remap automatically by display name. Enabling local credits without the mapping and token pair fails at startup. Older Naust responses without full instrument identity cannot credit. This change adds `instrumentId` and `instrumentAdmin` to the existing demo deposit view without changing its `instrument` display field. It must be deployed on an authorized upstream before the adapter can use those new fields.

The default data filename includes a fingerprint of the live origin, mapping, token pair and credit setting. Sample and live stores cannot mix. Changing configuration creates a separate local store; using `FUNDING_DB` to force reuse of an incompatible store fails. The trust boundary remains the upstream service: transaction identifiers in JSON are not independent proof of ledger settlement. This is not an authorization model for real balances, a production accounting system or a security-reviewed payment integration.

## Configuration

| Setting | Behavior |
| --- | --- |
| `FUNDING_MODE` | `sample` by default, or explicit `live`. |
| `NAUST_ORIGIN` | Required in live mode. HTTPS, or HTTP on loopback. No credentials or URL paths. |
| `FUNDING_MAPPINGS` | Live JSON array of `accountId`, `customerId`, `customerRef`. Defaults to no accounts. |
| `FUNDING_INSTRUMENT_ID` | Expected live token ID. Required to enable local live credits. |
| `FUNDING_INSTRUMENT_ADMIN` | Expected full live administrator party. Required to enable local live credits. |
| `FUNDING_ENABLE_CREDITS` | `true` enables explicit local live credits; disabled by default. |
| `FUNDING_DB` | Optional SQLite filename; configuration is pinned on creation. |
| `FUNDING_PORT` | Loopback UI port, default `4317`. |

## Adapting this to a real product

Replace the account mapping and local credit repository with the product's existing customer and accounting interfaces. Keep duplicate protection and account crediting inside one database transaction. Agree on full asset identity, authenticated tenant-scoped APIs, historical recovery, polling limits and settlement policy with the Naust operator before real use. A third-party product name, its API contract and access are still needed to make an actual partner integration.

On-demand address provisioning, independent per-business ledger connections and signed webhooks remain planned Naust capabilities. This example does not implement them. The demo endpoints return snapshots without pagination or delivery guarantees, and dismissed deposits may disappear. A production consumer needs a recoverable event or reconciliation contract rather than assuming every snapshot is complete.

The server binds only to `127.0.0.1`, checks its Host header and requires a process form token on mutations. It uses no authentication, analytics, cookies or external fonts. Do not expose it to a public network. Terms, privacy and cookie information are linked from its footer.

## Files

| Path | Responsibility |
| --- | --- |
| `src/source.mjs` | Sample snapshots, input validation, configuration and HTTP client. |
| `src/money.mjs` | Exact decimal conversion. |
| `src/store.mjs` | SQLite observations, immutable credits and audit log. |
| `src/server.mjs` | Local HTTP routes and request guards. |
| `src/view.mjs`, `public/styles.css` | Source labels, accounts, evidence, activity and policies. |
| `test/funding.test.mjs` | Replay, crash rollback, identity, money, HTTP and local request tests. |
