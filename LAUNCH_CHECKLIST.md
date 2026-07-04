# Launch checklist — what's actually left before this goes live

## Already built (nothing to do)
- Storefront spotlighting The Black Bull as the featured drop
- Checkout flow: Phantom wallet connect → $ANSEM payment → on-chain verification
- Backend verifies mint, recipient, and amount independently before trusting any payment
- Printify order auto-submission after payment confirms
- Webhook handler for order status updates (signature-verified)
- Idempotency protection (a resubmitted tx signature can't double-fulfill)

## You need to do these, in order, before it's actually live

### 1. Get artwork onto the shirt (blocking — do this first)
The product doesn't exist in Printify yet. You need:
- The Black Bull artwork file, hosted somewhere publicly reachable (even a temp
  Imgur/Google Drive direct-link URL works for the one-time upload)
- Open `scripts/create-black-bull-product.mjs`, edit the `ARTWORK_URL` at the top
  to point to it, then run:
  ```powershell
  node scripts/create-black-bull-product.mjs
  ```
- This creates the real product in Printify. Your storefront picks it up automatically —
  no code changes needed after this.

### 2. Fill in the real payment config (blocking)
In `.env.local`, confirm these are real, not placeholders:
- `TREASURY_WALLET` / `NEXT_PUBLIC_TREASURY_WALLET` — wallet that receives $ANSEM
- `HELIUS_RPC_URL` / `NEXT_PUBLIC_HELIUS_RPC_URL` — free key at helius.dev
- `PAYMENT_TOKEN_MINT` — already filled in correctly (confirmed $ANSEM mint)

### 3. Do one real test purchase (blocking — do not skip)
Small amount, your own wallet, your own shipping address. Confirm:
- The $ANSEM amount shown matches the live price
- Payment goes through and verifies
- The order actually appears in your Printify dashboard
- `data/orders.json` has the record

If this doesn't work, nothing past this point matters — fix it here first.

### 4. Deploy (blocking — needed for anyone but you to buy)
`localhost:3000` only works on your machine. Push to Vercel:
```powershell
git init
git add .
git commit -m "launch"
```
Then go to vercel.com, connect your GitHub, import the repo, and add all your
`.env.local` values as Environment Variables in the Vercel dashboard (Vercel
does NOT read your local `.env.local` file — you re-enter them there).

### 5. Register the webhook (do this right after deploying)
Once you have a real `https://yourproject.vercel.app` URL, run the webhook
registration snippet from the main README against that live URL.

### 6. Domain (not blocking, but do it soon)
`yourproject.vercel.app` works fine to launch on. Buy a real domain when you're
ready and point it at Vercel — 10 minute job, does not need to happen today.

## Not required for today, worth doing soon after
- Swap the flat-file order store for Supabase (Vercel's filesystem doesn't
  persist between deploys — fine for a low-volume launch day, but orders could
  get lost on a redeploy)
- Add a simple refund/shipping policy line somewhere on the page — Printify's
  GPSR safety info field can hold this per-product if needed
- Order confirmation email to the buyer (not built — currently they just see
  the on-page confirmation)

## Do these in this exact order today
1 → 2 → 3 (test purchase) → 4 (deploy) → 5 (webhook). Steps 1–3 you can do
right now on localhost. Don't deploy until step 3 passes.
