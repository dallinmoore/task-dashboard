# Project guide for Claude

This is a **template repo** for vibe-coded full-stack apps: React Router v7
(Remix-style, SSR) + TypeScript + TailwindCSS, deployed as a Docker container
behind a Traefik reverse proxy.

## ⭐ Authenticated user — this is built in, always use it

**There is already a first-class way to get the current signed-in user. Never
build your own auth, login page, session store, or user-fetching code.** In
production the app runs behind Traefik's ForwardAuth proxy (Google OAuth), which
authenticates every request and forwards the user's email as the
`X-Forwarded-User` header. The plumbing for reading that is done.

### How identity flows

1. `app/auth.server.ts` → `getUser(request)` reads the trusted header. Locally
   (`NODE_ENV === "development"`), where Traefik isn't running, it falls back to
   `local-dev@paramify.com`. In production a missing header fails closed (401).
2. `app/root.tsx` calls `getUser` in its root `loader` and returns `{ user }`.
3. `app/hooks/use-user.ts` → `useUser()` exposes it to any component.

### How to use it (copy these patterns)

**In a component** — get the user anywhere, no props, fully typed:

```tsx
import { useUser } from "~/hooks/use-user"; // or relative path

function Greeting() {
  const user = useUser(); // { email: string }
  return <p>Hello, {user.email}</p>;
}
```

**In a loader/action** — when the server needs the user (e.g. for DB queries):

```ts
import { getUser } from "~/auth.server"; // or relative path

export async function loader({ request }: Route.LoaderArgs) {
  const user = getUser(request);
  // ...scope data to user.email
}
```

**To gate a route by authorization** (authenticated AND allowed), add and use a
`requireUser(request, predicate)` helper in `app/auth.server.ts` rather than
checking on the client. The server is the trust boundary.

### Rules

- The `User` type lives in `app/auth.server.ts`. Extend it there if you need
  more fields; don't redefine user shapes elsewhere.
- Anything that touches identity or secrets goes in a `*.server.ts` file so it's
  stripped from the client bundle.
- Trust `X-Forwarded-User` only because Traefik sets it. Don't expose a route
  path that bypasses the proxy.

## ⭐ Database — this is built in, always use it

**There is already a database wired up (Prisma + SQLite). Never add a different
ORM, a second database, or raw connection code.** One env var, `DATABASE_URL`,
controls where data lives — a local file in dev, a file on a persistent volume
in production. The same SQLite engine runs in both places, so there's no
dialect drift.

### How it's wired

- `prisma/schema.prisma` — the data model. **This is the file you edit to change
  what's stored.**
- `app/db.server.ts` → exports `db`, the shared Prisma client (server-only).
- `DATABASE_URL` — `file:./dev.db` locally; set in Coolify for production.

### How to use it (copy these patterns)

```ts
import { getUser } from "~/auth.server";
import { db } from "~/db.server";

export async function loader({ request }: Route.LoaderArgs) {
  const user = getUser(request);
  // Always scope queries to the user so people only see their own data.
  return { notes: await db.note.findMany({ where: { userEmail: user.email } }) };
}

export async function action({ request }: Route.ActionArgs) {
  const user = getUser(request);
  const form = await request.formData();
  await db.note.create({ data: { body: String(form.get("body")), userEmail: user.email } });
  return { ok: true };
}
```

The `Note` model in `prisma/schema.prisma` (tied to `userEmail`) is the starter
pattern — copy it to add new models, and use the loader/action snippets above
as the read/write pattern. (The home page is a generic landing page and doesn't
use the database yet — wire it in when you build your first feature.)

### Changing the schema (the workflow)

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:migrate` (prompts for a migration name). This updates the DB
   and regenerates the typed client.
3. Use the new fields/models via `db`.

`npm run db:studio` opens a visual table editor in the browser.

### Rules

- **SQLite has no `enum` or array/list column types.** For a fixed set of
  values (status, role, etc.) use a plain `String`. For a list, use a related
  model. Don't add `enum` or `String[]` fields to the schema.
- **Prefer the typed `db` API** (`db.note.findMany(...)`) over raw SQL — it's
  safer and you rarely need raw queries. If you *do* drop to raw SQL: use
  `db.$queryRaw`/`$queryRawUnsafe` for anything that returns rows (SELECT, and
  SQLite `PRAGMA`s like `journal_mode`), and `db.$executeRaw`/`$executeRawUnsafe`
  only for statements that return a row count (INSERT/UPDATE/DELETE/DDL). Using
  `$executeRaw*` on a query that returns rows throws *"Execute returned results,
  which is not allowed in SQLite"* (this is why the WAL pragma in
  `app/db.server.ts` uses `$queryRawUnsafe`).
- Production data lives on the Coolify volume; migrations run automatically on
  deploy (`prisma migrate deploy` in the `start` script). Don't run destructive
  migrations without care.
- To scale beyond SQLite later, the path is Coolify's managed Postgres: change
  the `provider` to `postgresql`, point `DATABASE_URL` at it, re-migrate.

## Project conventions

- **Routes** are configured in `app/routes.ts`; route modules export
  `loader` (server GET), `action` (server mutations), and a default component.
- **Server-only code** uses the `.server.ts` suffix.
- **Styling** is TailwindCSS.
- Run `npm run typecheck` before considering a change done. `npm run dev` starts
  the dev server at `http://localhost:5173`.
