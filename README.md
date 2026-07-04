# $ANSEM Payment Upgrade

This patches the wrapper we already built. It does NOT replace it — same storefront,
same Printify submission, same webhook, same order store. Only the payment layer changed.

## What changed
- **Payment token**: native SOL → your $ANSEM SPL token
- **Price oracle**: CoinGecko → Jupiter (`/api/price` route, 20s cache so you're not
  hammering their API on every checkout page load)
- **Verification**: now checks the actual SPL token balance delta on the treasury's
  associated token account — confirms the right **mint**, the right **recipient**,
  and the right **amount**, not just "some SOL moved"
- **RPC**: switched to Helius (public Solana RPC will choke under any real traffic —
  free Helius tier is enough to start)

## What I pulled from your ChatGPT prompt vs. skipped, and why

**Used:**
- $ANSEM as the only accepted token — good brand move, ties payment directly to your token
- Jupiter for pricing — correct choice, that's what it's for
- Backend-only verification of mint/recipient/amount — this is the right security model,
  now implemented in `lib/solana.js`
- Helius RPC — yes, swap in before real volume

**Skipped (for now, not forever):**
- **Separate Express backend** — unnecessary, Next.js API routes already do this job;
  splitting it out adds a deployment target for no benefit at your current scale
- **Full Postgres products/orders schema** — real database is the right eventual move,
  but you already have Supabase connected and no volume yet. The flat-file order store
  from the first wrapper still works fine for testing; swap to Supabase when you're
  actually taking orders, not before
- **Worker queues for Printify order submission** — this exists to handle API rate-limit
  spikes at high order volume. You're not there yet. Add it if/when you are.
- **"Printify is never queried for pricing at checkout"** — partially disagree: your
  current setup prices directly off the Printify variant, which is simpler and has one
  less thing that can drift out of sync. If you want fully internal USD pricing
  independent of Printify (e.g. so you can mark up margin explicitly), that's a real
  upgrade worth doing — but it's a separate change to the Products data model, not a
  payment-layer thing. Say the word if you want that built next.

## Setup

```powershell
npm install @solana/spl-token
```
(You should already have `@solana/web3.js` from the first wrapper.)

Fill in `.env.local` with the new values in `.env.example`:
- `TREASURY_WALLET` / `NEXT_PUBLIC_TREASURY_WALLET` — the wallet that receives $ANSEM payments
- `PAYMENT_TOKEN_MINT` / `NEXT_PUBLIC_PAYMENT_TOKEN_MINT` — the $ANSEM SPL token mint address
- `HELIUS_RPC_URL` / `NEXT_PUBLIC_HELIUS_RPC_URL` — sign up free at helius.dev, grab your API key

## Files in this patch (overwrite the matching files from the first wrapper)
- `lib/jupiter.js` — new
- `lib/solana.js` — replaces the SOL-only version
- `app/api/price/route.js` — new
- `app/api/checkout/verify/route.js` — replaces the SOL-only version
- `app/checkout/page.js` — replaces the SOL-only version

## Test before mainnet
$ANSEM presumably only exists on mainnet (memecoins don't have devnet twins), so you
can't fully dry-run this on devnet like the SOL version. Test with a small real amount
first — send yourself a tiny $ANSEM payment through the full flow and confirm:
1. The order shows up correctly in `data/orders.json`
2. The Printify order was actually created (check your Printify dashboard)
3. The webhook fires when you manually update order status in Printify

Only then point real customers at it.
