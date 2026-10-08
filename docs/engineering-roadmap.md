# Engineering roadmap

Written 8 October 2026. Naust today proves the idea on a shared DevNet node with three customers. This
is what stands between that and something a Canton business runs in production, in the order it
should happen. Each phase says why it comes where it does.

## What the demo already does that a product keeps

- A deposit address per customer, with no memo and no change for the sender.
- Five-step processing (seen, accepted, receipted, sweeping, swept) that survives a crash at any
  point. Tested by killing the watcher four times mid-deposit.
- Receipts on the ledger that only the business and that customer can see, enforced by the Daml
  contract.
- Hosting: the app on Vercel, the database on Neon Postgres, the watcher always on with a health check.

## Phase 0: confirm someone will run it

Before building more, put the demo in front of the operators who asked for this pattern on the Canton
forum
([per-user deposit destination without a memo](https://forum.canton.network/t/per-user-deposit-destination-on-a-single-party-without-a-memo-field-is-there-a-pattern/9207)).
Three questions for each: would they run it beside their own node, what would they need from it
first, and what do they use today?

Everything below is weeks of work, and their answers decide its order.

## Phase 1: decide the shape

Two ways to ship it. They lead to different products.

**Self-hosted (recommended to start).** Naust is software a business runs beside its own Canton
node. Customer addresses are parties in the business's own namespace, under its own key. Naust never
holds anyone's money or keys. This is what the code already assumes.

**Hosted service.** Naust runs the infrastructure for many businesses. It is easier to sell and
harder to run. It needs per-business isolation, its own node or nodes, and very likely legal review,
because a service moving other people's funds may count as custody or money transmission depending
on the country. That needs a lawyer, not an engineering decision.

The rest of this plan assumes self-hosted. A hosted version can come later on the same core.

## Phase 2: run on a real node

The shared DevNet node is the demo's biggest limit. It refuses to create parties through the API,
so the demo hands out addresses from a fixed pool of three, created by hand in the node's console.

A product needs a node where Naust can create a party for every new customer on demand. Concretely:

- Access to a validator node on TestNet, then MainNet. Joining the Canton Network as a validator
  needs sponsorship from a Super Validator. Check the current onboarding process with the Canton
  Foundation and the HackCanton organisers; it is not something this repo can decide.
- Replace the address pool (`NAUST_POOL`, `poolParties()` in `web/lib/customers.ts`) with party
  allocation through the Ledger API, inside the business's namespace.
- Name every address under the business, ENS-style. Allocate each customer's party with the hint
  `<Business>-<customer ref>` (for example `MagnaXchange-Ada`), so the real party ID starts with the
  name the screens already show (`web/lib/party.ts`). Canton's own name service (the Amulet Name
  Service run by the validator) can then map a readable name to the party for wallets that support it.
- Leased addresses for very large customer bases. Each address is a Canton party, and the network
  has a party limit in the low millions. A business with many one-off depositors should rotate
  addresses from a fixed pool instead, the pattern suggested in the same forum thread.

## Phase 3: let a business plug it in

Today the only way in is the demo screens and the seed script. A business needs:

- **An API to create customers.** `POST /customers` with the business's own reference returns the
  new deposit address.
- **Webhooks.** When a deposit is credited, Naust calls the business's URL with the customer
  reference, amount and receipt ID. The call is signed so the business can tell it came from Naust,
  and retried until it is acknowledged. This is the step that actually credits the customer's
  account in the business's own system.
- **API keys and an operator login.** `/operator` is public in the demo. A product puts it behind
  sign-in.
- **A way to handle the odd failure.** A deposit can end in `failed` (for example, the sender
  withdrew the offer before it was accepted). The operator needs to see why and retry or dismiss it.

## Phase 4: make it scale

- **Stream instead of poll.** The watcher asks the ledger about every address every 3 seconds. That
  is fine for three customers and wrong for ten thousand. The Ledger API offers an update stream:
  subscribe once, from a saved ledger offset, and receive every new transfer to any of the
  business's parties. The tick logic stays the same; only how it finds new transfers changes.
- **More tokens.** Only Canton Coin has been tested. Other tokens built on the CIP-56 token standard
  use the same interfaces, but each needs testing, especially amounts and decimal places.
- **Fees.** Sweeping costs network fees. A product reports them per deposit, and lets the business
  batch sweeps or set a minimum amount worth sweeping.

## Phase 5: run it like money depends on it

- Tests in CI on every push: the Daml tests in `daml/test`, plus the timing, restart and
  visibility scripts against TestNet.
- Alerts when the watcher falls behind, a deposit fails, or the treasury balance does not match the
  receipts.
- A reconciliation report: every receipt on the ledger matched against the database and the
  treasury balance, run daily.
- Backups and restore drills. Neon keeps point-in-time history; test a restore before it is needed.
- Key handling: the business's ledger credentials live in its own secret store, never in a file.

## Phase 6: MainNet and a business model

- Move from TestNet to MainNet on the business's node, after Phase 5 has run clean on TestNet.
- Look into Canton's featured-app rewards. Canton pays rewards in Canton Coin to some applications
  that drive network activity. Whether Naust qualifies, and how, needs checking with the Canton
  Foundation before anyone counts on it.
- Pricing for the self-hosted version (licence or support), or per-deposit pricing if the hosted
  version happens.
