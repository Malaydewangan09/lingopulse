# Lingo Pulse

Lingo Pulse is a repo-based i18n monitoring app. It connects to a GitHub repository, scans locale files, shows coverage by locale and module, and surfaces translation quality issues before release.

## About Lingo.dev

Lingo.dev is used here for translation quality scoring. Coverage tells you whether a key exists. Lingo.dev helps answer the next question: does the translated copy still read well enough to ship.

In this project, Lingo.dev powers the quality scores shown in the dashboard and helps flag strings that need review.

## About This Product

Lingo Pulse adds the workflow around that scoring:

- GitHub sign-in and repo connection
- locale file discovery across common repo layouts
- coverage tracking by locale and module
- missing key detection
- translation quality scoring
- dashboard views for scans, regressions, and PR risk

Each signed-in user only sees the repos connected to their own account.

## Stack

- Next.js 16
- React 19
- Supabase Auth + Postgres
- GitHub OAuth
- Lingo.dev SDK

## Local Setup

1. Install dependencies

```bash
npm install
```

2. Copy the example environment file

```bash
cp .env.example .env.local
```

3. Fill in the required environment variables in `.env.local`

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LINGO_API_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `NEXT_PUBLIC_APP_URL`

4. Run the Supabase migrations in order

- `supabase/migrations/001_initial.sql`
- `supabase/migrations/002_owner_scoping.sql`

5. Configure Supabase Auth

- Enable the GitHub provider in Supabase Auth
- Add redirect URLs for:
  - `http://localhost:3000/auth/callback`
  - your deployed app URL with `/auth/callback`
- In the GitHub OAuth app, use the Supabase callback URL:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

6. Start the app

```bash
npm run dev
```

Open `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Notes

- GitHub sign-in is the best path because it unlocks the repo picker flow.
- Lingo.dev scoring depends on `LINGO_API_KEY`.
- If local and production use the same Supabase project, the same signed-in user will see the same repos in both environments.
- Use separate Supabase projects for local, staging, and production if you want full environment isolation.

## Deploy

Deploy to Vercel, add the same environment variables, run the Supabase migrations on the target database, and update Supabase Auth redirect URLs for the deployed domain.
