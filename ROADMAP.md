# Naust roadmap

**Every customer gets an address. Every payment identifies itself.**

Naust gives every customer of a Canton business a deposit address of their own. Money that lands
there is credited to the right person in seconds, receipted on the ledger and moved to the
business's treasury, with nothing for the sender to fill in. No memo to forget. No support ticket to
find the money.

## Why now

Canton is where regulated finance is moving on chain: banks, exchanges, asset managers and payment
firms. Every one of them takes deposits, and today every one of them matches those deposits by hand.

Payments reach them from pooled exchange accounts that name nobody. The usual fix is a memo field.
Customers forget it, and each miss turns into a support case. Canton operators raised exactly this
problem on the public Canton forum in September 2026 and asked for a better pattern.

Banks solved the same problem twenty years ago with virtual account numbers. Crypto exchanges
followed with a deposit address per user. Naust brings that pattern to Canton, built on the network's
own token standard.

## Where Naust is today

- **Live.** Naust runs at [naust.namite.xyz](https://naust.namite.xyz) on Canton DevNet, with a working
  operator dashboard and customer view.
- **Fast.** Deposits are matched to their customer in a median of 2.2 seconds and reach the treasury
  in about half a minute.
- **Exact.** Every deposit is credited once. Not twice, and never lost, even when the service is
  stopped mid-payment.
- **Private.** Each customer sees their own receipts and nobody else's. The ledger itself enforces it.
- **Always on.** Deposits are processed around the clock, whether or not anyone is watching.

## The road ahead

### 1. Pilot with a Canton operator

Run Naust beside a live operator's own node on Canton TestNet, with their customers' deposits
flowing through it. One operator, one token, real volume. The goal is a business whose support team
no longer handles "where is my deposit" tickets.

### 2. An address for every customer, on demand

Each new customer receives an address the moment they sign up, issued in the business's own name
and under its own keys. Built for scale from day one: from a few hundred customers to millions, with
reusable addresses for businesses that serve many one-time depositors.

### 3. Plug into any business in an afternoon

A simple integration for operators:

- Create a customer and receive their deposit address in one request.
- Get notified the moment a deposit is credited, ready to update the customer's balance.
- A secure dashboard for the operations team, with every deposit and receipt in one place.

### 4. Every Canton token, at network scale

Support for every token on the Canton token standard, not only Canton Coin. Real-time processing
across thousands of addresses at once. Clear reporting on network fees, and sweeps that the business
can schedule to keep them low.

### 5. Enterprise readiness

Daily reconciliation between the ledger, the records and the treasury. Alerts the moment anything
needs attention. Audit-ready receipts for every deposit, and the reliability standards that regulated
businesses expect from anything that touches customer money.

### 6. MainNet

General availability on Canton MainNet, running on operators' own infrastructure. Naust never holds
customer funds or keys: the business stays in full control of its money from the first deposit.

## Who it is for

| Business | What Naust does for them |
|---|---|
| Exchanges | Credits every incoming deposit to the right account, even when it comes from another exchange |
| Wallets | Gives every user a receiving address that is theirs from day one |
| Payment apps | Tells them which customer paid the moment the money arrives |
| Fund platforms | Takes subscriptions from investors wherever their tokens are held |

## Business model

Naust is software that runs alongside the operator's own Canton node, licensed per business with
support and updates included. A managed version, run by Naust for operators who prefer not to host it
themselves, follows once the self-hosted product is proven in production.

Canton rewards applications that bring real activity to the network. Every deposit Naust processes is
real network activity, which positions Naust to take part in that program as volume grows.

## Get involved

Naust is looking for Canton operators to join the pilot. See it working at
[naust.namite.xyz](https://naust.namite.xyz), or open an issue on this repository to get in touch.
