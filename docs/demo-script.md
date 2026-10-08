# Demo Script: Naust (HackCanton Season 3)

**Target Duration:** 90 seconds (1 minute 30 seconds)  
**Track:** Financial Applications / RWA & Business Workflows  
**Measured Benchmarks:** 10/10 deposits matched in median 2.2 s (max 4.6 s), swept in median 31.5 s  
**Specification Reference:** T041, `inertia/specs/naust/spec.md`, `inertia/Hackathons/hackcanton-s3-FORGE.md`  

---

## 1. Before You Hit Record

### Terminal & Environment Setup
Open two clean Terminal windows:

- **Terminal 1 (Next.js server & Watcher status):**
  Ensure the Next dev server is running on port 3107:
  ```bash
  cd ~/Projects/jadonamite/naust/web
  npx next dev -p 3107
  ```
  Ensure the watcher process is active:
  ```bash
  cd ~/Projects/jadonamite/naust/web
  npm run watch
  ```
  *(Check that only one watcher is running: `pgrep -fl worker/watcher.ts`)*

- **Terminal 2 (Demo Sender):**
  Stage the demo deposit command ready to run on cue:
  ```bash
  cd ~/Projects/jadonamite/naust/web
  node worker/send-deposit.ts Ada 50.0
  ```

### Pre-Flight Balance Check
Verify the ledger user, treasury, and Exchange party balance before recording:
```bash
npm run smoke
```
Confirm `86bb3d93-Exchange` has at least 50 CC (current verified balance: 60.0 CC). If a top-up is needed:
```bash
node worker/send-deposit.ts --fund 50
```

### Browser Windows
Open Google Chrome or Safari at 1080p (1920x1080) or 1440p resolution. Have three tabs ready in order:
1. **Tab 1:** `http://localhost:3107/operator` (Operator view: Treasury balance, Customers, Live Feed)
2. **Tab 2:** `http://localhost:3107/customer/Ada` (Customer view: Ada's address and private receipts)
3. **Tab 3:** `http://localhost:3107/` (Landing page: Brand, tagline, and architectural proof)

Ensure browser zoom is at 100%, bookmarks bar hidden, and system notifications muted.

---

## 2. Second-by-Second Production Script

```
Timeline:
[0:00 - 0:15] Problem: The Omnibus Withdrawal Dilemma
[0:15 - 0:32] Solution: Per-Customer Virtual Addresses on Canton
[0:32 - 0:52] Action: Sending 50 CC with Zero Memo
[0:52 - 1:12] Ledger Mechanics: Ingestion, Treasury Sweep, and Receipt
[1:12 - 1:24] Customer Verification: Need-to-Know Privacy
[1:24 - 1:30] Closing: The Historical Precedent
```

---

### 0:00–0:15 · The Problem: Unattributed Deposits

**Visual:**  
Browser Tab 1 (`http://localhost:3107/operator`). Show the treasury balance and customer list. Mouse hovers over the deposit feed.

**Voiceover:**  
> "When an investor withdraws Canton Coin or a CIP-56 token from an exchange to a business, the transfer comes from the exchange's pooled omnibus party. It identifies nobody.
> 
> Unless the user types a memo, the business cannot tell whose money it is. As Trakx described on the Canton developer forum: every miss becomes a manual support case to recover funds."

**Direction:**  
Do not embellish support case counts or claim automated refunds. Point directly at the reality of exchange omnibus parties.

---

### 0:15–0:32 · The Architecture: Protocol-Level Routing

**Visual:**  
Stay on Tab 1. Zoom or pan smoothly toward the Customers table. Highlight the distinct deposit address allocated to Ada (`86bb3d93-Ada::...`).

**Voiceover:**  
> "Naust solves this by bringing virtual account numbers to Canton. Every customer receives their own Canton deposit address, controlled under the business's key.
> 
> We ask nothing from the sender. No pre-registration, no special wallet plugin, and no memo field. A payment identifies its sender simply by where it lands.
> 
> Here on DevNet, these addresses come from a hosted pool; in production, they sit directly under your own validator namespace."

**Direction:**  
Adhere to disclosure H1: explicitly state that on shared DevNet nodes the fingerprint is the node's, whereas in production the business controls the full key namespace.

---

### 0:32–0:52 · The Live Transfer: Strangers Paying Without a Memo

**Visual:**  
Switch to Terminal 2 or position it side-by-side with Tab 1. Show the command prompt.

**Action:**  
Execute the staged command:
```bash
node worker/send-deposit.ts Ada 50.0
```
Terminal prints: `Exchange sent 50 CC to Ada instr ...`

**Voiceover:**  
> "Watch this live on Canton DevNet. Here, an independent exchange party sends 50 Canton Coin directly to Ada's deposit address.
> 
> Notice the parameters: no description, no tracking memo, and zero customer identification in the payload."

---

### 0:52–1:12 · Autonomous State Machine & Treasury Sweep

**Visual:**  
Switch focus back to Browser Tab 1 (`/operator`). The feed updates in real-time as the watcher polls every 2 seconds.  
Row appears: `50 CC for Ada from 86bb3d93-Exchange, no memo`.  
State pill transitions: `Seen` -> `Accepted` -> `Sweeping` -> `Swept to treasury` (green).  
Treasury balance updates upward by 50 CC.

**Voiceover:**  
> "Within three seconds, Naust's watcher detects the transfer instruction on Ada's party.
> 
> It autonomously exercises the accept choice as Ada, attributes the payment, sweeps the full holding into the central treasury, and issues a tamper-proof deposit receipt on the ledger.
> 
> In benchmark testing across ten consecutive runs, attribution completed in a median of 2.2 seconds. Exactly once, with zero double-credit risk."

**Direction:**  
Cite the exact SC-002 benchmark numbers (median 2.2 s, max 4.6 s). Do not round to "instant" or "1 second".

---

### 1:12–1:24 · Privacy and Customer Verification

**Visual:**  
Click the `Customer` tab or navigate to Tab 2 (`/customer/Ada`). Show Ada's personal screen with her deposit address and the receipt table displaying the 50 CC entry, the timestamp, and the ledger update IDs.

**Voiceover:**  
> "Now switch to Ada's view. Her screen queries the ledger using read permissions on her deposit address.
> 
> She sees her confirmed receipt and the cryptographic sweep update ID. Because Canton enforces need-to-know privacy at the sub-transaction level, Ada can never see Ben's deposits, and Ben can never see Ada's."

**Direction:**  
Adhere to disclosure C1: do not claim the coin remains in Ada's personal custody. The coin was swept to the treasury, and Ada holds an auditable ledger receipt observable by her party.

---

### 1:24–1:30 · Conclusion: The Third Hop

**Visual:**  
Switch to Tab 3 (`http://localhost:3107/`). Center on the hero lockup and tagline:  
*"Every customer gets an address. Every payment identifies itself."*

**Voiceover:**  
> "Corporate virtual accounts solved this for banks in the 2000s. HD wallets solved it for crypto in 2012. Naust brings virtual deposit accounts natively to Canton."

---

## 3. Post-Recording Quality Verification

Before approving the recording:
1. **Audio Clarity:** Voiceover is crisp, calm, and free of background noise.
2. **Timing:** Total video length lands between 85 and 95 seconds.
3. **Typography & UI:** All text is clearly legible at 1080p. Tabular figures align without jitter.
4. **No Emojis:** Verify that no emojis appear in terminal outputs, browser views, or presentation slides.
5. **Truthfulness:** Confirm that the transaction hash, recipient, and amounts shown on screen match the live DevNet records.
