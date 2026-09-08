create extension if not exists pgcrypto;

-- Fresh ApexAnchor schema. Back up an existing database before applying this migration.
drop table if exists public.deal_messages cascade;
drop table if exists public.deals cascade;
drop table if exists public.listings cascade;
drop table if exists public.profiles cascade;
drop table if exists public.user_roles cascade;
drop type if exists public.deal_side cascade;
drop type if exists public.deal_status cascade;
drop type if exists public.listing_status cascade;
drop type if exists public.listing_category cascade;
drop type if exists public.listing_kind cascade;
drop type if exists public.app_role cascade;

create type public.listing_kind as enum ('sale','rent');
create type public.listing_category as enum ('car','house','land','company','business_idea','office');
create type public.listing_status as enum ('pending','active','draft','sold','archived');
create type public.app_role as enum ('broker','user');
create type public.deal_side as enum ('buy','sell');
create type public.deal_status as enum ('open','negotiating','agreed','closed','declined');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now()
);
create unique index one_broker_role on public.user_roles(role) where role = 'broker';
create unique index one_role_per_user on public.user_roles(user_id, role);

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  kind public.listing_kind not null,
  category public.listing_category not null,
  title text not null check (char_length(trim(title)) between 4 and 120),
  description text not null default '',
  price numeric(14,2) not null check (price >= 0),
  currency text not null default 'USD' check (char_length(currency) between 3 and 4),
  location text not null default '',
  image_url text,
  status public.listing_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  client_id uuid not null references auth.users(id) on delete cascade,
  side public.deal_side not null,
  status public.deal_status not null default 'open',
  offer_amount numeric(14,2) check (offer_amount is null or offer_amount >= 0),
  currency text not null default 'USD',
  contact_email text,
  contact_phone text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_rental_dates check (start_date is null or end_date is null or start_date <= end_date)
);

create table public.deal_messages (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  from_broker boolean not null default false,
  body text not null check (char_length(trim(body)) between 1 and 5000),
  offer_amount numeric(14,2) check (offer_amount is null or offer_amount >= 0),
  created_at timestamptz not null default now()
);

create index listings_status_created_idx on public.listings(status, created_at desc);
create index listings_kind_category_idx on public.listings(kind, category);
create index listings_location_idx on public.listings(location);
create index listings_owner_idx on public.listings(owner_id);
create index deals_client_idx on public.deals(client_id);
create index deals_listing_idx on public.deals(listing_id);
create index deal_messages_thread_created_idx on public.deal_messages(deal_id, created_at);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id = _user_id and role = _role); $$;

create or replace function public.broker_exists()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where role = 'broker'); $$;

revoke all on function public.has_role(uuid, public.app_role) from public;
revoke all on function public.broker_exists() from public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.broker_exists() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name', '')) on conflict (id) do nothing;
  insert into public.user_roles(user_id, role) values (new.id, 'user') on conflict (user_id, role) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
create trigger profiles_touch before update on public.profiles for each row execute procedure public.touch_updated_at();
create trigger listings_touch before update on public.listings for each row execute procedure public.touch_updated_at();
create trigger deals_touch before update on public.deals for each row execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.listings enable row level security;
alter table public.deals enable row level security;
alter table public.deal_messages enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'broker'));
create policy profiles_self_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_broker_read on public.profiles for select to authenticated using (public.has_role(auth.uid(),'broker'));

create policy roles_no_client_insert on public.user_roles for insert to authenticated with check (false);
create policy roles_no_client_update on public.user_roles for update to authenticated using (false) with check (false);
create policy roles_no_client_delete on public.user_roles for delete to authenticated using (false);
create policy roles_self_read on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'broker'));

create policy listings_public_active on public.listings for select to anon, authenticated using (status = 'active');
create policy listings_owner_read on public.listings for select to authenticated using (owner_id = auth.uid() or public.has_role(auth.uid(),'broker'));
create policy listings_owner_insert on public.listings for insert to authenticated with check (owner_id = auth.uid() and status = 'pending');
create policy listings_owner_update on public.listings for update to authenticated using (owner_id = auth.uid() and status in ('pending','draft')) with check (owner_id = auth.uid() and status in ('pending','draft'));
create policy listings_broker_update on public.listings for update to authenticated using (public.has_role(auth.uid(),'broker')) with check (public.has_role(auth.uid(),'broker'));

create policy deals_client_read on public.deals for select to authenticated using (client_id = auth.uid() or public.has_role(auth.uid(),'broker'));
create policy deals_client_insert on public.deals for insert to authenticated with check (client_id = auth.uid());
create policy deals_client_update on public.deals for update to authenticated using (client_id = auth.uid() and not public.has_role(auth.uid(),'broker')) with check (client_id = auth.uid());
create policy deals_broker_update on public.deals for update to authenticated using (public.has_role(auth.uid(),'broker')) with check (public.has_role(auth.uid(),'broker'));

create policy messages_client_read on public.deal_messages for select to authenticated using (exists(select 1 from public.deals d where d.id = deal_id and (d.client_id = auth.uid() or public.has_role(auth.uid(),'broker'))));
create policy messages_client_insert on public.deal_messages for insert to authenticated with check (sender_id = auth.uid() and from_broker = false and exists(select 1 from public.deals d where d.id = deal_id and d.client_id = auth.uid()));
create policy messages_broker_insert on public.deal_messages for insert to authenticated with check (sender_id = auth.uid() and from_broker = true and public.has_role(auth.uid(),'broker') and exists(select 1 from public.deals d where d.id = deal_id));

-- Realtime publication for private message refreshes.
alter publication supabase_realtime add table public.deal_messages;

insert into storage.buckets(id, name, public) values ('listing-images','listing-images',true) on conflict (id) do nothing;
create policy listing_images_public_read on storage.objects for select using (bucket_id = 'listing-images');
create policy listing_images_authenticated_insert on storage.objects for insert to authenticated with check (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy listing_images_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]);
