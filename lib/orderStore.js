import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // server-only key, never expose this with NEXT_PUBLIC_
);

export async function saveOrder(order) {
  const { data, error } = await supabase
    .from('orders')
    .insert({
      external_id: order.externalId,
      printify_order_id: order.printifyOrderId,
      product_id: order.productId,
      variant_id: order.variantId,
      shipping_address: order.shippingAddress,
      received_ansem: order.receivedAnsem,
      price_usd: order.priceUsd,
      status: order.status,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to save order: ${error.message}`);
  return data;
}

export async function getOrderByExternalId(externalId) {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('external_id', externalId)
    .maybeSingle();

  if (error) throw new Error(`Failed to look up order: ${error.message}`);
  return data;
}

export async function updateOrderStatus(printifyOrderId, status) {
  const { data, error } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('printify_order_id', printifyOrderId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to update order status: ${error.message}`);
  return data;
}

export async function getAllOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data;
}
