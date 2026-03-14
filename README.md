# Lingo Pulse

> Like Datadog, but for translation coverage. Know when Spanish breaks before your users do.

Lingo Pulse is a repo-based i18n monitoring app. Connect a GitHub repository, scan locale files, track coverage by locale/module, and surface translation quality issues before release.

## Quick Start

```bash
npm install
cp .env.example .env.local
# Fill in env variables - see /docs for full setup guide
npm run dev
```

## Features

- GitHub sign-in and repo connection
- Locale file discovery across common repo layouts
- Coverage tracking by locale and module
- Missing key detection
- Translation quality scoring via Lingo.dev
- Scan diff with regression tracking
- Draft fix PR generation
- PR comments and risk checks
- Production incident reporting (SDK for broken translations seen by real users)
- Heatmap visualization for coverage overview
- Locale health breakdown

## Docs

See **[here](https://lingopulse-lilac.vercel.app/docs)**, for full documentation.

Includes:
- Setup guide
- How analysis works
- Webhook configuration
- SDK integration
- API reference

## Stack

- Next.js 16 + React 19
- Supabase Auth + Postgres
- GitHub OAuth
- Lingo.dev SDK

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

## Production Incident Monitoring

Lingo Pulse now supports a small production reporting flow for broken translations:

- raw keys rendered to users
- placeholder leaks like `{user_name}`
- empty translations
- explicit fallback-locale renders

The dashboard stores these as live incidents and can still route you into a draft fix PR.

### How To Use It

1. Open a connected repo in the dashboard.
2. In the `Live Incidents` panel, copy the `repoId` and `ingestKey` shown in the SDK snippet.
3. Add the SDK to the frontend app you want to monitor.
4. Report broken translations with `inspect(...)` or wrap your translator.
5. Set a distinct `appVersion` per app or surface so the incident feed shows which SDK source reported the issue.

### Example

```ts
import { LingoPulse } from '@/lib/sdk/lingopulse';

const pulse = new LingoPulse({
  repoId: 'your-repo-id',
  ingestKey: 'your-public-ingest-key',
  apiBase: 'https://your-lingopulse-app.vercel.app',
  appVersion: 'web@1.4.2',
});

const t = pulse.wrapTranslator(i18n.t.bind(i18n), (key: string) => ({
  locale: i18n.language,
  route: window.location.pathname,
  translationKey: key,
}));
```

Or call `inspect` directly:

```ts
const label = pulse.inspect(i18n.t('checkout.pay_now'), {
  locale: i18n.language,
  route: window.location.pathname,
  translationKey: 'checkout.pay_now',
});
```

Plain HTML / JS apps can use the browser build too:

```html
<script src="https://your-lingopulse-app.vercel.app/lingopulse-browser.js"></script>
<script>
  const pulse = new window.LingoPulse({
    repoId: 'your-repo-id',
    ingestKey: 'your-public-ingest-key',
    apiBase: 'https://your-lingopulse-app.vercel.app',
  });

  pulse.inspect('checkout.pay_now', {
    locale: 'ja',
    route: '/checkout',
    translationKey: 'checkout.pay_now',
  });
</script>
```

## Deploy

Deploy to Vercel, add environment variables, run Supabase migrations, and update Auth redirect URLs.

## Screenshots

![Landing](public/screenshots/landing.png)
![Dashboard](public/screenshots/dashboard.png)
![Scan Diff](public/screenshots/scan-diff.png)
![SDK Setup](public/screenshots/sdk.png)
![Connect](public/screenshots/connect.png)
