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
- Customer asset requests are routed to the sole broker by email or WhatsApp; customers cannot create listings.
- Only the manually assigned broker can insert, publish, edit, reject, archive or sell listings.
- Broker notifications use the customer-selected email or WhatsApp channel; the broker reviews requests and enters approved listings in the private desk.
- Buyer enquiries transactionally create the private buy deal and first message.

## Routes

Public: `/`, `/browse`, `/listings/:id`, `/auth`, `/broker/apexanchor`, `/sitemap.xml`

Protected: `/sell`, `/dashboard`, `/deals`, `/deals/:id`, `/broker`

Unknown broker addresses show `Broker address not found` and link back home.


## Broker access and password recovery

- The private Broker Workspace is visually separated from the public marketplace.
- An authorised broker can grant or revoke broker access for an email that already has an ApexAnchor account. Granting access does not create a user account; invitees must register first.
- Broker access is managed by security-definer database RPCs. The browser cannot directly write to `user_roles`.
- Apply `20261004130000_broker_access_management.sql` in the Supabase SQL Editor after the earlier broker-managed listing migration.
- Password recovery uses Supabase Auth email reset links. Add this exact URL to **Authentication → URL Configuration → Redirect URLs**:
  `https://mcafuilivinhand-debug.github.io/real-estate-routes/auth?reset=1`
