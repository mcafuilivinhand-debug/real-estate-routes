-- ApexAnchor broker-managed listings: customers may request consideration,
-- but only the single manually assigned broker can create or manage listings.
drop policy if exists listings_owner_insert on public.listings;
drop policy if exists listings_owner_update on public.listings;

create policy listings_broker_insert on public.listings
for insert to authenticated
with check (
  (select auth.uid()) is not null
  and public.has_role((select auth.uid()), 'broker'::public.app_role)
  and owner_id = (select auth.uid())
);

-- Disable the former customer-facing transactional seller submission RPC.
revoke all on function public.submit_listing(
  public.listing_kind, public.listing_category, text, text, numeric, text, text, text, text
) from public, anon, authenticated;
