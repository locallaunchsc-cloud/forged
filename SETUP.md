# Setup — final merged package

This is everything merged into one drop: the storefront, checkout (fixed for
Token-2022 / $ANSEM), Printify integration, and webhook handler.

## Your project is TypeScript (create-next-app defaulted to .tsx) — that's fine
Next.js happily runs plain `.js` files alongside `.tsx` ones as long as `allowJs`
is on in `tsconfig.json`, which it is by default. You do not need to rename
anything or convert these files to TypeScript.

## Steps

1. **Delete** the stray `printify.js` sitting at your project root (outside `lib/`) —
   you have an old copy there, it's not used anymore now that `lib/printify.js` exists.

2. **Delete the existing `app/page.tsx`** (the default Next.js welcome screen) and
   replace it with `app/page.js` from this zip. Having both a `page.tsx` and `page.js`
   in the same route folder will cause a build conflict — only one can exist.

3. **Extract the rest of this zip directly into your project root** — it will create:
   - `lib/printify.js`, `lib/solana.js`, `lib/jupiter.js`, `lib/orderStore.js`
   - `app/checkout/page.js`
   - `app/order-confirmed/page.js`
   - `app/api/products/route.js`
   - `app/api/price/route.js`
   - `app/api/checkout/verify/route.js`
   - `app/api/webhooks/printify/route.js`
   - `next.config.js` (overwrite your existing one — only adds webpack polyfills needed for Solana libs)

4. **Copy `.env.example` to `.env.local`** and fill in the two values still marked
   as placeholders:
   - `PRINTIFY_API_TOKEN` — your working token
   - `TREASURY_WALLET` / `NEXT_PUBLIC_TREASURY_WALLET` — your wallet that receives payments
   - `HELIUS_RPC_URL` / `NEXT_PUBLIC_HELIUS_RPC_URL` — free key at helius.dev

   `PRINTIFY_SHOP_ID` and both `PAYMENT_TOKEN_MINT` values are already filled in
   correctly (28129860 = BlackBullAnsem, and the confirmed $ANSEM Token-2022 mint).

5. **Install the two new packages:**
   ```powershell
   npm install @solana/web3.js @solana/spl-token@latest
   ```

6. **Run it:**
   ```powershell
   npm run dev
   ```

## What's still on you
- Create at least one real product in Printify (dashboard or via `createProduct()`
  in `lib/printify.js`) — the storefront pulls live from your shop, so it'll show
  empty until one exists.
- The flat-file order store (`data/orders.json`) works locally but won't persist
  once deployed to Vercel — swap to Supabase before real traffic.
- Register the webhook (see the main README section on this) once you have a
  public HTTPS URL from deploying.
