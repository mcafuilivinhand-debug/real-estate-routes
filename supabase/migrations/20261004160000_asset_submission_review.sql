-- Public seller asset submissions with broker-only review and publication.
create table if not exists public.asset_requests (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null check (char_length(trim(owner_name)) between 1 and 100),
  owner_phone text not null check (char_length(trim(owner_phone)) between 5 and 40),
  kind public.listing_kind not null,
  category public.listing_category not null,
  title text not null check (char_length(trim(title)) between 4 and 120),
  location text not null check (char_length(trim(location)) between 1 and 160),
  expected_price text not null default '',
  details text not null check (char_length(trim(details)) between 10 and 4000),
  photo_urls text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','published','rejected')),
  broker_note text,
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_request_photo_limit check (cardinality(photo_urls) <= 6)
);

create index if not exists asset_requests_status_created_idx
  on public.asset_requests(status, created_at desc);

create or replace function public.touch_asset_request_updated_at()
returns trigger language plpgsql
as $$ begin new.updated_at = now(); return new; end; $$;

drop trigger if exists asset_requests_touch on public.asset_requests;
create trigger asset_requests_touch
before update on public.asset_requests
for each row execute function public.touch_asset_request_updated_at();

alter table public.asset_requests enable row level security;
revoke all on public.asset_requests from public;
grant insert on public.asset_requests to anon, authenticated;
grant select, update on public.asset_requests to authenticated;

drop policy if exists asset_requests_public_submit on public.asset_requests;
create policy asset_requests_public_submit on public.asset_requests
for insert to anon, authenticated
with check (status = 'pending' and listing_id is null and broker_note is null);

drop policy if exists asset_requests_broker_read on public.asset_requests;
create policy asset_requests_broker_read on public.asset_requests
for select to authenticated
using (public.has_role((select auth.uid()), 'broker'::public.app_role));

drop policy if exists asset_requests_broker_update on public.asset_requests;
create policy asset_requests_broker_update on public.asset_requests
for update to authenticated
using (public.has_role((select auth.uid()), 'broker'::public.app_role))
with check (public.has_role((select auth.uid()), 'broker'::public.app_role));
