# Naust: getting it live, in order

Written 8 October 2026. This is the working plan for taking Naust from "runs on one Mac" to "runs
at naust.namite.xyz, demo included". Every step is done in the order listed. Each step says what
it is, why it exists, how it is done, how it is checked, and what would stop it.

Status markers: `[ ]` not started, `[~]` in progress, `[x]` done, `[!]` blocked on you.

---

## Where things stand right now

What exists:

- One local git commit on `main`: `71c0eeb major refactor across app layout structure according
  to moodboard`. It holds the whole project: the Daml contracts (`daml/`), the brand work
  (`brand/`), the docs, the scripts, and the Next.js app (`web/`).
- The app runs on your Mac with `npm run dev` inside `web/`.
- A second process, the **watcher** (`npm run watch` inside `web/`), runs beside it. It is a
  loop that wakes every 3 seconds, asks the Canton ledger whether any customer address has
  received a transfer, and walks each new deposit through five states: seen, accepted,
  receipted, sweeping, swept.
- The watcher and the app share a **SQLite** database. SQLite is a database that lives in a
  single file on disk, here `web/data/naust.db`. It records the customers (Ada, Ben, Tokunbo,
  which address each owns) and every deposit with its current state.

What does not exist:

- No GitHub repository. Nothing has ever left your Mac.
- No Vercel project. Vercel has never seen this code, so there was nothing to "redeploy".
- No domain. `naust.namite.xyz` is not attached to anything of yours yet.

Facts checked before writing this plan:

