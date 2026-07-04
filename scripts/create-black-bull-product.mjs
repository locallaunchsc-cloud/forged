// Run once to create the actual "Black Bull" product in your Printify shop.
// Usage:
//   node scripts/create-black-bull-product.mjs
//
// Requires PRINTIFY_API_TOKEN and PRINTIFY_SHOP_ID in your environment
// (loaded from .env.local automatically via the dotenv import below).

import 'dotenv/config';

const TOKEN = process.env.PRINTIFY_API_TOKEN;
const SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const BASE_URL = 'https://api.printify.com/v1';

// ---- EDIT THESE THREE VALUES BEFORE RUNNING ----
const ARTWORK_URL = 'https://your-image-host.com/black-bull-design.png'; // publicly reachable image URL
const BLUEPRINT_ID = 384;      // default: Bella+Canvas 3001 tee — change if you want a different blank
const PRINT_PROVIDER_ID = 1;   // check /catalog/blueprints/{id}/print_providers.json for options
// -------------------------------------------------

async function printifyRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'forged-launch-script',
      ...options.headers,
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`Printify error ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

async function main() {
  if (!TOKEN || !SHOP_ID) {
    throw new Error('Missing PRINTIFY_API_TOKEN or PRINTIFY_SHOP_ID in .env.local');
  }

  console.log('1/3 — Uploading artwork...');
  const upload = await printifyRequest('/uploads/images.json', {
    method: 'POST',
    body: JSON.stringify({ file_name: 'black-bull-design.png', url: ARTWORK_URL }),
  });
  console.log('   Uploaded, image id:', upload.id);

  console.log('2/3 — Fetching variants for this blueprint/provider...');
  const variantsRes = await printifyRequest(
    `/catalog/blueprints/${BLUEPRINT_ID}/print_providers/${PRINT_PROVIDER_ID}/variants.json`
  );
  // Grab a small, sensible default set (S/M/L/XL) if present, else just take the first 4
  const variants = variantsRes.variants.slice(0, 4).map((v) => ({
    id: v.id,
    price: 3500, // $35.00 — change as needed, price is in cents
    is_enabled: true,
  }));
  const variantIds = variants.map((v) => v.id);
  console.log('   Using variants:', variantIds);

  console.log('3/3 — Creating the product...');
  const product = await printifyRequest(`/shops/${SHOP_ID}/products.json`, {
    method: 'POST',
    body: JSON.stringify({
      title: 'The Black Bull',
      description: "Ansem's first physical drop. Paid in $ANSEM.",
      blueprint_id: BLUEPRINT_ID,
      print_provider_id: PRINT_PROVIDER_ID,
      variants,
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position: 'front',
              images: [{ id: upload.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
            },
          ],
        },
      ],
    }),
  });

  console.log('\n✅ Done. Product created:');
  console.log('   product_id:', product.id);
  console.log('\nCheck it in your Printify dashboard under "My products."');
  console.log('It will now show up automatically on your storefront.');
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
