-- ============================================================
-- Bestelsysteem SaaS — Multi-tenant schema
-- ============================================================
-- This is the SaaS multi-tenant version of the restaurant
-- digital ordering system. Each restaurant is a tenant,
-- identified by tenants.id (uuid). All data tables carry a
-- tenant_id foreign key so rows are scoped per restaurant.
--
-- Business model:
--   - EUR 50/month subscription
--   - EUR 0.10/order commission (tracked in order_commissions)
--   - EUR 50 one-time setup fee
--
-- Designed to run on a fresh Supabase project.
-- No seed data — that is handled separately.
-- ============================================================


-- ============================================================
-- 1. ENUMS
-- ============================================================

create type visit_type     as enum ('drinks', 'borrel', 'diner');
create type session_status as enum ('open', 'awaiting_payment', 'closed');
create type order_station  as enum ('kitchen', 'bar');
create type order_status   as enum ('nieuw', 'in_bereiding', 'gereed', 'uitgeserveerd');
create type request_kind   as enum ('afrekenen', 'servetten', 'bestek', 'vraag');
create type request_status as enum ('open', 'afgehandeld');
create type review_route   as enum ('intern', 'google');


-- ============================================================
-- 2. TENANTS
-- ============================================================

create table tenants (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  slug                text        not null unique,
  owner_email         text        not null,
  table_count         int         not null default 10,
  google_place_id     text,
  subscription_status text        not null default 'trial',
  created_at          timestamptz not null default now()
);

comment on table tenants is
  'Each row represents one restaurant (tenant). slug is used in URLs, e.g. hapas-noordwijk.';
comment on column tenants.subscription_status is
  'One of: trial, active, paused, cancelled.';


-- ============================================================
-- 3. CATEGORIES
-- ============================================================

create table categories (
  id                     uuid          primary key default gen_random_uuid(),
  tenant_id              uuid          not null references tenants(id),
  name                   text          not null,
  emoji                  text          not null default '🍽️',
  is_food                boolean       not null default true,
  counts_toward_minimum  boolean       not null default false,
  sort_order             int           not null default 0,
  created_at             timestamptz   not null default now()
);

create index idx_categories_tenant on categories(tenant_id);


-- ============================================================
-- 4. PRODUCTS
-- ============================================================

create table products (
  id          uuid          primary key default gen_random_uuid(),
  tenant_id   uuid          not null references tenants(id),
  category_id uuid          not null references categories(id),
  name        text          not null,
  price       numeric(10,2) not null default 0,
  price_cents int           not null default 0,
  description text          not null default '',
  allergens   text[]        not null default '{}',
  photo_url   text,
  emoji       text          not null default '🍽️',
  station     order_station not null default 'kitchen',
  active      boolean       not null default true,
  available   boolean       not null default true,
  sort_order  int           not null default 0,
  created_at  timestamptz   not null default now()
);

create index idx_products_tenant   on products(tenant_id);
create index idx_products_category on products(category_id);


-- ============================================================
-- 5. SESSIONS (table visits)
-- ============================================================

create table sessions (
  id                 uuid           primary key default gen_random_uuid(),
  tenant_id          uuid           not null references tenants(id),
  table_code         text,
  table_number       int            not null,
  visit_type         visit_type     not null default 'diner',
  status             session_status not null default 'open',
  guest_count        int            not null default 1,
  party_size         int            not null default 1,
  opened_at          timestamptz    not null default now(),
  created_at         timestamptz    not null default now(),
  closed_at          timestamptz,
  round_count        int            not null default 0,
  last_food_order_at timestamptz,
  review_done        boolean        not null default false
);

create index idx_sessions_tenant on sessions(tenant_id);
create index idx_sessions_status on sessions(status);


-- ============================================================
-- 6. ORDERS
-- ============================================================

create table orders (
  id           uuid          primary key default gen_random_uuid(),
  tenant_id    uuid          not null references tenants(id),
  session_id   uuid          not null references sessions(id),
  table_number int           not null default 0,
  station      order_station not null default 'kitchen',
  round        int           not null default 1,
  round_number int,
  status       order_status  not null default 'nieuw',
  note         text,
  party_size   int           not null default 1,
  visit_type   visit_type    not null default 'diner',
  items        jsonb         not null default '[]',
  created_at   timestamptz   not null default now(),
  ready_at     timestamptz,
  served_at    timestamptz
);

create index idx_orders_tenant  on orders(tenant_id);
create index idx_orders_session on orders(session_id);
create index idx_orders_status  on orders(status);


-- ============================================================
-- 7. ORDER ITEMS (unchanged — linked via order)
-- ============================================================

