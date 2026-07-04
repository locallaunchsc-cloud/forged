import { NextResponse } from 'next/server';
import { verifyAnsemPayment } from '../../../../lib/solana';
import { usdToAnsem } from '../../../../lib/jupiter';
import { submitOrder } from '../../../../lib/printify';
import { saveOrder, getOrderByExternalId } from '../../../../lib/orderStore';

export async function POST(req) {
  try {
    const body = await req.json();
    const { signature, productId, variantId, priceUsd, shippingAddress } = body;

    if (!signature || !productId || !variantId || !priceUsd || !shippingAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Idempotency guard — a resubmitted signature returns the existing order, never double-fulfills
    const existing = await getOrderByExternalId(signature);
    if (existing) {
      return NextResponse.json({ order: existing, alreadyProcessed: true });
    }

    // Recompute the expected $ANSEM amount server-side from the CURRENT price —
    // never trust a client-supplied amount, prices move between page load and payment.
    const expectedAmountAnsem = await usdToAnsem(priceUsd);

    const verification = await verifyAnsemPayment({ signature, expectedAmountAnsem });
    if (!verification.valid) {
      return NextResponse.json({ error: verification.error }, { status: 402 });
    }

    const printifyOrder = await submitOrder({
      externalId: signature,
      productId,
      variantId,
      shippingAddress,
    });

    const record = await saveOrder({
      externalId: signature,
      printifyOrderId: printifyOrder.id,
      productId,
      variantId,
      shippingAddress,
      receivedAnsem: verification.receivedAnsem,
      priceUsd,
      status: 'submitted',
    });

    return NextResponse.json({ order: record, printifyOrder });
  } catch (err) {
    console.error('Checkout verify error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
