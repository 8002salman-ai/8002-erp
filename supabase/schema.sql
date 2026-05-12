-- =========================================================
-- 8002 ERP Accounting System - Supabase/Postgres Schema
-- =========================================================
-- How to apply:
-- 1) Supabase Dashboard → SQL editor → New query → paste & run
-- 2) Or use Supabase CLI migrations later

-- Extensions
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- Helper: updated_at trigger
-- ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Profiles (maps auth.users → app profile)
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'ADMIN', -- ADMIN | VA (simple)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Settings (single-tenant by default)
-- ---------------------------------------------------------
create table if not exists public.settings (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null default '8002 ERP',
  state text not null default 'CA',
  tax_rate numeric not null default 0.0725,
  business_structure text not null default 'llc',
  filing_status text not null default 'single',
  business_company_number text,
  business_address text,
  business_phone text,
  business_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

-- Keep exactly one row (simple beginner-friendly single-tenant)
create unique index if not exists settings_singleton_idx on public.settings ((true));

-- ---------------------------------------------------------
-- Team members (app-level user management)
-- Note: auth handles login; this stores VA configuration.
-- ---------------------------------------------------------
create table if not exists public.team_members (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text not null,
  role text not null default 'VA', -- ADMIN | VA
  phone text,
  address text,
  commission_type text not null default 'fixed',
  commission_rate numeric not null default 0,
  commission_base text not null default 'net_profit',
  fixed_salary numeric,
  status text not null default 'active',
  join_date timestamptz not null default now(),
  notes text,
  permissions jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists team_members_email_idx on public.team_members (lower(email));

create trigger set_team_members_updated_at
before update on public.team_members
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Inventory items
-- ---------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default uuid_generate_v4(),
  sku text not null,
  product_name text not null,
  category text,
  brand text,
  supplier text,
  supplier_link text,
  condition text not null default 'new',
  color text,
  size text,
  weight text,
  dimensions text,
  upc text,
  asin text,
  storage_location text,
  cost_per_unit numeric not null default 0,
  current_stock integer not null default 0,
  low_stock_threshold integer not null default 5,
  total_bought integer not null default 0,
  total_sold integer not null default 0,
  last_restocked timestamptz,
  tags text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inventory_items_sku_idx on public.inventory_items (sku);

create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Sales
-- ---------------------------------------------------------
create table if not exists public.sales (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  delivery_date date,
  product_name text not null,
  order_number text not null,
  customer_name text not null,
  customer_address text,
  tracking_number text,
  buying_account text not null,
  marketplace text not null,
  delivery_status text not null default 'pending',
  quantity integer not null default 1,
  product_cost numeric not null default 0,
  stock_item_price numeric not null default 0,
  sale_amount numeric not null default 0,
  marketplace_fee numeric not null default 0,
  sales_tax numeric not null default 0,
  shipping_cost numeric not null default 0,
  third_pl_cost numeric not null default 0,
  other_expenses numeric not null default 0,
  net_profit numeric not null default 0,
  gross_profit numeric not null default 0,
  profit_margin numeric not null default 0,
  inventory_item_id uuid references public.inventory_items(id) on delete set null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sales_date_idx on public.sales (date desc);
create index if not exists sales_order_number_idx on public.sales (order_number);

create trigger set_sales_updated_at
before update on public.sales
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Purchases
-- ---------------------------------------------------------
create table if not exists public.purchases (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  product_name text not null,
  supplier text not null,
  invoice_number text,
  quantity integer not null default 1,
  unit_cost numeric not null default 0,
  total_cost numeric not null default 0,
  shipping_cost numeric not null default 0,
  import_fees numeric not null default 0,
  other_charges numeric not null default 0,
  total_purchase_cost numeric not null default 0,
  cost_per_unit numeric not null default 0,
  invoice_url text,
  documents jsonb,
  payment_method text not null default 'Other',
  payment_status text not null default 'paid',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_date_idx on public.purchases (date desc);

create trigger set_purchases_updated_at
before update on public.purchases
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Expenses
-- ---------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  date date not null,
  category text not null,
  description text not null,
  amount numeric not null default 0,
  recurring boolean not null default false,
  frequency text,
  payment_method text,
  receipt_url text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_date_idx on public.expenses (date desc);

create trigger set_expenses_updated_at
before update on public.expenses
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Stock movements
-- ---------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default uuid_generate_v4(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete cascade,
  type text not null,
  quantity integer not null,
  reference_id uuid,
  reference_type text,
  notes text,
  date timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_item_idx on public.stock_movements (inventory_item_id, date desc);

-- =========================================================
-- Row Level Security (beginner-friendly single-tenant)
-- Policy: any authenticated user can read/write all rows.
-- If you later need per-company separation, we’ll add org_id + org_members.
-- =========================================================
alter table public.profiles enable row level security;
alter table public.settings enable row level security;
alter table public.team_members enable row level security;
alter table public.inventory_items enable row level security;
alter table public.sales enable row level security;
alter table public.purchases enable row level security;
alter table public.expenses enable row level security;
alter table public.stock_movements enable row level security;

-- Profiles: user can select/update own profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Singleton-style app tables: allow authenticated full access
do $$
begin
  -- settings
  execute 'drop policy if exists "settings_all_auth" on public.settings';
  execute 'create policy "settings_all_auth" on public.settings for all to authenticated using (true) with check (true)';

  -- team_members
  execute 'drop policy if exists "team_members_all_auth" on public.team_members';
  execute 'create policy "team_members_all_auth" on public.team_members for all to authenticated using (true) with check (true)';

  -- inventory_items
  execute 'drop policy if exists "inventory_items_all_auth" on public.inventory_items';
  execute 'create policy "inventory_items_all_auth" on public.inventory_items for all to authenticated using (true) with check (true)';

  -- sales
  execute 'drop policy if exists "sales_all_auth" on public.sales';
  execute 'create policy "sales_all_auth" on public.sales for all to authenticated using (true) with check (true)';

  -- purchases
  execute 'drop policy if exists "purchases_all_auth" on public.purchases';
  execute 'create policy "purchases_all_auth" on public.purchases for all to authenticated using (true) with check (true)';

  -- expenses
  execute 'drop policy if exists "expenses_all_auth" on public.expenses';
  execute 'create policy "expenses_all_auth" on public.expenses for all to authenticated using (true) with check (true)';

  -- stock_movements
  execute 'drop policy if exists "stock_movements_all_auth" on public.stock_movements';
  execute 'create policy "stock_movements_all_auth" on public.stock_movements for all to authenticated using (true) with check (true)';
end $$;

