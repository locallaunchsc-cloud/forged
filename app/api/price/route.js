import { NextResponse } from 'next/server';
import { getAnsemUsdPrice } from '../../../lib/jupiter';

export async function GET() {
  try {
    const price = await getAnsemUsdPrice();
    return NextResponse.json({ price });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
