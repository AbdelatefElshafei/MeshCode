# Distribute PS Platform

A small distributed execution demo that splits simple programming tasks across multiple worker nodes, encrypts payloads in transit, and aggregates results in an orchestrator. It also includes a Next.js front‑end with authentication (email/password and optional Google OAuth) backed by PostgreSQL.

## Repository Structure
- `client/` — Next.js App Router UI (React 19, Tailwind CSS 4). Submit code, view worker status, and see aggregated results.
- `server/` — Node/Express orchestrator. Splits test cases, encrypts payloads, dispatches to workers, aggregates results, and exposes auth endpoints.
- `worker/` — Node/Express worker nodes. Decrypt payloads and safely execute user code in a sandbox (`vm`).
- `shared/` — Shared utilities (e.g., symmetric crypto helpers for AES/DES).

## Tech Stack
- Frontend: `next@16`, `react@19`, `framer-motion`, `@monaco-editor/react`, `lucide-react`, Tailwind 4
- Orchestrator: `express@5`, `axios`, `pg`, `bcryptjs`, `jsonwebtoken`, `dotenv`
- Workers: `express@5`, `body-parser`, Node `vm`
- Database: PostgreSQL (users table is auto-created at server boot)

## Quick Start
1) Install dependencies in each package
```
cd server && npm install
cd ../worker && npm install
cd ../client && npm install
```

2) Configure the orchestrator environment
- Copy `server/.env.example` to `server/.env` and update values.
- Minimum variables:
  - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (or `DATABASE_URL`)
  - `JWT_SECRET`
- Optional OAuth:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI` (e.g., `http://localhost:3001/auth/google/callback`)
  - `CLIENT_URL` (defaults to `http://localhost:3000`)

3) Start worker nodes
- Windows (provided multi-worker script):
```
cd worker
npm run start
```
This launches workers on ports `4001–4004` using separate processes.

- Manual start (any OS):
```
node index.js 4001
node index.js 4002
node index.js 4003
node index.js 4004
# Optionally:
node index.js 4005
```

4) Start orchestrator (port 3001)
```
cd server
npm run start
```

5) Start frontend (port 3000)
```
cd client
npm run dev
# Open http://localhost:3000
```

## How It Works
- Submit code from the UI for one of two demo problems:
  - Problem 1: Sum two numbers
  - Problem 2: Multiply by two
- The orchestrator queries active workers (`/workers/count`), splits test cases into chunks, and sends encrypted payloads to `/process-chunk` on workers.
- Workers decrypt, run user code in a sandbox, and return pass/fail per case.
- The orchestrator aggregates results and responds with overall status and details to the client.

## Authentication
- Email/password endpoints:
  - `POST /auth/register`
  - `POST /auth/login`
- On successful login, the client stores a JWT in `localStorage` and redirects.
- Optional Google OAuth:
  - `GET /auth/google`
  - `GET /auth/google/callback` — exchanges the code, finds/creates the user, issues a JWT, and redirects back to the client with `?token=...`.

## API Overview
- Orchestrator (default `http://localhost:3001`):
  - `GET /workers/count` — returns `{ count }` based on health checks and port probes.
  - `POST /submit` — body `{ questionId, userCode, encryptionType }` where `encryptionType` is `AES` or `DES`. Returns aggregated results.
  - `POST /auth/register` — `{ email, password }`.
  - `POST /auth/login` — `{ email, password }`.
  - `GET /auth/google` and `GET /auth/google/callback` — OAuth flow.
- Worker (port provided via CLI):
  - `GET /health` — returns `{ ok: true, port }`.
  - `POST /process-chunk` — body `{ encryptedPayload, encryptionType }`. Decrypts and runs user code for provided test cases.

## Environment Variables (server)
Provide either discrete PG variables or `DATABASE_URL`.
- `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSLMODE`
- `DATABASE_URL` (optional, overrides discrete settings)
- `JWT_SECRET`
- `CLIENT_URL` (defaults to `http://localhost:3000`)
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (optional)
- `GOOGLE_REDIRECT_URI` (optional)

## Notes on Security
- Payload encryption uses symmetric keys in `shared/cryptoUtil.js`. These are demo keys and not suitable for production.
- `AES-256-CBC` is provided for the demo; `DES-ECB` is included only for educational comparison and should not be used in production.
- Store real secrets in environment variables and rotate keys regularly.

## Development Scripts
- Client (`client/package.json`): `dev`, `build`, `start`, `lint`
- Server (`server/package.json`): `start`
- Worker (`worker/package.json`): `start` (launches 4 workers on Windows); you may start additional workers manually with `node index.js <port>`

## Troubleshooting
- No workers detected: ensure ports `4001–4004` (and optionally `4005`) are running and not blocked by firewall.
- DB connection errors: verify `.env` values and that PostgreSQL is reachable.
- Google OAuth: set client ID/secret and redirect URI to the server URL.

## License
This demo is provided as-is for educational purposes.