- Your Vercel team `jadonamites-projects` is on the **Hobby** (free) plan.
- `namite.xyz` is registered through Vercel and its DNS is run by Vercel
  (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`). Adding a subdomain to a project creates the DNS
  record automatically. No registrar dashboard is involved.
- Your team has no database integrations installed (`vercel integration list --all` returns
  nothing).
- None of your HackCanton credentials appear in any committed file. `.env` is ignored by git.

---

## Why the demo cannot simply be uploaded to Vercel

This is the core problem, so it gets explained properly before the steps.

Vercel does not run your app as one long-lived program. It runs each request as a short-lived
**serverless function**: a copy of the code starts, answers one request, and may be thrown away
seconds later. Two consequences follow.

1. **No permanent disk.** Each function gets a scratch folder that disappears with it. The
   SQLite file would be created empty on every cold start and lost afterwards. Two requests a
   second apart can land on two different copies, each with its own empty file. The operator
   screen would show no customers, or random ones.

2. **No background process.** Nothing on Vercel runs a `while (true)` loop. The watcher has no
   home. Without it, a deposit sent to Ada's address sits on the ledger as a pending transfer
   forever, and nobody credits it or sweeps it.

The Hobby plan adds a third constraint: **Vercel Cron**, Vercel's built-in scheduler, may run
at most once a day on Hobby. That is far too slow to act as the watcher.

So the demo needs three changes:

- The database moves off the disk and into a **hosted Postgres** database that every function
  copy can reach over the network. Postgres is the standard server database; "hosted" means
  someone else runs the server and we connect with a URL.
- The watcher's loop body (one "tick": check every address, advance every unfinished deposit)
  becomes something a request can trigger, guarded by a **lease**, so two copies never work the
  same tick at the same time.
- Something calls that tick often enough. Three triggers, layered:
  - **While anyone has the demo open**, the screens already poll the API every 2 seconds. Each
    poll triggers a tick (at most one every 3 seconds, thanks to the lease). Deposits are
    credited within seconds while someone is watching, as they are today.
  - **GitHub Actions**, GitHub's free automation, runs a scheduled job every 5 minutes that calls
    the tick endpoint. Free and unlimited for public repositories. GitHub treats the schedule as
    best effort, so in practice the gap is 5 to 15 minutes. It is the backstop for deposits
    sent while nobody has the page open.
  - **Vercel Cron**, once a day, as the last safety net.

The tick endpoint is protected by a secret (`CRON_SECRET`) so strangers cannot hammer it. The
screens' own polls trigger the tick server-side, so the secret never reaches the browser.

### Why not the alternatives

- **Keep SQLite, host the app on an always-on server (Fly.io, Railway, Render, a VPS).** This
  works with no code change, but needs an account with a new provider (your sign-up and payment
  card), and you asked for Vercel with your domain.
- **Turso (hosted SQLite).** Needs a new Turso account. Same blocker, and the code would still
  need to go async.
- **Drop the database and read everything from the ledger.** The ledger does hold customers and
  finished receipts. It does not hold the in-between bookkeeping (which holding came from which
  transfer, which sweep offer is pending) that makes the watcher safe to restart. Rebuilding
  that on the ledger means changing the Daml contracts and redeploying them. Too much risk to
  logic that has been tested for exactly-once delivery.
- **Neon through the Vercel Marketplace (chosen).** Neon is a hosted Postgres provider. Added
  through Vercel, it is billed through Vercel and its free tier covers this. Vercel puts the
  connection URL (`DATABASE_URL`) straight into the project's environment variables. The one
  open question: the first time a team adds a Marketplace integration, Vercel may require
  accepting Neon's terms in the browser. If it does, that is the only click I need from you in
  this phase.

---

## Progress log

- 1.1 to 1.2: `jadonamite/naust` is public at https://github.com/jadonamite/naust.
- 2.1 to 2.7: live at https://naust.namite.xyz and https://naust-kappa.vercel.app. (`naust.vercel.app`
  belongs to someone else.) The landing and legal pages are prerendered static HTML.
- 3.1: blocked. Vercel answered `integration_terms_acceptance_required`; the terms must be accepted at
  https://vercel.com/jadonamites-projects/~/integrations/accept-terms/neon?source=cli
- 3.2 to 3.6: done and tested against local Postgres 16 (`naust_dev`). The smoke test and all 10
  visibility checks pass. A real 0.5 CC deposit to Ada went from seen to swept with no watcher running,
  driven only by API polls. `/api/tick` answers 401 without the secret. `CRON_SECRET` is set in Vercel,
  GitHub and the local `.env`.
- 3.7: the kill-and-restart test passes 12 of 12 on Postgres: four kills mid-deposit, each deposit
  receipted exactly once, every address emptied, treasury up by exactly the 5 CC sent. Its last check
  used to assume deposits came from the treasury's own wallet; send-deposit.ts now sends from the funded
  Exchange party, so the check now expects the amount actually sent from outside.
- Waiting on you: 3.1 (Neon terms) and 3.9 (commit approval). 3.8 and 3.10 follow on their own.
- The old SQLite watcher (pid 82841) was stopped with SIGTERM so it could not race the new code.

## Phase 1: Code on GitHub

**1.1 `[x]` Create the public repository `jadonamite/naust` and push `main`.**
Command: `gh repo create jadonamite/naust --public --source . --remote origin --push`.
Public, as you confirmed, and matching SHAMAR, XENIA and echonome.
Check: `gh repo view jadonamite/naust` shows the commit `71c0eeb`.
Could stop it: the permission system refused this once already. You have now said public, so it
is retried. If it refuses again, I need you to approve the prompt.

**1.2 `[x]` Confirm nothing secret went up.**
Already scanned before committing. After the push, a second check runs against the remote
tree: grep for the HackCanton password value and for token-shaped strings.

---

## Phase 2: The landing page live on Vercel

**2.1 `[x]` Prove the production build works locally first.**
Command: `npm run build` inside `web/`. Catches type errors and anything that only fails in
production mode before Vercel sees it.
Specific risk: `Hero.tsx` and `Sections.tsx` check `public/` for image files at render time with
`existsSync`. On Vercel the function's working folder does not contain `public/` (Vercel serves
those files from its CDN, a network of caching servers, not from the function). If the landing
page is **prerendered**, meaning rendered once at build time into static HTML, the check runs
during the build where `public/` exists, and all is well. The build output marks the route `○`
(static) or `ƒ` (dynamic). If it shows `ƒ`, the checks move to build time.

**2.2 `[x]` Create the Vercel project `naust`.**
Through the Vercel API: name `naust`, framework Next.js, **root directory `web`**. The root
directory matters: the repository's top level holds `daml/`, `brand/` and `docs/`, and Vercel
must build only `web/`.

**2.3 `[x]` Connect the project to the GitHub repository.**
Once connected, every push to `main` triggers a production deployment. Every push to another
branch gets its own preview URL. This is the "push triggers redeploy" you asked for.
Could stop it: Vercel's GitHub app has to be allowed to see `jadonamite/naust`. Your other repos
are already connected, so the app is installed. If it was installed for "selected repositories
only", a new repo is not on the list, and you would need to add it on GitHub.

**2.4 `[x]` Set the environment variables that do not depend on the database.**
- `NEXT_PUBLIC_SITE_URL=https://naust.namite.xyz`, used for social preview links.
- `KEYCLOAK_TOKEN_URL`, `KEYCLOAK_CLIENT_ID`, `HACKCANTON_USERNAME`, `HACKCANTON_PASSWORD`,
  `JSON_API`, `GRPC_API`, `VALIDATOR_API`, copied from your local `.env`, marked **sensitive** so
  they cannot be read back from the dashboard.
- `NAUST_POOL=Ada,Ben,Tokunbo`, the customer address pool.

**2.5 `[x]` First deployment.**
Triggered by the GitHub connection, or with `vercel deploy --prod` if the connection only fires
on the next push.
Check: the deployment reaches `READY`, and the landing page loads on its `.vercel.app` address.

**2.6 `[x]` Attach `naust.namite.xyz`.**
Add the domain to the project. Vercel's DNS creates the record and issues the HTTPS
certificate, usually within a minute.
Check: `https://naust.namite.xyz` returns the landing page with a valid certificate.

**2.7 `[x]` Send you the links.** The `.vercel.app` address and `naust.namite.xyz`.

At this point the landing page is live. The demo pages load, but their data calls fail, as
explained above. Phase 3 fixes that.

---

## Phase 3: The demo, live

**3.1 `[!]` Provision Neon Postgres through Vercel.**
`vercel integration add neon`, linked to the `naust` project, free plan, region close to Vercel's
default function region (Washington, D.C., `iad1`). Adds `DATABASE_URL` to the project.
Could stop it: the terms acceptance described above. If it needs your browser, I stop and ask.

**3.2 `[x]` Port the database layer from SQLite to Postgres.**
Files: `web/lib/db.ts`, `web/lib/deposits.ts`, `web/lib/customers.ts`, `web/lib/views.ts`, and the
API routes and worker scripts that call them.
- Driver: `@neondatabase/serverless`. It talks to Neon over HTTP or WebSockets, which suits
  serverless functions that open and close constantly.
- SQLite's driver is **synchronous** (each query blocks until it answers). Postgres drivers are
  **asynchronous** (each query returns a promise to `await`). Every `db().prepare(...).get()`
  becomes `await sql\`...\``, and every function above it gains `async`.
- The schema moves almost unchanged: two tables, `customers` and `deposits`, the same columns,
  the same state check, the same indexes. `INSERT OR IGNORE` becomes
  `INSERT ... ON CONFLICT DO NOTHING`. `PRAGMA user_version` migrations become a small
  `schema_version` table.
- The rule "every step checks the ledger before acting" stays exactly as it is. Only the
  storage underneath changes.

**3.3 `[x]` Add the lease.**
A one-row table `lease (name, holder, until)`. A tick starts only if it can claim the lease:
`UPDATE lease SET holder = $me, until = now() + interval '25 seconds' WHERE name = 'tick' AND
until < now() RETURNING holder`. If no row comes back, another copy is working and this one
returns immediately. When the tick finishes, it releases the lease early. If a function dies
mid-tick, the lease expires on its own after 25 seconds.
Why it matters: the deposit steps are designed to survive a restart, not to run twice at the
same moment. The lease means only one copy runs a tick at any time.

**3.4 `[x]` Turn the watcher loop into a reusable tick.**
Move `tick()` out of `worker/watcher.ts` into `web/lib/tick.ts`. It waits for every deposit it
starts to finish within the call (a serverless function may be frozen once it responds, so
nothing can be left running in the background). `worker/watcher.ts` keeps working locally by
calling the same function in its loop, so `npm run watch` still works on your Mac.

**3.5 `[x]` Add the triggers.**
- `GET /api/tick`: runs a tick. Requires `Authorization: Bearer $CRON_SECRET`, the header Vercel
  Cron sends automatically.
- The read routes (`/api/ui/deposits`, `/api/ui/customers`, `/api/ui/treasury`, customer
  receipts) start a tick through `after()` from `next/server`, which runs work after the
  response is sent so the screens stay fast. The lease caps this at one tick at a time and one
  start every 3 seconds.
- `web/vercel.json`: one Vercel Cron entry, daily, calling `/api/tick`.
- `.github/workflows/tick.yml`: a scheduled GitHub Action every 5 minutes calling
  `https://naust.namite.xyz/api/tick` with the secret, stored as a GitHub Actions secret.
- Generate `CRON_SECRET` (32 random bytes) and set it in Vercel and in GitHub.

**3.6 `[x]` Move the existing data across.**
A one-off script, `web/worker/migrate-sqlite.ts`, copies the customers (Ada, Ben, Tokunbo with
their addresses and account contract IDs) and the deposit history from `web/data/naust.db` into
Postgres. Without it the live demo would start with no customers. Running it again changes
nothing, because rows that exist are skipped.

**3.7 `[x]` Verify locally against Postgres.**
Point local `.env` at the Neon database. Run the existing checks: `npm run smoke`, then
`worker/test-visibility.ts` (one customer cannot see another's receipts), then a real deposit
with `worker/send-deposit.ts` and watch it reach `swept` through the tick, with the local watcher
stopped.

**3.8 `[ ]` Verify on a Vercel preview deployment.**
`vercel deploy` (not production) gives a private preview URL running the new code with the
real environment variables. Open `/operator`, send a test deposit to Ada, and watch it go from
seen to swept on the preview. Check `/customer/Ada` shows the new receipt.

**3.9 `[!]` Commit and push to production.**
Your standing rule: I propose the commit message and wait for your approval. Proposed:
`Host the demo on Vercel with Postgres and request-driven ticks`. When you approve, the push to
`main` triggers the production redeploy on its own.

**3.10 `[ ]` Final checks on `naust.namite.xyz`.**
- Landing page at desktop and phone widths.
- Network tab: no requests to `fonts.googleapis.com` or `fonts.gstatic.com` (your compliance
  rule: fonts must not leak visitors' IP addresses).
- Cookie banner, terms, privacy and cookie pages reachable from the footer.
- `/operator` and `/customer/Ada` show live data, and a real test deposit goes from seen to
  swept.
- The GitHub Action's first scheduled run succeeds.

---

## What I will need from you, and only these

1. Approving the permission prompt for creating the public repo, if it appears again (1.1).
2. Accepting Neon's terms in the browser, if Vercel requires it on first use (3.1).
3. Adding `naust` to the Vercel GitHub app's repository list, only if it is limited to selected
   repositories (2.3).
4. Approving the commit message in 3.9.

Everything else runs without stopping.

## Things this plan deliberately does not do

- It does not change the Daml contracts or redeploy them to the ledger.
- It does not change the landing page copy, which was finished in the previous step.
- It does not move off the shared HackCanton DevNet node. The demo stays on DevNet.
