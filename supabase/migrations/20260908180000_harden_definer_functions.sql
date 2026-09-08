create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.user_roles where user_id = _user_id and role = _role); $$;
create or replace function public.broker_exists()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.user_roles where role = 'broker'); $$;
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function public.prevent_client_deal_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) <> new.client_id or (select public.has_role((select auth.uid()), 'broker'::public.app_role)) then return new; end if;
  if new.status is distinct from old.status then raise exception 'Only ApexAnchor can change deal status'; end if;
  return new;
end; $$;
revoke all on function public.has_role(uuid,public.app_role) from public, anon;
revoke all on function public.broker_exists() from public, anon;
grant execute on function public.has_role(uuid,public.app_role) to authenticated;
grant execute on function public.broker_exists() to anon, authenticated;

-- Do not allow direct client-created deals to bypass the transactional RPC.
drop policy if exists deals_client_insert on public.deals;
create policy deals_client_insert on public.deals for insert to authenticated
with check (client_id = (select auth.uid()) and side = 'buy' and exists(select 1 from public.listings l where l.id = listing_id and l.status = 'active'));
