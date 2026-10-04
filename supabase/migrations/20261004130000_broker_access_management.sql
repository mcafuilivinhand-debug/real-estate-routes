-- Allow the current broker to delegate broker access to existing ApexAnchor accounts.
-- Broker access remains controlled by the database; ordinary users cannot edit user_roles.
drop index if exists public.one_broker_role;

create or replace function public.grant_broker_access(p_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_target uuid;
begin
  if v_actor is null or not public.has_role(v_actor, 'broker'::public.app_role) then
    raise exception 'Only an authorised broker can grant broker access';
  end if;
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Enter an email address';
  end if;
  select u.id into v_target
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
  limit 1;
  if v_target is null then
    raise exception 'No ApexAnchor account exists for this email. Ask the person to register first.';
  end if;
  insert into public.user_roles(user_id, role)
  values (v_target, 'broker'::public.app_role)
  on conflict (user_id, role) do nothing;
  return v_target;
end;
$$;

create or replace function public.revoke_broker_access(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := (select auth.uid());
  v_count integer;
begin
  if v_actor is null or not public.has_role(v_actor, 'broker'::public.app_role) then
    raise exception 'Only an authorised broker can revoke broker access';
  end if;
  if p_user_id = v_actor then
    raise exception 'You cannot revoke your own broker access';
  end if;
  select count(*) into v_count from public.user_roles
  where role = 'broker'::public.app_role and user_id <> p_user_id;
  if v_count < 1 then
    raise exception 'At least one broker must remain';
  end if;
  delete from public.user_roles
  where user_id = p_user_id and role = 'broker'::public.app_role;
  return found;
end;
$$;

create or replace function public.list_broker_access()
returns table(user_id uuid, email text, granted_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select r.user_id, u.email::text, r.created_at
  from public.user_roles r
  join auth.users u on u.id = r.user_id
  where r.role = 'broker'::public.app_role
    and public.has_role((select auth.uid()), 'broker'::public.app_role)
  order by r.created_at asc;
$$;

revoke all on function public.grant_broker_access(text) from public, anon;
revoke all on function public.revoke_broker_access(uuid) from public, anon;
revoke all on function public.list_broker_access() from public, anon;
grant execute on function public.grant_broker_access(text) to authenticated;
grant execute on function public.revoke_broker_access(uuid) to authenticated;
grant execute on function public.list_broker_access() to authenticated;
