-- Extensions ---------------------------------------------------------------
create extension if not exists pgcrypto;

-- profiles -----------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  role       text not null default 'customer' check (role in ('admin','customer')),
  created_at timestamptz not null default now()
);

-- products -----------------------------------------------------------------
create table public.products (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  name           text not null,
  brand          text not null,
  category       text not null,
  price          integer not null,
  original_price integer,
  availability   text not null default 'On Hand',
  colorway       text,
  rating         numeric(2,1) not null default 0,
  reviews        integer not null default 0,
  authentic      boolean not null default true,
  tagline        text,
  description    text,
  sizes          jsonb not null default '[]'::jsonb,
  gradient       jsonb not null default '{}'::jsonb,
  featured       boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- updated_at maintenance ---------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- is_admin(): security definer avoids recursive RLS on profiles ------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- auto-create a profile row when an auth user is created -------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS ----------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;

-- profiles: a user reads own row; admins read all. No self-update in Phase 1
-- (prevents role self-escalation; customer profile editing arrives Phase 3).
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

-- products: public read; admin-only writes.
create policy products_public_read on public.products
  for select using (true);

create policy products_admin_insert on public.products
  for insert with check (public.is_admin());

create policy products_admin_update on public.products
  for update using (public.is_admin()) with check (public.is_admin());

create policy products_admin_delete on public.products
  for delete using (public.is_admin());

-- Grants (RLS is the ceiling narrower; roles still need table privileges) --
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.profiles to authenticated;
