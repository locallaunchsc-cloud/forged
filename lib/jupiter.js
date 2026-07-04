// Jupiter's old price.jup.ag (and even the free no-key lite-api.jup.ag) endpoints
// are deprecated. Current API requires a free key from https://portal.jup.ag —
// sign up, create a key (Free plan, 25M credits/month, plenty for this), and set
// JUPITER_API_KEY in your .env.local.

const JUPITER_PRICE_URL = 'https://api.jup.ag/price/v3';
const PAYMENT_TOKEN_MINT = process.env.PAYMENT_TOKEN_MINT || process.env.NEXT_PUBLIC_PAYMENT_TOKEN_MINT;
const JUPITER_API_KEY = process.env.JUPITER_API_KEY;
const CACHE_TTL_MS = 20_000;

let cache = { price: null, fetchedAt: 0 };

export async function getAnsemUsdPrice() {
  const now = Date.now();
  if (cache.price && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.price;
  }

  if (!PAYMENT_TOKEN_MINT) {
    throw new Error('PAYMENT_TOKEN_MINT is not configured');
  }
  if (!JUPITER_API_KEY) {
    throw new Error('JUPITER_API_KEY is not configured — get a free one at https://portal.jup.ag');
  }

  const res = await fetch(`${JUPITER_PRICE_URL}?ids=${PAYMENT_TOKEN_MINT}`, {
    headers: { 'x-api-key': JUPITER_API_KEY },
  });
  if (!res.ok) throw new Error(`Jupiter price fetch failed: ${res.status}`);

  const data = await res.json();
  // V3 response shape: { "<mint>": { usdPrice, decimals, blockId, priceChange24h } }
  const price = data?.[PAYMENT_TOKEN_MINT]?.usdPrice;

  if (!price) throw new Error('$ANSEM price not found in Jupiter response — check the mint address');

  cache = { price, fetchedAt: now };
  return price;
}

export async function usdToAnsem(usdAmount) {
  const ansemPrice = await getAnsemUsdPrice();
  return +(usdAmount / ansemPrice).toFixed(6);
}
