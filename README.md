# Naust

Deposit routing for Canton. Every customer gets their own Canton address, and every payment that
lands on it is credited to that customer, written down as a receipt on the ledger, and swept into
the business's treasury. The sender types no memo and changes nothing.

Live at **https://naust.namite.xyz**. The operator demo is at
[/operator](https://naust.namite.xyz/operator) and one customer's view is at
[/customer/Ada](https://naust.namite.xyz/customer/Ada). Built for HackCanton Season 3 and running on
Canton DevNet.

## The problem

On Canton, money often arrives from a party that says nothing about who it is for. An investor whose
tokens sit on an exchange sends from the exchange's omnibus party, a pooled account that names
nobody and can change at any time. Businesses work around this with a memo field. Users forget to
fill it in, and every miss becomes a support case to find the money.

Operators described this on the Canton forum in September 2026, in a thread asking for exactly this
pattern:
[Per-user deposit destination on a single party without a memo field](https://forum.canton.network/t/per-user-deposit-destination-on-a-single-party-without-a-memo-field-is-there-a-pattern/9207).

Banks solved the same problem in the 2000s with virtual account numbers: a unique number per payer,
all landing in one real account. Exchanges brought the idea to crypto around 2012 with a deposit
address per user. Naust does it on Canton.

## How it works

Each customer is given a Canton party of their own, their deposit address. A party is Canton's
equivalent of an account holder: it can own tokens and see contracts. The business hands the
address out like an account number.

When a transfer lands on a customer's address, Naust takes it through five states:

1. **Seen.** An incoming transfer offer is waiting on the address. Canton Coin transfers between
   parties arrive as an offer (a `TransferInstruction` under the CIP-56 token standard) that the
   receiver accepts.
2. **Accepted.** Naust accepts the offer as the customer's address. The coins now sit on that
   address.
3. **Receipted.** Naust writes a `DepositReceipt` contract to the ledger: who it was for, how much,
   who sent it, and the transaction that accepted it.
4. **Sweeping.** Naust transfers the coins from the customer's address to the treasury, and the
   treasury accepts them.
5. **Swept.** The receipt is updated with the sweep transaction. The address is empty again.

Each step checks the ledger before it acts, and every command carries an ID derived from the
deposit. A step that crashes halfway is picked up where it stopped, never repeated, never skipped.

Receipts are signed by the business and observed by the customer's address. The ledger shows a
receipt only to those two parties, so one customer cannot see another's deposits. That rule lives
in the Daml contract, not in a filter in our code.

### The contracts

`daml/main/daml/Naust.daml` holds two templates.

- `CustomerAccount` links a business to a customer's address, under the business's own reference
  for that customer (for example `Ada`).
- `DepositReceipt` records one deposit. Its single choice, `Receipt_RecordSweep`, adds the sweep
  transaction once the money reaches the treasury.

## Measured on DevNet

These are the numbers behind the landing page, measured on the shared HackCanton DevNet node.

| Test | Result |
|---|---|
| Time to match (`worker/test-timing.ts`, 10 deposits) | median 2.2 s, max 4.6 s |
| Time to sweep into treasury (same run) | median 31.5 s |
| Crash safety (`worker/test-restart.ts`) | watcher killed 4 times mid-deposit across 3 deposits; each receipted exactly once, every address emptied, treasury changed by exactly the amount sent. 12 of 12 checks pass, last run 8 October 2026 on Postgres. |
| Privacy (`worker/test-visibility.ts`) | each customer's address sees all of its own receipts and none of anyone else's. 10 of 10 checks pass. |
| Live deployment, no watcher process | a 0.5 CC deposit to Ada went from seen to swept in about 44 s, driven only by the operator screen's polling (8 October 2026). |

## Where it runs

```
browser ──► naust.namite.xyz (Vercel, Next.js 16)
              │  pages, /api/ui/* (read), /api/tick (work)
              ├──► Neon Postgres (customers, deposits, the tick lease)
              └──► Canton DevNet (JSON Ledger API, validator API)
```

The app lives in `web/`. Vercel builds it on every push to `main`. A push to any other branch gets
its own preview address.

Vercel runs code as short-lived functions, not as a long-running process, so there is no loop
watching the ledger. The deposit work is one "tick": check every customer address, record new
transfers, and move every unfinished deposit as far as it will go (`web/lib/tick.ts`). Three things
start a tick:

- **Anyone viewing the demo.** The operator and customer screens poll the API every 2 seconds, and
  each poll offers to run a tick after its response is sent.
- **GitHub Actions**, every 5 minutes (`.github/workflows/tick.yml`), by calling
  `/api/tick` with a secret.
- **Vercel Cron**, once a day (`web/vercel.json`), as a last resort. The Hobby plan allows no more.

A tick runs only while it holds a lease, a single row in Postgres that says who is working and until
when. Two ticks never run at once, even when several function copies or a local watcher start
together. A tick that dies loses the lease after 55 seconds.

A fourth runs all the time: **the watcher** (`web/worker/watcher.ts`) on a free Render web service
(`render.yaml`), ticking every 3 seconds whether or not anyone is watching. Render's free plan sleeps
a service after 15 minutes without web traffic, so UptimeRobot calls the watcher's `/healthz` page
every 5 minutes to keep it awake. `/healthz` answers 503 if no tick has finished in 2 minutes, so
UptimeRobot's alert also fires when the watcher is stuck, not only when it is down. The other three
triggers remain as backups.

## Running it locally

You need Node.js 24 or later (the code uses `node:sqlite` in one migration script and runs
TypeScript files directly) and the Daml SDK 3.5.12 if you want to rebuild the contracts.

```bash
cp .env.example .env      # then fill in the values, see below
cd web
npm install
npm run dev               # the app, on http://localhost:3000
npm run watch             # the watcher loop, in a second terminal
```

The watcher calls the same tick as the deployed app, every 3 seconds. Point `DATABASE_URL` at the same
database as the deployed app and the two share one lease, so they never process the same deposit at
the same time.

### Environment variables

All of them live in the repository-root `.env`, which git ignores. `.env.example` lists them.

| Variable | What it is |
|---|---|
| `KEYCLOAK_TOKEN_URL`, `KEYCLOAK_CLIENT_ID` | where the app gets its ledger access token |
| `HACKCANTON_USERNAME`, `HACKCANTON_PASSWORD` | the DevNet node login |
| `JSON_API`, `GRPC_API`, `VALIDATOR_API` | the DevNet node's endpoints |
| `DATABASE_URL` | Postgres connection string. On Vercel the Neon integration sets it. |
| `CRON_SECRET` | guards `/api/tick`. The same value is stored in Vercel and as a GitHub Actions secret. |
| `NAUST_POOL` | the customer address pool, default `Ada,Ben,Tokunbo` |
| `NAUST_POLL_MS` | the watcher's interval, default 3000 |
| `PORT` | when set, the watcher serves `/healthz` on it (Render sets it) |
| `NEXT_PUBLIC_SITE_URL` | the public address, used for link previews |
| `NEXT_PUBLIC_NAUST_BUSINESS` | the business name addresses are shown under, ENS-style (`MagnaXchange-Ada`). Default `MagnaXchange`. |

### Scripts

Run from `web/`.

| Command | What it does |
|---|---|
| `npm run smoke` | read-only check: ledger login, treasury balance, each address, database tables |
| `npm run seed -- Ada Ben Tokunbo` | creates a customer per pool address, with its `CustomerAccount` on the ledger |
| `node worker/send-deposit.ts Ada 0.5` | sends a real test deposit to a customer |
| `node worker/test-timing.ts` | sends 10 deposits and measures time to match and to sweep |
| `node worker/test-restart.ts` | the crash-safety test above |
| `node worker/test-visibility.ts` | the privacy test above |
| `node worker/migrate-sqlite.ts` | one-off copy of an old SQLite `naust.db` into Postgres |

### Running the watcher always on

`npm run watch` is a plain Node process. With `PORT` set it also serves `/healthz`. `render.yaml`
deploys it to Render as a free web service: in the Render dashboard choose New, then Blueprint, pick
this repository, and enter the secret variables when asked (the same values as in `.env`). Then add
an HTTP monitor in UptimeRobot for `https://<service>.onrender.com/healthz` at a 5-minute interval.

Where Naust goes from here is in [ROADMAP.md](ROADMAP.md), with the engineering detail in
[docs/engineering-roadmap.md](docs/engineering-roadmap.md).

## Limits on DevNet

- The shared HackCanton node does not allow parties to be created through the API, so customer
  addresses come from a pool of parties created in the node's console (`NAUST_POOL`). On those, the
  address carries the node's fingerprint. On your own node, every address sits in your business's
  namespace under your key.
- Each address is a Canton party, and the network-wide party limit is in the low millions. For
  businesses with many occasional depositors, leasing addresses from a fixed pool, an approach
  suggested on the Canton forum, is the next step.
- Only Canton Coin has been tested. Other tokens built on the CIP-56 standard use the same
  interfaces.

## Repository layout

| Path | Contents |
|---|---|
| `web/` | the Next.js app, the tick, the watcher and the test scripts |
| `web/lib/` | ledger client, token-standard calls, deposit state machine, database |
| `daml/` | the Daml contracts (`main/`) and their tests (`test/`) |
| `brand/` | logo and identity work |
| `scripts/` | asset generation for the landing page, and the early sweep spike |
| `docs/` | design foundations, design review, demo script |
