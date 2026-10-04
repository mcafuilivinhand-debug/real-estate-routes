alter table public.listings
  add column if not exists photos text[] not null default '{}';

alter table public.listings
  drop constraint if exists listings_photos_max_six;

alter table public.listings
  add constraint listings_photos_max_six
  check (cardinality(photos) <= 6);
