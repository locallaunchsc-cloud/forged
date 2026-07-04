const PRINTIFY_TOKEN = process.env.PRINTIFY_API_TOKEN;
const SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const BASE_URL = 'https://api.printify.com/v1';

async function printifyRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PRINTIFY_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'printify-web3',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => null);
    throw new Error(`Printify API error ${res.status}: ${JSON.stringify(errorBody)}`);
  }

  // 200 with empty body (e.g. some DELETE calls) — guard against JSON parse crash
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getShops() {
  return printifyRequest('/shops.json');
}

export async function listProducts() {
  return printifyRequest(`/shops/${SHOP_ID}/products.json?limit=50`);
}

export async function getProduct(productId) {
  return printifyRequest(`/shops/${SHOP_ID}/products/${productId}.json`);
}

export async function uploadImage(fileName, imageUrl) {
  return printifyRequest('/uploads/images.json', {
    method: 'POST',
    body: JSON.stringify({ file_name: fileName, url: imageUrl }),
  });
}

export async function createProduct({
  title,
  description,
  blueprintId,
  printProviderId,
  variants,
  imageId,
  variantIds,
  position = 'front',
}) {
  return printifyRequest(`/shops/${SHOP_ID}/products.json`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description,
      blueprint_id: blueprintId,
      print_provider_id: printProviderId,
      variants,
      print_areas: [
        {
          variant_ids: variantIds,
          placeholders: [
            {
              position,
              images: [{ id: imageId, x: 0.5, y: 0.5, scale: 1, angle: 0 }],
            },
          ],
        },
      ],
    }),
  });
}

export async function submitOrder({
  externalId,
  productId,
  variantId,
  quantity = 1,
  shippingAddress,
  shippingMethod = 1,
}) {
  return printifyRequest(`/shops/${SHOP_ID}/orders.json`, {
    method: 'POST',
    body: JSON.stringify({
      external_id: externalId,
      line_items: [
        {
          product_id: productId,
          variant_id: variantId,
          quantity,
          external_id: `${externalId}-item-1`,
        },
      ],
      shipping_method: shippingMethod,
      send_shipping_notification: true,
      address_to: shippingAddress,
    }),
  });
}

export async function getOrder(orderId) {
  return printifyRequest(`/shops/${SHOP_ID}/orders/${orderId}.json`);
}

export async function createWebhook(topic, url) {
  return printifyRequest(`/shops/${SHOP_ID}/webhooks.json`, {
    method: 'POST',
    body: JSON.stringify({ topic, url }),
  });
}
