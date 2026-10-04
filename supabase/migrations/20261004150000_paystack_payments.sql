-- Paystack payment records. Clients can read their own payment history;
-- only trusted Edge Functions (service role) can create or update payment rows.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  reference text not null unique,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null check (char_length(currency) = 3),
  status text not null default 'pending' check (status in ('pending','success','failed')),
  channel text,
  gateway_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_deal_idx on public.payments(deal_id, created_at desc);
create index if not exists payments_buyer_idx on public.payments(buyer_id, created_at desc);
alter table public.payments enable row level security;
drop policy if exists payments_read_own_or_broker on public.payments;
create policy payments_read_own_or_broker on public.payments
for select to authenticated
using (buyer_id = (select auth.uid()) or public.has_role((select auth.uid()), 'broker'::public.app_role));
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

-- Once the broker agrees a deal, its agreed amount cannot be changed by the buyer.
create or replace function public.prevent_client_deal_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) <> new.client_id
     or (select public.has_role((select auth.uid()), 'broker'::public.app_role)) then
    return new;
  end if;
  if new.status is distinct from old.status then
    raise exception 'Only ApexAnchor can change deal status';
  end if;
  if old.status = 'agreed'::public.deal_status
     and new.offer_amount is distinct from old.offer_amount then
    raise exception 'The agreed amount can only be changed by ApexAnchor';
  end if;
  if new.currency is distinct from old.currency
     or new.listing_id is distinct from old.listing_id
     or new.client_id is distinct from old.client_id then
    raise exception 'Deal payment details cannot be changed by the buyer';
  end if;
  return new;
end; $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'payments'
  ) then
    alter publication supabase_realtime add table public.payments;
  end if;
end $$;
