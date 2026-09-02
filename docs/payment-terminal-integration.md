# Semi-integrated payment terminal — architecture & plan

Goal: let staff take a **card / QR Ph / e-wallet** payment on a **Maya Terminal**
(Sunmi P2 or PAX A920) driven from the Loiza's ordering app, so the amount is
sent to the terminal automatically and, on approval, the order is marked **Paid
(Card)** with the transaction reference — no double-keying.

Status: **scaffolded behind a hidden feature flag** (`NEXT_PUBLIC_TERMINAL_ENABLED`,
off by default so it's invisible on the client's deployment). The device-side
bridge + Maya verification are pending Maya's ECR access (see "Open questions").

**Implemented so far (hidden):**
- Flag `NEXT_PUBLIC_TERMINAL_ENABLED` in `src/lib/flags.js` (route 404s + UI hidden when off).
- `orders.paymentProvider` + `orders.paymentRef` columns (migrated local + Turso).
- `markTablePaid(tableId, { method, provider, ref })` records provider + reference.
- **Live Maya sandbox** wiring: `POST /api/tables/[id]/maya-checkout` creates a real
  Maya Checkout (sandbox), returns the hosted `redirectUrl`; `GET /api/maya/callback`
  **verifies the payment server-side** (secret key) and marks paid — can't be spoofed.
  Client: BillModal "💳 Pay via terminal" opens the checkout; the board auto-flips to
  Paid on its next poll. Sandbox keys default in `src/lib/maya.js` (override via
  `MAYA_PUBLIC_KEY` / `MAYA_SECRET_KEY` / `MAYA_API_BASE` for production).
- A pure-simulated `POST /api/tables/[id]/terminal-pay` also exists (offline fallback).
- Receipt shows the payment **Ref No.** when present.
- Test cards: e.g. Mastercard `5123456789012346`, exp `12/30`, CVV `111` (no 3DS).

**Two go-live paths from here:** (A) keep it as **in-app Maya Checkout** (swap sandbox
keys → production keys, set up webhooks for reliability); or (B) the original
**physical terminal via local bridge** (needs the Maya device + ECR docs) — the
checkout call is just replaced by the bridge call, everything else stays.

---

## 1. Why a "bridge" is needed

The app is a **web app** (Next.js on Vercel, runs in the browser). Maya's
semi-integration is a **local USB / RS-232 cable** between the terminal and the
cashier's computer (Maya "Merchant ECR Plugin"). A browser tab cannot open a
serial/USB device on its own in a way Maya's plugin expects.

So we add a small **Bridge Agent** — a local program on the cashier PC that:

- speaks Maya's ECR protocol to the terminal over serial/USB, and
- exposes a tiny **localhost HTTP API** the web app calls.

```
[ Browser: Loiza's admin ]  --http-->  [ Bridge Agent (localhost) ]  --USB/RS-232-->  [ Maya Terminal ]
        (Vercel web app)                  (Node service on cashier PC)                   (Sunmi/PAX)
                                                     |
                                                     +--- Maya cloud (auth, settlement, txn lookup)
```

Browsers allow an **https** page to call **http://127.0.0.1** (localhost is
exempt from mixed-content blocking), so the deployed app can talk to the local
bridge. (Fallback: bridge serves https with a locally-trusted cert.)

---

## 2. Components

