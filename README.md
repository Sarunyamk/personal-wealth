# Personal Wealth Dashboard

Static, mobile-first personal wealth dashboard built with HTML, CSS and vanilla
JavaScript. The project currently contains the Phase 0 foundation described in
`PLAN.md`; application screens start in Phase 1.

## Requirements

- Node.js 20 or newer (only for the local server and development checks)
- A current version of Chrome, Edge, Firefox or Safari

Lucide is the only current runtime dependency. Selected icons are generated into
a tracked SVG sprite, so the deployed app does not load icons from a CDN.

## Commands

```bash
npm start
npm run build
npm run assets:build
npm run icons:build
npm test
npm run lint
npm run format:check
npm run verify
```

Open `http://localhost:4173` after running `npm start`.

`npm run build` creates the static GitHub Pages artifact in `dist/`. Production
Supabase values are written to `dist/config.js` from `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY`; tracked `config.js` keeps local development
independent from production configuration.

## Architecture

- `css/variables.css`: theme and semantic design tokens
- `css/reset.css`: browser normalization and accessibility defaults
- `css/base.css`: minimal Phase 0 preview styles
- `js/domain/`: pure financial calculations and data contracts
- `js/utils/`: formatting helpers without DOM or persistence concerns
- `js/data/`: development seed fixtures; page modules must not import these directly
- `js/repositories/`: shared repository behavior and persistence adapters
- `js/services/`: use-case boundary consumed by UI code
- `js/views/`: render-only page templates
- `assets/vendor/`: generated browser bundles for static deployment
- `js/app.js`: DOM entry point
- `tests/`: Node unit and contract tests
- `supabase/`: PostgreSQL migrations, local configuration and repeatable master seed

## Supabase development

The browser continues to use local storage until authentication and RLS are ready. To validate the
database locally, start Docker Desktop, install the Supabase CLI, then run:

```bash
npx supabase start
npx supabase db reset
```

The reset must apply every migration to an empty database and run `supabase/seed.sql`. Never place a
service-role key in `config.js`, GitHub Actions, or any browser bundle.

Page modules may call services, but must not import storage adapters, seed fixtures,
or a future Supabase client. Amounts remain numeric until the presentation layer
formats them.

Local data uses a versioned document under `personal-wealth:data`. Mutations clone,
validate and persist the next document before replacing in-memory state, so a
failed storage write cannot leave the two representations out of sync.

## Naming and compatibility

- Files and JavaScript identifiers use English; user-facing copy may use Thai.
- JavaScript files use kebab-case and named exports.
- Currency amounts use finite JavaScript numbers during the local prototype. The
  Supabase phase will store them as `numeric(18,2)`.
- Dates use `YYYY-MM-DD`; timestamps use ISO 8601 UTC strings.
- Records use UUID-compatible string IDs.
- Browser target: the latest two stable releases of Chrome, Edge, Firefox and
  Safari. ES modules, CSS custom properties and `Intl` are required.

## Theme maintenance

Primitive palette values live under `--palette-*`; components should consume
semantic tokens such as `--color-surface` and `--color-text`. A future theme is
added by overriding semantic tokens on `[data-theme="theme-name"]`, without
editing component styles.
