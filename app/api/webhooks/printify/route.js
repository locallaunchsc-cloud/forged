import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateOrderStatus } from '../../../../lib/orderStore';

const WEBHOOK_SECRET = process.env.PRINTIFY_WEBHOOK_SECRET;

function isValidSignature(rawBody, signatureHeader) {
  if (!WEBHOOK_SECRET || !signatureHeader) return false;
  const expected =
    'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false; // length mismatch etc.
  }
}

export async function POST(req) {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-pfy-signature');

  if (!isValidSignature(rawBody, signatureHeader)) {
    console.warn('Rejected webhook: invalid signature');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const event = JSON.parse(rawBody);
  const { type, resource } = event;

  try {
    switch (type) {
      case 'order:updated': {
        const { status } = resource.data;
        await updateOrderStatus(resource.id, status);
        break;
      }
      case 'order:sent-to-production': {
        await updateOrderStatus(resource.id, 'in-production');
        break;
      }
      case 'order:shipment:created': {
        await updateOrderStatus(resource.id, 'shipped');
        // TODO: fire your Discord/Telegram bot here to notify the customer
        break;
      }
      case 'order:shipment:delivered': {
        await updateOrderStatus(resource.id, 'delivered');
        break;
      }
      default:
        console.log('Unhandled webhook type:', type);
    }
  } catch (err) {
    // Printify retries on non-2xx, so log but still acknowledge receipt if the
    // failure is on our side — avoids infinite retry loops for a persistent bug.
    console.error('Webhook processing error:', err.message);
  }

  return NextResponse.json({ received: true });
}
