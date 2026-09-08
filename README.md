# ApexAnchor

A warm editorial real-estate and asset marketplace for buying, selling and renting homes, cars, land, office space, companies and business ideas. ApexAnchor has exactly one broker channel: `@apexanchor`.

## Stack

React + TypeScript + Vite, TanStack Start/Router/Query, Tailwind CSS, Zod, Supabase Auth/PostgreSQL/RLS/Realtime/Storage, and GitHub Pages.

## Supabase setup

1. Create your own Supabase project.
2. Run every SQL migration in `supabase/migrations/`.
3. Enable Email/Password in Supabase Auth. Google is optional and uses Supabase's native OAuth provider.
4. Copy `.env.example` to `.env` and fill in your own values:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

5. Manually assign the single broker role to the owner's auth user. Never expose a claim-broker UI:

```sql
insert into public.user_roles(user_id, role)
values ('OWNER_AUTH_USER_UUID', 'broker');
```

The database enforces exactly one broker role. Normal signups receive only the `user` role.

## Local development

```sh
npm ci
npm run dev
```

Production checks:

```sh
npm run typecheck
npm run lint
npm run build
```

## GitHub Pages

The repository Vite base path is `/real-estate-routes/`. The router uses `import.meta.env.BASE_URL`, and the UI uses the same build-time base for assets and auth redirects.

Add repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

The workflow runs TypeScript, lint and a production build before deploying the SPA shell. No Supabase service-role key is used in browser code.

## Security model

- Anonymous users can read active listings only.
- Clients can read only their own deals and messages.
- The broker role is database-enforced and manually assigned.
- Clients cannot insert broker messages.
- Client-side deal status changes are blocked by a database trigger.
- Seller contact details are not included in public listing queries.
- Seller submissions transactionally create a pending listing, private sell deal and first message.
- Buyer enquiries transactionally create the private buy deal and first message.

## Routes

Public: `/`, `/browse`, `/listings/:id`, `/auth`, `/broker/apexanchor`, `/sitemap.xml`

Protected: `/sell`, `/dashboard`, `/deals`, `/deals/:id`, `/broker`

Unknown broker addresses show `Broker address not found` and link back home.
