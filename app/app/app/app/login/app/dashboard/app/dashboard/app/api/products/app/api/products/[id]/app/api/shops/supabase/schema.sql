-- ============================================================
-- MargeX — schéma de base de données Supabase
-- ============================================================

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  shop_id uuid references shops(id) on delete cascade not null,
  name text not null,
  supplier_id uuid references suppliers(id) on delete set null,
  cost_xof numeric not null default 0,
  price_xof numeric not null default 0,
  fee_pct numeric not null default 1.95,
  stock text not null default 'en_stock' check (stock in ('en_stock','faible','rupture')),
  last_cost_xof numeric,
  margin_alert_threshold_pct numeric default 15,
  url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists cost_history (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  cost_xof numeric not null,
  recorded_at date not null default current_date
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text not null default 'gratuit' check (plan in ('gratuit','pro')),
  paystack_customer_code text,
  paystack_subscription_code text,
  status text not null default 'active' check (status in ('active','en_attente','annule')),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table shops enable row level security;
alter table suppliers enable row level security;
alter table products enable row level security;
alter table cost_history enable row level security;
alter table subscriptions enable row level security;

create policy "shops_owner" on shops for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "suppliers_owner" on suppliers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "products_owner" on products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "subscriptions_owner" on subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "cost_history_owner" on cost_history for all
  using (exists (select 1 from products p where p.id = cost_history.product_id and p.user_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = cost_history.product_id and p.user_id = auth.uid()));

create index if not exists idx_products_shop on products(shop_id);
create index if not exists idx_products_user on products(user_id);
create index if not exists idx_cost_history_product on cost_history(product_id);
