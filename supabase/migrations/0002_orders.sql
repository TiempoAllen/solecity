-- Phase 2: orders + checkout ------------------------------------------------

-- Order status lifecycle.
create type public.order_status as enum ('pending','paid','shipped','cancelled');

-- Human-friendly order numbers: SC-001001, SC-001002, ...
create sequence if not exists public.order_number_seq start 1001;

-- orders -------------------------------------------------------------------
create table public.orders (
  id               uuid primary key default gen_random_uuid(),
  order_number     text unique not null,
  customer_id      uuid references public.profiles(id) on delete set null,
  contact_name     text not null,
  contact_email    text not null,
  contact_phone    text,
  shipping_address jsonb not null default '{}'::jsonb,
  status           public.order_status not null default 'pending',
  subtotal         integer not null,
  total            integer not null,
  note             text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index orders_customer_id_idx on public.orders(customer_id);
create index orders_status_idx on public.orders(status);
create index orders_created_at_idx on public.orders(created_at desc);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- order_items: immutable snapshots so history survives product edits -------
create table public.order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  product_id   uuid references public.products(id) on delete set null,
  product_slug text not null,
  product_name text not null,
  brand        text not null,
  unit_price   integer not null,
  size         numeric not null,
  qty          integer not null,
  gradient     jsonb not null default '{}'::jsonb
);

create index order_items_order_id_idx on public.order_items(order_id);

-- place_order(): the ONLY write path for orders. SECURITY DEFINER so guest +
-- customer checkouts pass through one gate; prices are looked up from
-- products here and never trusted from the client. Runs as the function owner
-- (table owner) so it bypasses RLS for the atomic insert, while auth.uid()
-- still reflects the calling session (null for guests).
create or replace function public.place_order(
  p_contact_name     text,
  p_contact_email    text,
  p_contact_phone    text,
  p_shipping_address jsonb,
  p_note             text,
  p_items            jsonb   -- [{ "slug": text, "size": number, "qty": int }]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item         jsonb;
  v_product      public.products%rowtype;
  v_qty          integer;
  v_size         numeric;
  v_subtotal     integer := 0;
  v_order_id     uuid;
  v_order_number text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty' using errcode = 'P0001';
  end if;
  if coalesce(btrim(p_contact_name), '') = ''
     or coalesce(btrim(p_contact_email), '') = '' then
    raise exception 'Contact name and email are required' using errcode = 'P0001';
  end if;

  v_order_number := 'SC-' || to_char(nextval('public.order_number_seq'), 'FM000000');

  insert into public.orders (
    order_number, customer_id, contact_name, contact_email, contact_phone,
    shipping_address, subtotal, total
  ) values (
    v_order_number, auth.uid(), btrim(p_contact_name), btrim(p_contact_email),
    p_contact_phone, coalesce(p_shipping_address, '{}'::jsonb), 0, 0
  ) returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty  := coalesce((v_item->>'qty')::int, 0);
    v_size := coalesce((v_item->>'size')::numeric, 0);
    if v_qty <= 0 then
      raise exception 'Invalid quantity for %', (v_item->>'slug') using errcode = 'P0001';
    end if;

    select * into v_product from public.products
      where slug = (v_item->>'slug') limit 1;
    if not found then
      raise exception 'Product % not found', (v_item->>'slug') using errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + (v_product.price * v_qty);

    insert into public.order_items (
      order_id, product_id, product_slug, product_name, brand,
      unit_price, size, qty, gradient
    ) values (
      v_order_id, v_product.id, v_product.slug, v_product.name, v_product.brand,
      v_product.price, v_size, v_qty, v_product.gradient
    );
  end loop;

  update public.orders
    set subtotal = v_subtotal, total = v_subtotal
    where id = v_order_id;

  return jsonb_build_object(
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'total', v_subtotal
  );
end;
$$;

-- RLS ----------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- No INSERT policy: direct PostgREST inserts are blocked. All order inserts
-- go through place_order() (SECURITY DEFINER). Customers read only their own
-- orders; admins read all; admins may update status.
create policy orders_select_own_or_admin on public.orders
  for select using (customer_id = auth.uid() or public.is_admin());

create policy orders_admin_update on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy order_items_select_own_or_admin on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and (o.customer_id = auth.uid() or public.is_admin())
    )
  );

-- Grants (RLS narrows further). Guests read nothing back — they rely on the
-- place_order() return value for confirmation.
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;
grant select on public.order_items to authenticated;
grant execute on function
  public.place_order(text, text, text, jsonb, text, jsonb)
  to anon, authenticated;
