// Run once, AFTER you've deployed to Vercel and have a real https:// URL.
// Usage:
//   node scripts/register-webhooks.mjs https://your-project.vercel.app

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const TOKEN = process.env.PRINTIFY_API_TOKEN;
const SHOP_ID = process.env.PRINTIFY_SHOP_ID;
const BASE_URL = 'https://api.printify.com/v1';

const deployedUrl = process.argv[2];
if (!deployedUrl || !deployedUrl.startsWith('https://')) {
  console.error('Usage: node scripts/register-webhooks.mjs https://your-project.vercel.app');
  process.exit(1);
}

const webhookUrl = `${deployedUrl.replace(/\/$/, '')}/api/webhooks/printify`;

async function createWebhook(topic) {
  const res = await fetch(`${BASE_URL}/shops/${SHOP_ID}/webhooks.json`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'forged-launch-script',
    },
    body: JSON.stringify({ topic, url: webhookUrl }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Failed for ${topic}: ${JSON.stringify(data)}`);
  console.log(`✅ Registered "${topic}" →`, webhookUrl);
}

async function main() {
  console.log(`Registering webhooks pointing to: ${webhookUrl}\n`);
  const topics = [
    'order:updated',
    'order:sent-to-production',
    'order:shipment:created',
    'order:shipment:delivered',
  ];
  for (const topic of topics) {
    await createWebhook(topic);
  }
  console.log('\nAll set. Confirm PRINTIFY_WEBHOOK_SECRET is set in your Vercel env vars —');
  console.log('that\'s what the webhook route uses to verify these requests are really from Printify.');
}

main().catch((err) => {
  console.error('❌ Failed:', err.message);
  process.exit(1);
});
