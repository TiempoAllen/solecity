import type { SupabaseClient } from "@supabase/supabase-js";

export const ORDER_STATUSES = ["pending", "paid", "shipped", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type ShippingAddress = {
  line1?: string;
  line2?: string;
  city?: string;
  province?: string;
  postal?: string;
  country?: string;
};

// What the client sends per cart line to place_order (no prices).
export type PlaceOrderItem = { slug: string; size: number; qty: number };

export type OrderItem = {
  id: string;
  productSlug: string;
  productName: string;
  brand: string;
  unitPrice: number;
  size: number;
  qty: number;
  gradient: { from: string; to: string; accent: string };
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  shippingAddress: ShippingAddress;
  status: OrderStatus;
  subtotal: number;
  total: number;
  note: string | null;
  createdAt: string;
};

export type OrderWithItems = Order & { items: OrderItem[] };

type OrderRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  shipping_address: ShippingAddress | null;
  status: OrderStatus;
  subtotal: number;
  total: number;
  note: string | null;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  product_slug: string;
  product_name: string;
  brand: string;
  unit_price: number;
  size: number | string;
  qty: number;
  gradient: { from: string; to: string; accent: string };
};

function mapOrder(r: OrderRow): Order {
  return {
    id: r.id,
    orderNumber: r.order_number,
    customerId: r.customer_id,
    contactName: r.contact_name,
    contactEmail: r.contact_email,
    contactPhone: r.contact_phone,
    shippingAddress: r.shipping_address ?? {},
    status: r.status,
    subtotal: r.subtotal,
    total: r.total,
    note: r.note,
    createdAt: r.created_at,
  };
}

function mapItem(r: OrderItemRow): OrderItem {
  return {
    id: r.id,
    productSlug: r.product_slug,
    productName: r.product_name,
    brand: r.brand,
    unitPrice: r.unit_price,
    size: Number(r.size),
    qty: r.qty,
    gradient: r.gradient,
  };
}

const ORDER_COLUMNS =
  "id,order_number,customer_id,contact_name,contact_email,contact_phone,shipping_address,status,subtotal,total,note,created_at";
const ITEM_COLUMNS =
  "id,product_slug,product_name,brand,unit_price,size,qty,gradient";

export async function fetchOrders(
  supabase: SupabaseClient,
  status?: OrderStatus,
): Promise<Order[]> {
  let query = supabase
    .from("orders")
    .select(ORDER_COLUMNS)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as OrderRow[]).map(mapOrder);
}

export async function fetchOrderById(
  supabase: SupabaseClient,
  id: string,
): Promise<OrderWithItems | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(`${ORDER_COLUMNS}, order_items(${ITEM_COLUMNS})`)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  const { order_items, ...order } = data as OrderRow & {
    order_items: OrderItemRow[];
  };
  return {
    ...mapOrder(order),
    items: (order_items ?? []).map(mapItem),
  };
}

export async function fetchOrderCounts(
  supabase: SupabaseClient,
): Promise<Record<OrderStatus, number> & { all: number }> {
  const { data } = await supabase.from("orders").select("status");
  const counts = { pending: 0, paid: 0, shipped: 0, cancelled: 0, all: 0 };
  for (const row of (data ?? []) as { status: OrderStatus }[]) {
    counts[row.status] += 1;
    counts.all += 1;
  }
  return counts;
}
