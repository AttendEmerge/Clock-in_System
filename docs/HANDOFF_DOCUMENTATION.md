# Clock-in System — Handoff Documentation

**Purpose:** This document enables a new team to take over the Clock-in System, understand its structure, run it locally, and continue development with minimal friction. It is written for developers who will maintain, extend, or redeploy the application.

**Last updated:** March 2026

---

## Table of Contents

1. [Document Map — What to Read First](#1-document-map--what-to-read-first)
2. [System Summary](#2-system-summary)
3. [First-Day Checklist](#3-first-day-checklist)
4. [Repository and Runbooks](#4-repository-and-runbooks)
5. [Architecture at a Glance](#5-architecture-at-a-glance)
6. [Backend Deep Dive](#6-backend-deep-dive)
7. [Frontend Deep Dive](#7-frontend-deep-dive)
8. [Database and Migrations](#8-database-and-migrations)
9. [Adding New Features — Where to Touch](#9-adding-new-features--where-to-touch)
10. [Code Conventions and Patterns](#10-code-conventions-and-patterns)
11. [Testing and Quality](#11-testing-and-quality)
12. [Security and Auth](#12-security-and-auth)
13. [Known Limitations and Quirks](#13-known-limitations-and-quirks)
14. [Deployment and Operations](#14-deployment-and-operations)
15. [Contacts and Handoff Notes](#15-contacts-and-handoff-notes)

---

## 1. Document Map — What to Read First

| Document | When to use it |
|----------|----------------|
| **README.md** (project root) | Quick overview, tech stack, default login, env vars. |
| **GETTING_STARTED.md** (project root) | Step-by-step setup from zero (Node, MySQL, first run). |
| **SYSTEM_DOCUMENTATION.md** (project root) | Full system reference: schema, API, roles, cron jobs, deployment, troubleshooting. |
| **This file (docs/HANDOFF_DOCUMENTATION.md)** | Onboarding, where to add code, conventions, handoff context. |

**Suggested order for a new developer:**

1. Read **README.md** and **Section 2 (System Summary)** below.
2. Follow **GETTING_STARTED.md** to get the app running once.
3. Skim **SYSTEM_DOCUMENTATION.md** (especially Architecture, Database Schema, API Reference).
4. Use **this document** for “where do I add X?” and “how do we do Y?” and the First-Day Checklist.

---

## 2. System Summary

The **Clock-in System** is a full-stack web app for employee attendance:

- **Employees** clock in via **QR code** (with GPS) or **one-time token**; request overtime and leave; view their history.
- **Supervisors** do the same plus approve overtime for their team.
- **HR** administers users, departments, locations, work schedule, leave policies, holidays, tokens, flags, and reports.

**Tech stack:**

| Layer | Technology |
|-------|------------|
| Frontend | React 18+, TypeScript, Vite, Tailwind CSS 4, React Router, Axios |
| Backend | Node.js, Express 5, JWT + refresh-token cookies |
| Database | MySQL 8+ |
| Key libs | Leaflet (maps), Recharts (charts), @zxing (QR scan), node-cron (scheduled tasks) |

**Important:** GPS in the browser requires **HTTPS**. Development uses a self-signed certificate via `@vitejs/plugin-basic-ssl`; production must use real SSL (e.g. Nginx + Let’s Encrypt).

---

## 3. First-Day Checklist

Use this to verify your environment and access.

- [ ] **Node.js** (LTS, v18+) and **npm** installed. (`node --version`, `npm --version`)
- [ ] **MySQL** 8+ installed and running; you know the root (or app) password.
- [ ] **Repo** cloned/open at project root: `Clock-in_System/`.
- [ ] **Backend:** `backend/.env` created from `backend/.env.example`; `DB_PASSWORD` and `JWT_SECRET` set.
- [ ] **Database:** Migrations `001_create_tables.sql` through `008_dynamic_leaves_and_holidays.sql` run in order (see [Section 8](#8-database-and-migrations)).
- [ ] **Backend start:** From `backend/`, run `npm install` then `npm run dev`. Server runs on port **5000** (see `backend/server.js`).
- [ ] **Frontend start:** From `frontend/`, run `npm install` then `npm run dev`. App runs on **https://localhost:5173** (Vite + SSL).
- [ ] **Login:** Open https://localhost:5173, log in with `hr@company.com` / `Admin@1234`. You should see the HR dashboard.
- [ ] **API health:** https://localhost:5173/api/health (proxied to backend) returns `{"status":"ok",...}`.
- [ ] **Docs:** You have read README.md and GETTING_STARTED.md and skimmed SYSTEM_DOCUMENTATION.md.

If any step fails, see **GETTING_STARTED.md** Part 12 (Troubleshooting) and **SYSTEM_DOCUMENTATION.md** Section 16 (Troubleshooting).

---

## 4. Repository and Runbooks

### 4.1 Directory Layout

```
Clock-in_System/
├── backend/                    # Express API
│   ├── server.js                # Entry point (starts Express)
│   ├── .env.example             # Env template (copy to .env)
│   ├── .env                     # Not committed; local/production config
│   ├── package.json             # Scripts: npm run dev (nodemon server.js)
│   ├── migrations/              # SQL files 001–008, run in order
│   └── src/
│       ├── app.js               # Express app, CORS, routes, cron start
│       ├── db/pool.js           # MySQL connection pool
│       ├── middleware/auth.js   # JWT verify + requireRole
│       ├── routes/               # auth, clock, employee, supervisor, hr
│       ├── controllers/         # Request handlers
│       └── services/            # cronService, flagService, locationService, qrService, tokenService
├── frontend/                    # React SPA
│   ├── package.json             # Scripts: npm run dev, npm run build
│   ├── vite.config.ts           # Proxy /api → backend, SSL plugin
│   ├── index.html
│   └── src/
│       ├── main.tsx, App.tsx    # Entry and router
│       ├── context/AuthContext.tsx
│       ├── services/api.ts       # Axios instance + all API calls
│       ├── types/index.ts        # TS interfaces
│       ├── components/           # Layout, ProtectedRoute, Modal, etc.
│       └── pages/                # auth/, employee/, supervisor/, hr/
├── docs/
│   └── HANDOFF_DOCUMENTATION.md # This file
├── README.md
├── GETTING_STARTED.md
└── SYSTEM_DOCUMENTATION.md
```

### 4.2 Key Commands

| Task | Command | Where |
|------|---------|--------|
| Run backend (dev) | `npm run dev` | `backend/` |
| Run frontend (dev) | `npm run dev` | `frontend/` |
| Build frontend (prod) | `npm run build` | `frontend/` |
| Run backend (prod) | `node server.js` or PM2 (see SYSTEM_DOCUMENTATION) | `backend/` |

**Note:** Backend entry is **server.js** in the backend root, which `require('./src/app')`. There is no `src/index.js` as the main entry.

---

## 5. Architecture at a Glance

- **Browser** → React app at `https://localhost:5173` (dev) or your domain (prod).
- **API:** All requests to `/api/*` are proxied (dev) or reverse-proxied (prod) to Express on port **5000**.
- **Auth:** JWT access token (in memory only) + httpOnly refresh-token cookie. See [Section 12](#12-security-and-auth).
- **Cron jobs:** Run inside the Express process (auto clock-out, QR rotation, leave status transitions, refresh-token cleanup). Defined in `backend/src/services/cronService.js`.

For diagrams and request flow, see **SYSTEM_DOCUMENTATION.md** Section 2 (Architecture).

---

## 6. Backend Deep Dive

### 6.1 Entry and Startup

- **Entry file:** `backend/server.js` — requires `./src/app`, reads `PORT` from env (default 5000), calls `app.listen(PORT)`.
- **App setup:** `backend/src/app.js` — loads dotenv, Express, CORS, cookie-parser, JSON body parser; mounts routes under `/api/*`; starts cron jobs via `startCronJobs()`; serves `frontend/dist` in production.

### 6.2 Route → Controller Flow

Routes are in `backend/src/routes/*.js`. They use middleware `authenticate` and optionally `requireRole(...)`. Controllers live in `backend/src/controllers/*.js` and perform DB access and response formatting.

Example: `POST /api/clock/qr` → `routes/clock.js` → `authenticate` → `clockController.clockInQR` → pool query + `flagService` + insert into `clock_events`.

### 6.3 Services (Backend)

| Service | File | Purpose |
|---------|------|---------|
| cronService | `services/cronService.js` | Auto clock-out, QR rotation, leave status transitions, refresh-token cleanup. |
| flagService | `services/flagService.js` | Evaluates whether a clock-in should be flagged (e.g. UNEXPECTED_LOCATION, LATE_ARRIVAL). |
| locationService | `services/locationService.js` | Haversine distance check (is user within an acceptable location?). |
| qrService | `services/qrService.js` | Current QR session, creation of new sessions. |
| tokenService | `services/tokenService.js` | One-time token generation/validation, linking to overtime/requests. |

### 6.4 Database Access

- Single pool: `backend/src/db/pool.js` (created with `mysql2.createPool` from env).
- Controllers and services `require('../db/pool')` (or relative path) and use `pool.query()` / `pool.execute()` with parameterised queries to avoid SQL injection.

---

## 7. Frontend Deep Dive

### 7.1 Routing and Roles

- **App.tsx** defines all routes. Protected routes use `<ProtectedRoute allowedRoles={['employee','supervisor','hr']}>` (or subset).
- **ProtectedRoute** reads `user` from `AuthContext`; if no user, redirects to `/login`; if role not in `allowedRoles`, redirects to `/unauthorized`.
- **HR “hub” pages** (e.g. Workforce, Attendance, Leave) use query param `?tab=...` and render different content components (e.g. Employees, Departments) via **HubTabs** and tab state.

### 7.2 API Layer

- **Single Axios instance:** `frontend/src/services/api.ts`. `baseURL: '/api'`, `withCredentials: true`.
- **Token:** Stored in memory only; set by `setAuthToken()` after login/refresh; attached by request interceptor as `Authorization: Bearer <token>`.
- **401 handling:** Response interceptor attempts one silent refresh via `POST /api/auth/refresh` (cookie); on failure calls `setOnAuthFailed()` (registered by AuthContext) to clear user and redirect to login.
- **Exports:** One function per API endpoint (e.g. `login()`, `clockInQR()`, `getHRUsers()`). Pages import from `services/api.ts`.

### 7.3 State

- **Auth:** React Context in `context/AuthContext.tsx` — `user`, `token`, `isLoading`, `login`, `logout`. No Redux; other state is local (`useState`) or server state fetched in `useEffect`.

### 7.4 Key UI Patterns

- **Layout:** Sidebar + header (date, logout with confirmation). Logout confirmation is in `Layout.tsx`.
- **HR content components:** Many HR pages export both a default page (with `<Layout>`) and a named `*Content` component for embedding in hub tabs (see SYSTEM_DOCUMENTATION Section 4, “HR Hub Page Pattern”).

---

## 8. Database and Migrations

- **Database name:** `clockin_system` (configurable via `DB_NAME` in `.env`).
- **Migrations:** Plain SQL in `backend/migrations/`. Run in numeric order: **001** → **008**. No migration runner; run manually (e.g. MySQL CLI or Workbench). See **GETTING_STARTED.md** and **SYSTEM_DOCUMENTATION.md** Section 13.

| File | Purpose (short) |
|------|------------------|
| 001_create_tables.sql | Database + core tables (users, departments, clock_events, qr_sessions, one_time_tokens, etc.). |
| 002_seed_data.sql | Default HR user and “General” department. |
| 003_leave_overhaul.sql | Gender, leave_balances allocation, leave_requests, leave_extension_requests. |
| 004_refresh_tokens.sql | refresh_tokens table. |
| 005_leave_policies.sql | leave_policies table. |
| 006_gps_accuracy.sql | gps_accuracy on clock_events. |
| 007_token_requests.sql | token_requests table. |
| 008_dynamic_leaves_and_holidays.sql | leave_type as VARCHAR(50), gender_applicable, holidays table. |

**Creating a new migration:** Add `009_description.sql`, keep it idempotent where possible (e.g. `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` if your MySQL version supports it), and document it in SYSTEM_DOCUMENTATION and here.

---

## 9. Adding New Features — Where to Touch

Use this as a quick map so the new team knows which files to edit.

| Goal | Backend | Frontend |
|------|---------|----------|
| **New API endpoint** | Add route in appropriate `routes/*.js`, handler in `controllers/*.js`. Optionally add a service in `services/` if logic is shared. | Add a function in `services/api.ts` that calls the new endpoint. |
| **New HR page or tab** | If it needs data: new route + controller method (often in `hr.js` / `hrController.js`). | New page under `pages/hr/`; if it’s a tab, export `*Content` and add tab in the parent hub page and in `App.tsx` if needed. |
| **New employee/supervisor page** | New route under `employee.js` or `supervisor.js` and corresponding controller. | New page under `pages/employee/` or `pages/supervisor/`, add route in `App.tsx` with correct `ProtectedRoute` roles. |
| **New role or permission** | In `middleware/auth.js`, `requireRole` already takes a list; add the new role to the enum in DB and to the right route. Update seed/migrations if you add a default role. | In `App.tsx`, add the new role to `allowedRoles` where appropriate. In `types/index.ts`, extend `User.role` (and any role arrays). In `Layout.tsx` / sidebar, show/hide nav items by role. |
| **New scheduled task** | In `services/cronService.js`, add a new cron schedule and the function it calls. | N/A. |
| **Change clock-in rules (e.g. flagging)** | `services/flagService.js` (and possibly `controllers/clockController.js`). | N/A. |
| **New report or export** | New route in `routes/hr.js`, handler in `hrController.js`; return CSV or JSON as appropriate. | New report page or tab that calls the new API and displays or downloads the result. |
| **Change auth (e.g. token lifetime)** | `.env` (`JWT_EXPIRES_IN`); cookie options in `authController.js`. | No change unless you add UI for it. |

---

## 10. Code Conventions and Patterns

### 10.1 Backend (Node/Express)

- **Style:** CommonJS (`require`/`module.exports`). No TypeScript in backend.
- **Env:** All configuration via `process.env` loaded from `.env` (dotenv). No secrets in code.
- **Errors:** Controllers use `try/catch` and return appropriate HTTP status and JSON. Unhandled errors are caught by the global error handler in `app.js`.
- **SQL:** Use parameterised queries (`pool.query('SELECT ... WHERE id = ?', [id])`) to avoid injection. No raw string concatenation for user input.
- **Async:** Use async/await; pass errors to Express via `next(err)` if using middleware chains, or return from the controller.

### 10.2 Frontend (React/TypeScript)

- **Style:** Functional components, hooks. TypeScript for types; interfaces in `src/types/index.ts` or next to the component if local.
- **API:** All server communication through `services/api.ts`. No ad-hoc fetch/axios in pages.
- **Routing:** Central in `App.tsx`. Role-based access via `ProtectedRoute` and `allowedRoles`.
- **Forms:** Local state; submit via api service; show validation/error messages from API or local checks.

### 10.3 Git / Version Control

- **.env** and secrets are not committed. `.env.example` is committed with placeholder values.
- Commit after meaningful units of work (e.g. “Add leave extension API”, “Fix flag reason display”). The project does not enforce a specific branching model; document your chosen workflow (e.g. main + feature branches) for the team.

---

## 11. Testing and Quality

- **Backend:** `package.json` has a `"test"` script that currently echoes “No test specified”. Tests can be added (e.g. Jest or Mocha) and wired to `npm test`. Controllers and services are the best candidates for unit tests; use a test DB or mocks for pool.
- **Frontend:** No test runner is configured in the provided `package.json`. You can add Jest + React Testing Library and run `npm test` from `frontend/`.
- **E2E:** No Cypress/Playwright in the repo; consider adding for critical flows (login, clock-in, one HR flow).
- **Linting:** Frontend has ESLint (see `frontend/package.json` scripts). Run `npm run lint` in `frontend/` before committing. Backend has no lint script in package.json; you can add ESLint for consistency.
- **TypeScript:** Run `npx tsc --noEmit` in `frontend/` to check types without building.

---

## 12. Security and Auth

- **Passwords:** Stored as bcrypt hashes (backend). Never log or return passwords.
- **JWT:** Access token contains `id`, `name`, `email`, `role`, `department_id`. Signed with `JWT_SECRET`; expiry from `JWT_EXPIRES_IN`. Stored only in memory on the frontend.
- **Refresh token:** Stored in DB (`refresh_tokens`), sent in httpOnly cookie. Used by `POST /api/auth/refresh` to issue a new access token. On logout, the refresh token is deleted and the cookie cleared.
- **CORS:** Backend allows the frontend origin (and LAN IPs for mobile QR). Production should set `FRONTEND_URL` and restrict origins as needed.
- **Sensitive operations:** All mutation endpoints are behind `authenticate` and often `requireRole('hr')`. No privilege escalation without changing role in DB or adding new endpoints.
- **Password reset:** Users can self-service password resets via `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`. The backend issues a one-time, time-limited token (stored in `one_time_tokens` with `token_type='password_reset'`), sends a reset link by email, and invalidates existing refresh tokens on successful reset.

**Operational notes for password reset:**

- Configure SMTP via `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` in `backend/.env`. In development, if SMTP is not set, emails are skipped with a warning logged.
- Consider adding rate limiting in front of `POST /api/auth/forgot-password` if you deploy behind a generic proxy; Express middleware can also be added to throttle by IP/email.
- Monitor logs for repeated invalid/expired reset attempts, which may indicate abuse or misconfigured links.

See **SYSTEM_DOCUMENTATION.md** Section 6 (Authentication Flow) and Section 15.7 (Production cookie settings).

---

## 13. Known Limitations and Quirks

- **Backend entry:** The app is started with `node server.js` (or `nodemon server.js`). Some docs may mention `index.js`; the actual entry is **server.js** in the backend root.
- **PowerShell and MySQL:** On Windows, `< file.sql` redirection in PowerShell can be problematic. Use `cmd /c 'mysql ... < file.sql'` or run scripts in MySQL Workbench (see GETTING_STARTED.md).
- **GPS and HTTPS:** Browsers require a secure context for geolocation. Dev uses Vite’s basic-ssl plugin; production must use HTTPS.
- **Phone on LAN:** For QR clock-in from a phone, the phone must reach the dev server (e.g. https://192.168.x.x:5173). Firewall rules may be needed (see GETTING_STARTED.md); accept the self-signed cert on the phone.
- **Leave types:** After migration 008, leave types are dynamic (VARCHAR); frontend types may still list fixed strings (e.g. `'paid'|'sick'|...`). Extend TypeScript types when adding new leave types.
- **Single work schedule:** The system has one global work schedule (one row in `work_schedule`). Per-department or per-location schedules would require schema and logic changes.
- **401 on first load:** When opening the app (e.g. the login page), the frontend calls `POST /api/auth/refresh` to restore any existing session. If the user has no cookie (first visit or logged out), the backend returns 401. This is expected; the app then shows the login form. You may see "POST .../api/auth/refresh 401 (Unauthorized)" in the browser console or Network tab—this is normal and not an error.

---

## 14. Deployment and Operations

- **Build:** Frontend: `cd frontend && npm run build` → `frontend/dist/`. Backend: no build step; run with Node.
- **Production:** Serve `frontend/dist` with Nginx (or similar); reverse-proxy `/api` to the Node process. Run Node with PM2 (or similar). Use a strong `JWT_SECRET` and a dedicated DB user; set `FRONTEND_URL`; use HTTPS and set the refresh cookie `secure: true`. See **SYSTEM_DOCUMENTATION.md** Section 15 (Production Deployment) and **GETTING_STARTED.md** Part 13.
- **Backups:** Back up the MySQL database regularly (e.g. `mysqldump`). No backup automation is in the repo; document your backup and restore procedure.
- **Logs:** Backend logs to stdout (e.g. `console.log`). With PM2, use `pm2 logs`. No structured logging or log aggregation in the repo.

---

## 15. Contacts and Handoff Notes

- **Handoff from:** [Add name/team/contact if applicable]
- **Handoff to:** [Add receiving team/contact]
- **Date:** March 2026

**Additional context for the receiving team:**

- [ ] Default HR password (`Admin@1234`) should be changed in production and ideally after first login in staging.
- [ ] Any environment-specific details (e.g. staging URL, production URL, DB hosts) should be recorded in a secure, team-accessible place (not in this repo).
- [ ] If there are runbooks for incidents (e.g. “DB down”, “forgot admin password”), add them to `docs/` or your ops wiki and link from here.

**Where to ask questions:**

- Use **SYSTEM_DOCUMENTATION.md** for “how does X work?” (API, schema, flows).
- Use **GETTING_STARTED.md** for “how do I run this from scratch?”.
- Use **this document** for “where do I add code?” and “what are our conventions?”.

---

*End of Handoff Documentation.*
