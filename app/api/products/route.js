import { NextResponse } from 'next/server';
import { listProducts } from '../../../lib/printify';

export async function GET() {
  try {
    const data = await listProducts();

    // Trim down to what the storefront actually needs
    const products = (data.data || []).map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      image: p.images?.find((img) => img.is_default)?.src || p.images?.[0]?.src || null,
      variants: p.variants
        .filter((v) => v.is_enabled)
        .map((v) => ({
          id: v.id,
          title: v.title,
          priceCents: v.price,
        })),
    }));

    return NextResponse.json({ products });
  } catch (err) {
    console.error('Failed to list products:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