### 2a. Bridge Agent (new)
- **Runs on:** the cashier computer, autostart on boot. One per pay station.
- **Tech:** Node.js service (packaged as a Windows/macOS executable) using
  `serialport` (or Maya's provided ECR SDK if they give one). Optionally Electron
  if a small tray UI is wanted.
- **Talks to terminal:** Maya ECR framing over serial (RS-232) / USB — exact
  protocol per Maya docs (TBD).
- **Exposes:** `http://127.0.0.1:<port>` with a **shared token** (configured on
  both bridge and app) so only our app can call it.
- **Config:** serial port, Maya credentials/terminal id, shared token.

### 2b. Web app (changes)
- **Guest/staff "Pay via terminal"** action on the bill flow.
- New backend routes to **start** a terminal payment and to **confirm/verify** it.
- Extended **order payment fields** (provider, reference, status).

### 2c. Maya Terminal + Maya cloud
- The device processes the card/QR (card data never touches our app → we stay
  **out of PCI scope**).
- Maya cloud holds the authoritative transaction record — used for **verification**.

---

## 3. End-to-end flow

1. Staff opens the bill for a table → taps **Pay via terminal**.
2. App backend creates a **pending payment** (`POST /api/terminal/pay`) with the
   amount + orderId + an idempotency key, returns a `paymentId`.
3. Browser calls the **bridge**: `POST http://127.0.0.1:<port>/pay`
   `{ paymentId, amountCents, ref }` (+ shared token).
4. Bridge sends the amount to the **Maya Terminal**; the customer taps/inserts /
   scans QR Ph. UI shows **"Follow the terminal…"** (waiting state).
5. Terminal returns a result to the bridge: **approved** (with auth code / masked
   PAN / Maya txn id) or **declined / cancelled / timeout**.
6. On approved, the app calls its backend **`POST /api/terminal/confirm`** with
   the Maya txn id. The **backend verifies** it against **Maya's transaction
   lookup API** (don't trust the client alone), then marks the table's order
   **paid** (`paidAt`, `paymentMethod = card`, `paymentRef`, `paymentProvider =
   maya_terminal`) and resolves the bill request.
7. Staff **Close** the order → it moves to Sales as today.
8. On declined/cancelled/timeout → show the reason, leave the order unpaid, allow
   retry or fall back to cash.

---

## 4. Data model (future migration)

Extend `orders` (already has `paymentMethod`, `paidAt`):
- `paymentProvider` text — `cash` | `card_manual` | `maya_terminal` | …
- `paymentRef` text — Maya txn id / approval code (for reconciliation).
- (optional) a `payments` table if we want a full attempt log (initiated,
  declined, approved) rather than just the final state.

---

## 5. Edge cases to handle

- **Timeout / no response** from terminal → mark attempt failed, allow retry.
- **Decline** → show reason, order stays unpaid.
- **Cancel on terminal** → same as decline.
- **Double-tap / retries** → idempotency key so the same order can't be charged
  twice; verify against Maya before marking paid.
- **Approved but app/network dropped** before confirm → a **reconcile job** that
  queries Maya for recent txns by reference and repairs order state.
- **Refund / void** → out of scope v1; handled on the Maya side; note it on the
  order manually.
- **Bridge offline** (agent not running / cable unplugged) → app detects (health
  check) and falls back to manual **Mark paid (Card)**.

---

## 6. Security

- Card data **never** reaches our app or DB — the terminal + Maya handle it → we
  stay out of **PCI-DSS** scope.
- Bridge API bound to **127.0.0.1** only + **shared token**; never exposed to LAN.
- Backend **verifies every approval against Maya's API** before marking paid, so a
  spoofed browser call can't fake a payment.
- Maya credentials live only on the **bridge** and the **server** (env), never in
  the browser.

---

## 7. BIR / reconciliation

Unchanged from today: the **official Sales Invoice** is still issued by the
**Info-tek accredited POS**. With terminal payments there are three records to
reconcile: our **app order** (paymentRef) ↔ **Maya settlement report** ↔
**Info-tek SI**. Storing `paymentRef` on the order makes this a lookup, not a
guess. (A future report could match app paid-orders to a Maya settlement export.)

---

## 8. Open questions for Maya (blockers)

1. Does the **Maya Terminal ECR plugin** expose a documented **serial/USB
   protocol** we can drive from our own bridge? Or only their prebuilt ECR
   plugins for specific POS software?
2. Device model provided (Sunmi P2 vs PAX A920) and connection (USB vs RS-232)?
3. Is there a **cloud API** to **look up a transaction** by id (for backend
   verification) and to pull **settlement reports** (for reconciliation)?
4. Sandbox/test terminal + test cards for development?
5. Merchant onboarding requirements, fees, settlement timing.

---

## 9. Phases & rough effort

- **Phase 0 — Feasibility (blocking):** Maya onboarding, get ECR docs + a test
  device, confirm the protocol. *(Mostly Maya's side; no dev until confirmed.)*
- **Phase 1 — Bridge Agent:** serial comms to terminal, localhost API, token,
  health check, packaging/installer. *(Largest dev item.)*
- **Phase 2 — App integration:** pay-via-terminal flow, `/api/terminal/pay` +
  `/confirm` with Maya verification, order payment fields + migration, waiting/
  approved/declined UI, fallback to manual.
- **Phase 3 — Reliability:** reconcile job, edge cases, on-device testing.
- **Phase 4 — Reconciliation report (optional):** match app payments to Maya
  settlement.

Priced separately from the base app (online/terminal payment was out of scope in
the development agreement). Phase 0 gates everything — confirm Maya first.