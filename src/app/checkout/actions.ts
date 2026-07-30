"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlaceOrderItem, ShippingAddress } from "@/lib/orders";

export type PlaceOrderInput = {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingAddress: ShippingAddress;
  note: string;
  items: PlaceOrderItem[];
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; total: number }
  | { ok: false; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function placeOrder(
  input: PlaceOrderInput,
): Promise<PlaceOrderResult> {
  if (!input.items?.length) {
    return { ok: false, error: "Your cart is empty." };
  }
  if (!input.contactName.trim()) {
    return { ok: false, error: "Please enter your name." };
  }
  if (!EMAIL_RE.test(input.contactEmail.trim())) {
    return { ok: false, error: "Please enter a valid email address." };
  }

  // Send only { slug, size, qty }; place_order re-reads prices from the DB.
  const items: PlaceOrderItem[] = input.items.map((i) => ({
    slug: i.slug,
    size: i.size,
    qty: i.qty,
  }));

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_contact_name: input.contactName.trim(),
    p_contact_email: input.contactEmail.trim(),
    p_contact_phone: input.contactPhone.trim() || null,
    p_shipping_address: input.shippingAddress,
    p_note: input.note.trim() || null,
    p_items: items,
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  const result = data as { order_number: string; total: number };
  return { ok: true, orderNumber: result.order_number, total: result.total };
}
