# batman-dev

A TanStack Start + React 19 + TypeScript web application. Uses Supabase for auth/DB, TanStack Router/Query for data and routing, Tailwind v4 + shadcn/ui for styling, and deploys to Cloudflare.

## Tech stack

- **Framework:** React 19, TanStack Start, TanStack Router, TanStack Query
- **Build:** Vite 7, TypeScript 5.8
- **Styling:** Tailwind CSS v4, shadcn/ui, Radix UI primitives
- **Forms & validation:** React Hook Form, Zod
- **Backend:** Supabase (PostgreSQL + auth)
- **Deployment:** Cloudflare (`@cloudflare/vite-plugin`, Wrangler)

## Prerequisites

- **Node.js** 18 or newer
- A package manager — either [Bun](https://bun.sh/) (a `bun.lock` is checked in) or **npm**

## Getting started

```bash
# 1. Clone and enter the project
git clone <your-repo-url>
cd batman-dev

# 2. Install dependencies
bun install
# or: npm install

# 3. Create your local env file
cp .env.example .env
# then open .env and fill in the values (see "Environment variables" below)

# 4. Start the dev server
bun run dev
# or: npm run dev
```

The app will be served by Vite (default `http://localhost:5173`).

## Environment variables

All env vars are read by Vite and must be prefixed with `VITE_`. Copy `.env.example` to `.env` and fill them in.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ID |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable (anon) key |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_API_BASE_URL` | Backend API base URL (default `http://localhost:8080/api/v1`) |
| `VITE_PCX_VERIFICATION_URL` | PCX verification endpoint |
| `VITE_PCX_IMAGE_BASE_URL` | PCX image asset base URL |
| `VITE_GOOGLE_OAUTH_CLIENT_ID` | Google OAuth client ID |

## Available scripts

| Script | Description |
| --- | --- |
| `dev` | Start the Vite dev server |
| `build` | Build for production |
| `build:dev` | Build in development mode |
| `preview` | Preview the production build locally |
| `lint` | Run ESLint |
| `format` | Run Prettier across the repo |

Run any of them with `bun run <script>` or `npm run <script>`.

## Project structure

```
src/
├── routes/         TanStack Router pages (file-based routing, auto-generated tree)
├── components/     Reusable UI components (shadcn/ui + custom)
├── services/       Business logic and API integration
├── lib/            Utilities, helpers, error handling
├── hooks/          Custom React hooks
├── integrations/   External service integrations
├── data/           Static data files
└── assets/         Static assets (images, fonts, etc.)
```

## Deployment

The app is configured for Cloudflare via `@cloudflare/vite-plugin` and Wrangler. Build with `bun run build` and deploy the output with your Cloudflare workflow of choice.
