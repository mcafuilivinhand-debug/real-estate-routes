create or replace function public.prevent_client_deal_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() <> new.client_id or public.has_role(auth.uid(),'broker') then return new; end if;
  if new.status is distinct from old.status then raise exception 'Only ApexAnchor can change deal status'; end if;
  return new;
end; $$;
drop trigger if exists deals_client_status_guard on public.deals;
create trigger deals_client_status_guard before update on public.deals for each row execute procedure public.prevent_client_deal_status_change();