create table order_items (
  id         uuid          primary key default gen_random_uuid(),
  order_id   uuid          not null references orders(id),
  product_id uuid          not null references products(id),
  quantity   int           not null default 1,
  note       text,
  created_at timestamptz   not null default now()
);

create index idx_order_items_order on order_items(order_id);


-- ============================================================
-- 8. SERVICE REQUESTS
-- ============================================================

create table service_requests (
  id           uuid           primary key default gen_random_uuid(),
  tenant_id    uuid           not null references tenants(id),
  session_id   uuid           not null references sessions(id),
  table_number int            not null default 0,
  kind         request_kind   not null,
  status       request_status not null default 'open',
  message      text,
  note         text,
  created_at   timestamptz    not null default now()
);

create index idx_service_requests_tenant on service_requests(tenant_id);
create index idx_service_requests_status on service_requests(status);


-- ============================================================
-- 9. REVIEWS
-- ============================================================

create table reviews (
  id           uuid         primary key default gen_random_uuid(),
  tenant_id    uuid         not null references tenants(id),
  session_id   uuid         not null references sessions(id),
  table_number int          not null default 0,
  rating       int          not null check (rating >= 1 and rating <= 5),
  stars        int,
  comment      text,
  feedback     text,
  contact      text,
  route        review_route not null default 'intern',
  routed       review_route not null default 'intern',
  created_at   timestamptz  not null default now()
);

create index idx_reviews_tenant on reviews(tenant_id);


-- ============================================================
-- 10. SETTINGS (one row per tenant)
-- ============================================================

create table settings (
  id                              uuid    primary key default gen_random_uuid(),
  tenant_id                       uuid    not null unique references tenants(id),
  round_interval_min              int     not null default 10,
  min_dishes_per_person_round1    int     not null default 1,
  drinks_bypass_timer             boolean not null default true,
  review_threshold                int     not null default 4,
  review_mode                     text    not null default 'always',
  google_review_url               text,
  staff_pin                       text,
  restaurant_name                 text
);

create index idx_settings_tenant on settings(tenant_id);

comment on column settings.review_threshold is
  'Minimum star rating to redirect guest to Google review.';
comment on column settings.review_mode is
  'When to show review prompt: always, after_payment, never.';


-- ============================================================
-- 11. ORDER COMMISSIONS (SaaS billing tracking)
-- ============================================================

create table order_commissions (
  id          uuid        primary key default gen_random_uuid(),
  tenant_id   uuid        not null references tenants(id),
  order_id    uuid        not null references orders(id),
  amount_cents int        not null default 10,
  created_at  timestamptz not null default now()
);

create index idx_order_commissions_tenant on order_commissions(tenant_id);
create index idx_order_commissions_order  on order_commissions(order_id);

comment on table order_commissions is
  'Tracks the EUR 0.10 per-order commission for SaaS billing.';


-- ============================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================
-- TODO: Replace these permissive allow-all policies with
-- proper tenant-scoped policies using auth.jwt() claims once
-- authentication is wired up. For now, all rows are accessible
-- so the app works during development.
-- ============================================================

alter table tenants          enable row level security;
alter table categories       enable row level security;
alter table products         enable row level security;
alter table sessions         enable row level security;
alter table orders           enable row level security;
alter table order_items      enable row level security;
alter table service_requests enable row level security;
alter table reviews          enable row level security;
alter table settings         enable row level security;
alter table order_commissions enable row level security;

-- Permissive allow-all policies (development only)

create policy "allow all on tenants"          on tenants          for all using (true) with check (true);
create policy "allow all on categories"       on categories       for all using (true) with check (true);
create policy "allow all on products"         on products         for all using (true) with check (true);
create policy "allow all on sessions"         on sessions         for all using (true) with check (true);
create policy "allow all on orders"           on orders           for all using (true) with check (true);
create policy "allow all on order_items"      on order_items      for all using (true) with check (true);
create policy "allow all on service_requests" on service_requests for all using (true) with check (true);
create policy "allow all on reviews"          on reviews          for all using (true) with check (true);
create policy "allow all on settings"         on settings         for all using (true) with check (true);
create policy "allow all on order_commissions" on order_commissions for all using (true) with check (true);

-- TODO: Example of a proper tenant-scoped policy:
--
--   create policy "tenant isolation" on orders
--     for all
--     using ( tenant_id = (auth.jwt()->>'tenant_id')::uuid )
--     with check ( tenant_id = (auth.jwt()->>'tenant_id')::uuid );


-- ============================================================
-- 13. SUPABASE REALTIME
-- ============================================================
-- Enable realtime for tables that the frontend subscribes to
-- for live updates (kitchen display, order status, etc.)
-- ============================================================

alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;
alter publication supabase_realtime add table service_requests;
alter publication supabase_realtime add table products;
