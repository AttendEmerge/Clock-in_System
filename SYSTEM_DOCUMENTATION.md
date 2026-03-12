# Clock-in System — Comprehensive System Documentation

> **Purpose of this document:** Give any developer (including the original author returning after a long break) everything they need to understand how the system works, how it is built, and how to take it from development to full production deployment.

---

## Table of Contents

1. [High-Level Overview](#1-high-level-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Project Structure](#4-project-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication Flow](#6-authentication-flow)
7. [API Reference](#7-api-reference)
8. [Frontend Structure](#8-frontend-structure)
9. [Feature Walkthroughs](#9-feature-walkthroughs)
10. [User Roles and Permissions](#10-user-roles-and-permissions)
11. [Cron Jobs (Automated Tasks)](#11-cron-jobs-automated-tasks)
12. [Development Setup (Quick Start)](#12-development-setup-quick-start)
13. [Database Migrations](#13-database-migrations)
14. [Environment Variables](#14-environment-variables)
15. [Production Deployment](#15-production-deployment)
16. [Troubleshooting](#16-troubleshooting)

---

## 1. High-Level Overview

The Clock-in System is a full-stack web application that lets a company manage employee attendance. Employees clock in by scanning a rotating QR code or using a one-time token. GPS coordinates are captured from the employee's phone to verify they are at an approved location.

**Who uses it:**

| Role | What they can do |
|------|-----------------|
| **Employee** | Clock in/out (QR or token), request overtime, request leave, view personal stats |
| **Supervisor** | Everything an employee can do, plus approve overtime requests for their team |
| **HR** | Full system administration: manage users, departments, locations, tokens, leave policies, holidays, reports |

---

## 2. Architecture

```
┌──────────────────────┐         ┌──────────────────────┐         ┌───────────────┐
│   Browser (React)    │  HTTPS  │   Express API        │  TCP    │   MySQL       │
│   localhost:5173     │ ──────► │   localhost:5000      │ ──────► │   port 3306   │
│   (Vite dev server)  │  /api   │   (Node.js)          │         │               │
└──────────────────────┘         └──────────────────────┘         └───────────────┘
        │                                │
        │ Static files (prod)            │ Cron jobs run inside
        │ served by Nginx                │ the Express process
        ▼                                ▼
   Phone browser                  Auto clock-out, QR rotation,
   scans QR code                  leave status transitions,
   via LAN IP                     expired token cleanup
```

**Request flow (development):**

1. User opens `https://localhost:5173` in a browser.
2. React SPA loads. All API calls go to `/api/...`.
3. The Vite dev server proxies `/api/*` to `http://localhost:5000` (the Express backend).
4. Express processes the request, talks to MySQL, returns JSON.
5. React updates the UI.

**Request flow (production):**

1. User opens `https://clockin.yourcompany.com`.
2. Nginx serves the static frontend files from `frontend/dist/`.
3. Nginx proxies `/api/*` to the Express backend (PM2-managed).
4. Express processes the request, talks to MySQL, returns JSON.

---

## 3. Technology Stack

### Frontend

| Library | Purpose |
|---------|---------|
| React 18+ | UI framework |
| TypeScript | Type safety |
| Vite | Build tool and dev server |
| Tailwind CSS 4 | Utility-first styling |
| React Router DOM v6 | Client-side routing |
| Axios | HTTP client with interceptors |
| Recharts | Charts (attendance, department stats) |
| Leaflet + React-Leaflet | Interactive maps for location management |
| Lucide React | Icon library |
| @zxing/library | QR code scanning from camera |
| date-fns | Date formatting and manipulation |
| @vitejs/plugin-basic-ssl | Self-signed HTTPS in development (needed for GPS API) |

### Backend

| Library | Purpose |
|---------|---------|
| Node.js | Runtime |
| Express | HTTP framework |
| mysql2 | MySQL driver (promise-based) |
| jsonwebtoken | JWT creation and verification |
| bcryptjs | Password hashing |
| cookie-parser | Parse refresh token cookies |
| cors | Cross-origin resource sharing |
| node-cron | Scheduled tasks |
| qrcode | QR code image generation |
| crypto (built-in) | UUID generation, token hashing |
| dotenv | Environment variable loading |

### Database

| Technology | Version |
|-----------|---------|
| MySQL | 8.0+ or 9.x |

---

## 4. Project Structure

```
Clock-in_System/
├── backend/
│   ├── .env.example              # Environment variable template
│   ├── .env                      # Actual config (not committed)
│   ├── server.js                 # Entry point (starts Express; requires ./src/app)
│   ├── package.json
│   ├── migrations/               # SQL migration files (run in order)
│   │   ├── 001_create_tables.sql
│   │   ├── 002_seed_data.sql
│   │   ├── 003_leave_overhaul.sql
│   │   ├── 004_refresh_tokens.sql
│   │   ├── 005_leave_policies.sql
│   │   ├── 006_gps_accuracy.sql
│   │   ├── 007_token_requests.sql
│   │   └── 008_dynamic_leaves_and_holidays.sql
│   └── src/
│       ├── app.js                # Express app setup, CORS, routes
│       ├── db/
│       │   └── pool.js           # MySQL connection pool
│       ├── middleware/
│       │   └── auth.js           # JWT verify + role check
│       ├── controllers/
│       │   ├── authController.js
│       │   ├── clockController.js
│       │   ├── employeeController.js
│       │   ├── supervisorController.js
│       │   └── hrController.js
│       ├── routes/
│       │   ├── auth.js
│       │   ├── clock.js
│       │   ├── employee.js
│       │   ├── supervisor.js
│       │   └── hr.js
│       └── services/
│           ├── cronService.js    # Scheduled tasks
│           ├── flagService.js    # Clock-in flag evaluation
│           └── locationService.js# Haversine distance check
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts            # Vite config (proxy, SSL, Tailwind)
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx              # React entry point
│       ├── App.tsx               # Router and route definitions
│       ├── index.css             # Global styles (login pattern)
│       ├── context/
│       │   └── AuthContext.tsx    # Auth state management
│       ├── services/
│       │   └── api.ts            # Axios instance, interceptors, API functions
│       ├── types/
│       │   └── index.ts          # TypeScript interfaces
│       ├── components/
│       │   ├── Layout.tsx        # Sidebar, header, logout confirmation
│       │   ├── ProtectedRoute.tsx# Auth guard for routes
│       │   ├── ErrorBoundary.tsx # Catches rendering crashes
│       │   ├── HubTabs.tsx       # Reusable tab bar for hub pages
│       │   ├── Modal.tsx         # Modal dialog
│       │   ├── StatCard.tsx      # KPI card
│       │   └── Badge.tsx         # Status badge
│       └── pages/
│           ├── auth/
│           │   └── LoginPage.tsx
│           ├── MobileClockInPage.tsx
│           ├── employee/
│           │   ├── EmployeeDashboard.tsx
│           │   ├── EmployeeHistoryPage.tsx
│           │   ├── EmployeeOvertimePage.tsx
│           │   └── EmployeeLeavePage.tsx
│           ├── supervisor/
│           │   ├── SupervisorDashboard.tsx
│           │   └── SupervisorOvertimePage.tsx
│           └── hr/
│               ├── HRDashboard.tsx
│               ├── HRWorkforceHubPage.tsx    # Employees + Departments tabs
│               ├── HRAttendanceHubPage.tsx   # History + Flags + Locations + Tokens tabs
│               ├── HRLeaveHubPage.tsx        # Requests + Policy + Holidays + Schedule tabs
│               ├── HRLeaveReportPage.tsx     # Attendance + Leave + Overtime reports
│               ├── HROvertimePage.tsx
│               ├── HREmployeesPage.tsx       # (also exports HREmployeesContent)
│               ├── HRDepartmentsPage.tsx     # (also exports HRDepartmentsContent)
│               ├── HRClockHistoryPage.tsx    # (also exports HRClockHistoryContent)
│               ├── HRFlagsPage.tsx           # (also exports HRFlagsContent)
│               ├── HRLocationsPage.tsx       # (also exports HRLocationsContent)
│               ├── HRTokensPage.tsx          # (also exports HRTokensContent)
│               ├── HRLeavePage.tsx           # (also exports HRLeaveContent)
│               ├── HRLeavePolicyPage.tsx     # (also exports HRLeavePolicyContent)
│               ├── HRHolidaysPage.tsx        # (also exports HRHolidaysContent)
│               └── HRSchedulePage.tsx        # (also exports HRScheduleContent)
│
├── README.md                     # Brief project overview
├── GETTING_STARTED.md            # Step-by-step setup for beginners
└── SYSTEM_DOCUMENTATION.md       # This file
```

### HR Hub Page Pattern

Each HR sub-page (e.g. `HREmployeesPage.tsx`) exports two things:

1. **`HREmployeesContent`** — a named export containing only the page content (no Layout wrapper). This is imported by the hub page (`HRWorkforceHubPage`) and rendered inside a tab.
2. **`default export HREmployeesPage`** — wraps `HREmployeesContent` in `<Layout>`. Used by legacy routes and for standalone access.

The hub pages (`HRWorkforceHubPage`, `HRAttendanceHubPage`, `HRLeaveHubPage`) compose multiple `*Content` components with a shared `HubTabs` tab bar. The active tab is controlled via `?tab=` query parameter using `useSearchParams`.

---

## 5. Database Schema

The system uses **15 tables** in a MySQL database named `clockin_system`.

### 5.1 Core Tables

#### `users`
Stores all system users (employees, supervisors, HR).

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| name | VARCHAR(150) | NOT NULL |
| email | VARCHAR(150) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | bcrypt hash |
| role | ENUM('employee','supervisor','hr') | Default: 'employee' |
| gender | ENUM('male','female','other') | Default: 'other'. Used for gender-specific leave policies |
| department_id | INT | FK → departments(id), nullable |
| is_active | TINYINT(1) | 1 = active, 0 = soft-deleted |
| created_at, updated_at | TIMESTAMP | Auto-managed |

#### `departments`

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| name | VARCHAR(100) | NOT NULL, UNIQUE |
| description | TEXT | Optional |
| created_at, updated_at | TIMESTAMP | Auto-managed |

### 5.2 Clock-in Tables

#### `clock_events`
Every clock-in and clock-out is a row here.

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| user_id | INT | FK → users(id) |
| event_type | ENUM('clock_in','clock_out') | |
| event_timestamp | TIMESTAMP | When it happened |
| latitude | DECIMAL(10,8) | GPS lat (nullable) |
| longitude | DECIMAL(11,8) | GPS long (nullable) |
| gps_accuracy | DECIMAL(8,2) | Accuracy in meters (nullable) |
| method | ENUM('qr','token','auto_checkout') | How they clocked in |
| is_overtime | TINYINT(1) | Whether this was an overtime clock-in |
| is_flagged | TINYINT(1) | Whether this event was flagged |
| flag_reason | VARCHAR(255) | e.g. "UNEXPECTED_LOCATION", "LATE_ARRIVAL", "EARLY_DEPARTURE" |
| early_departure_reason | TEXT | Employee-provided reason when leaving significantly before end of day |
| is_unflagged | TINYINT(1) | HR dismissed the flag |
| unflagged_by | INT | FK → users(id) |
| unflagged_at | TIMESTAMP | When it was unflagged |
| token_id | INT | FK → one_time_tokens(id) |
| qr_session_id | INT | FK → qr_sessions(id) |

#### `qr_sessions`
Rotating QR codes. A new one is generated every 5 minutes (configurable).

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| token | VARCHAR(255) | UUID, encoded in QR |
| created_at | TIMESTAMP | |
| expires_at | TIMESTAMP | |
| is_valid | TINYINT(1) | |

#### `one_time_tokens`
Tokens generated for QR/clock-in flows and password resets.

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| generated_by | INT | FK → users(id) — usually the HR user (or the user themselves for password reset) |
| for_user_id | INT | FK → users(id) — the employee / account owner |
| token_hash | VARCHAR(255) | SHA-256 hash |
| plain_token | VARCHAR(20) | 8-char alphanumeric (stored for HR display for clock-in tokens) |
| token_type | ENUM('regular','overtime','password_reset') | Indicates purpose of the token |
| expires_at | TIMESTAMP | Time-limited; controlled by `TOKEN_EXPIRY_MINUTES` |
| used_at | TIMESTAMP | NULL until used |
| supervisor_approved_by | INT | FK → users(id) |
| overtime_request_id | INT | FK → overtime_requests(id) |

#### `token_requests`
Employee-initiated requests for a clock-in token (for off-site or remote work).

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| user_id | INT | FK → users(id) |
| location_id | INT | FK → acceptable_locations(id) |
| reason | TEXT | |
| status | ENUM('pending','approved','rejected') | |
| hr_id | INT | FK → users(id) |
| hr_note | TEXT | |
| token_id | INT | FK → one_time_tokens(id) — linked after approval |
| actioned_at | TIMESTAMP | |

### 5.3 Location and Schedule

#### `acceptable_locations`
GPS coordinates where employees are allowed to clock in without being flagged.

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| name | VARCHAR(150) | e.g. "Head Office" |
| latitude | DECIMAL(10,8) | |
| longitude | DECIMAL(11,8) | |
| radius_meters | INT | Default: 200 |
| added_by | INT | FK → users(id) |
| is_active | TINYINT(1) | |

#### `work_schedule`
Single-row table defining company work hours.

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| expected_start | TIME | Default: 08:00 |
| expected_end | TIME | Default: 17:00 |
| late_grace_minutes | INT | Default: 15 |
| overtime_buffer_minutes | INT | Default: 5 (extra minutes before auto clock-out) |
| updated_by | INT | FK → users(id) |

### 5.4 Overtime

#### `overtime_requests`

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| employee_id | INT | FK → users(id) |
| supervisor_id | INT | FK → users(id) |
| reason | TEXT | |
| requested_date | DATE | |
| status | ENUM('pending','supervisor_approved','hr_approved','rejected') | |
| supervisor_action_at | TIMESTAMP | |
| hr_action_at | TIMESTAMP | |
| hr_id | INT | FK → users(id) |
| rejection_reason | TEXT | |
| token_id | INT | FK → one_time_tokens(id) |

### 5.5 Leave Management

#### `leave_policies`
Company-wide defaults for each leave type. HR can add custom types.

| Column | Type | Notes |
|--------|------|-------|
| leave_type | VARCHAR(50) | Primary key (e.g. "paid", "sick", "maternity", "compassionate") |
| default_days | DECIMAL(5,1) | Days allocated per year |
| gender_applicable | ENUM('all','male','female') | Default: 'all' |
| updated_by | INT | FK → users(id) |
| updated_at | TIMESTAMP | |

#### `leave_balances`
Per-user, per-year balance for each leave type.

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| user_id | INT | FK → users(id) |
| leave_type | VARCHAR(50) | Matches leave_policies.leave_type |
| days_remaining | DECIMAL(5,1) | |
| days_allocated | DECIMAL(5,1) | Total days given |
| days_used | DECIMAL(5,1) | Days consumed |
| year | YEAR | |
| UNIQUE | (user_id, leave_type, year) | |

#### `leave_requests`

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| user_id | INT | FK → users(id) |
| leave_type | VARCHAR(50) | |
| description | TEXT | |
| start_date | DATE | |
| end_date | DATE | |
| days_requested | DECIMAL(5,1) | |
| status | ENUM('pending','approved','denied','active','completed','early_return') | |
| hr_id | INT | FK → users(id) — who reviewed it |
| hr_note | TEXT | |
| actual_return_date | DATE | For early returns |
| early_return_reason | TEXT | |
| early_return_logged_by | INT | FK → users(id) |

#### `leave_extension_requests`

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| leave_request_id | INT | FK → leave_requests(id) |
| user_id | INT | FK → users(id) |
| extra_days | DECIMAL(5,1) | |
| reason | TEXT | |
| status | ENUM('pending','approved','denied') | |
| hr_id | INT | FK → users(id) |
| hr_note | TEXT | |

### 5.6 Holidays

#### `holidays`
Dates when the company is closed. Employees are not flagged as absent on these days and regular clock-in is blocked.

| Column | Type | Notes |
|--------|------|-------|
| id | INT AUTO_INCREMENT | Primary key |
| date | DATE | UNIQUE |
| name | VARCHAR(100) | e.g. "Heritage Day" |
| description | TEXT | Optional |
| created_by | INT | FK → users(id) |

### 5.7 Sessions

#### `refresh_tokens`
Persistent login sessions.

| Column | Type | Notes |
|--------|------|-------|
| id | CHAR(36) | Primary key (UUID) |
| user_id | INT | FK → users(id) ON DELETE CASCADE |
| expires_at | TIMESTAMP | |
| created_at | TIMESTAMP | |

---

## 6. Authentication Flow

### 6.1 Login

1. User submits email + password to `POST /api/auth/login`.
2. Backend verifies credentials against `users` table (bcrypt compare).
3. On success, backend creates:
   - A **short-lived JWT access token** (default 1 hour, configurable via `JWT_EXPIRES_IN`). Contains: `id`, `name`, `email`, `role`, `department_id`.
   - A **refresh token** (UUID) stored in `refresh_tokens` table and set as an `httpOnly` cookie. Lifetime: 1 day for regular sessions, 30 days if "remember me" is checked.
4. Frontend stores the access token **in memory only** (module-level variable in `api.ts`). It is never written to `localStorage` or `sessionStorage`.

### 6.2 Authenticated Requests

Every API call goes through an Axios request interceptor that attaches the in-memory access token as `Authorization: Bearer <token>`.

### 6.3 Token Refresh

When an API call returns 401 (token expired):

1. The Axios response interceptor fires.
2. It sends `POST /api/auth/refresh` with the httpOnly cookie.
3. If the refresh token is valid and not expired, the backend returns a new access token.
4. The interceptor retries the original failed request with the new token.
5. If the refresh also fails (cookie expired, user deactivated), the interceptor clears React auth state via a callback (`setOnAuthFailed`), and `ProtectedRoute` redirects to `/login` — no hard page reload.

### 6.4 Session Restore on Page Load

When the app first loads, `AuthContext` sends a refresh request. If the cookie is valid, the user is automatically logged in. Otherwise, they see the login page.

### 6.5 Logout

1. Frontend calls `POST /api/auth/logout`.
2. Backend deletes the refresh token from the database and clears the cookie.
3. Frontend clears in-memory token and React state.
4. A confirmation dialog ("Are you sure you want to sign out?") prevents accidental logouts.

### 6.6 Password Reset Flow

There are two ways passwords are changed:

- **Self-service (user-initiated):**
  - User clicks **“Forgot your password?”** on the login page.
  - Frontend calls `POST /api/auth/forgot-password` with `{ email }`.
  - Backend:
    - Looks up the active user by email (if none, it still returns a generic success message to avoid user enumeration).
    - Generates a one-time token in `one_time_tokens` with `token_type='password_reset'` using `tokenService.generateOneTimeToken`.
    - Builds a reset URL using `FRONTEND_URL` or the request `Origin` header, e.g. `https://app/reset-password?email=...&token=...`.
    - Sends an email via `emailService.sendPasswordResetEmail(user, resetLink)`.
  - User clicks the link, which opens the frontend `/reset-password` page. That page:
    - Reads `email` and `token` from query parameters.
    - Submits `POST /api/auth/reset-password` with `{ email, token, newPassword }`.
  - Backend validates the token with `tokenService.validateAndConsumeToken(..., 'password_reset')`, checks expiry and usage, updates `users.password_hash` with a new bcrypt hash, and deletes any existing refresh tokens for that user so active sessions must log in again.

- **Admin reset (HR-initiated):**
  - HR can reset a user’s password directly via `PUT /api/hr/users/:id/reset-password` from the HR UI. This bypasses email and sets a new bcrypt hash for the user.

---

## 7. API Reference

Base URL: `/api`

### 7.1 Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login. Body: `email`, `password`, `remember_me`. Returns access token + user. |
| POST | `/auth/refresh` | No | Refresh access token using httpOnly cookie. |
| POST | `/auth/logout` | No | Logout and clear refresh token. |
| GET | `/auth/me` | Yes | Get current user profile. |
| PUT | `/auth/change-password` | Yes | Change password. Body: `currentPassword`, `newPassword`. |
| POST | `/auth/forgot-password` | No | Initiate password reset. Body: `email`. Always returns a generic success message if the request is well-formed. |
| POST | `/auth/reset-password` | No | Complete password reset. Body: `email`, `token`, `newPassword`. Validates one-time token and updates the user’s password. |

### 7.2 Clock (`/api/clock`) — All authenticated, any role

| Method | Path | Description |
|--------|------|-------------|
| GET | `/clock/qr-session` | Get current QR code (base64 image + expiry). |
| POST | `/clock/qr` | Clock in via QR. Body: `qr_token`, optional `latitude`, `longitude`, `accuracy`. Blocked on holidays. |
| POST | `/clock/token` | Clock in via one-time token. Body: `token`, optional coords. Blocked on holidays (except overtime tokens). |
| POST | `/clock/out` | Manual clock out. Body (optional): `early_departure_reason` when leaving significantly before end of day. |
| GET | `/clock/status` | Current status: clocked in/out, today's events, total minutes. |
| GET | `/clock/history` | Paginated clock history. Query: `page`, `limit`, `from`, `to`. |

### 7.3 Employee (`/api/employee`) — Roles: employee, supervisor, hr

| Method | Path | Description |
|--------|------|-------------|
| GET | `/employee/dashboard` | Dashboard data: leave balances, attendance, recent events, overtime, tokens, active leave. Auto-seeds missing leave balances from policies. |
| GET | `/employee/locations` | Active acceptable locations (for token request dropdown). |
| GET | `/employee/holidays` | Holidays for current year. |
| POST | `/employee/overtime-request` | Submit overtime request. Body: `reason`, `requested_date`. |
| GET | `/employee/overtime-requests` | List own overtime requests. |
| POST | `/employee/token-request` | Request a clock-in token. Body: `location_id`, `reason`. |
| GET | `/employee/token-requests` | List own token requests. |
| POST | `/employee/leave-request` | Submit leave request. Body: `leave_type`, `description`, `start_date`, `end_date`. |
| GET | `/employee/leave-requests` | List own leave requests with extensions. |
| PATCH | `/employee/leave-requests/:id/early-return` | Log early return. Body: `actual_return_date`, `reason`. |
| POST | `/employee/leave-requests/:id/extend` | Request leave extension. Body: `extra_days`, `reason`. |

### 7.4 Supervisor (`/api/supervisor`) — Roles: supervisor, hr

| Method | Path | Description |
|--------|------|-------------|
| GET | `/supervisor/dashboard` | Team stats, pending overtime, today's attendance. |
| GET | `/supervisor/team` | Team members with today's clock status. |
| GET | `/supervisor/overtime-requests` | Overtime requests for this supervisor's team. |
| PATCH | `/supervisor/overtime-requests/:id` | Approve/reject overtime. Body: `action`, optional `rejection_reason`. |

### 7.5 HR (`/api/hr`) — Role: hr only

#### Users
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/users` | List users. Query: `department_id`, `role`, `search`. |
| POST | `/hr/users` | Create user. Body: `name`, `email`, `password`, `role`, `department_id`, `gender`. |
| PUT | `/hr/users/:id` | Update user. |
| DELETE | `/hr/users/:id` | Soft-delete (deactivate) user. Cannot delete self. |
| PUT | `/hr/users/:id/reset-password` | Reset password. Body: `new_password`. |
| PUT | `/hr/users/:id/leave` | Update leave balance. Body: `leave_type`, `days_allocated`/`days_used`, `year`. |

#### Departments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/departments` | List with member count. |
| POST | `/hr/departments` | Create. Body: `name`, `description`. |
| PUT | `/hr/departments/:id` | Update. |
| DELETE | `/hr/departments/:id` | Delete (users unassigned). |

#### Tokens and Token Requests
| Method | Path | Description |
|--------|------|-------------|
| POST | `/hr/tokens` | Generate token. Body: `for_user_id`, `token_type`, optional `overtime_request_id`. Auto-clocks employee in. |
| GET | `/hr/tokens` | List tokens. Query: `for_user_id`, `used`. |
| GET | `/hr/token-requests` | List employee token requests. Query: `status`. |
| PATCH | `/hr/token-requests/:id` | Approve/reject. Body: `action`, `hr_note`. Approve auto-generates token and clocks employee in. |

#### Flagged Events
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/flags` | List flagged events. Query: `page`, `limit`. |
| PATCH | `/hr/flags/:id/unflag` | Dismiss flag. Optional: `add_to_acceptable_locations`, `location_name`, `radius_meters`. |

#### Locations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/locations` | List all acceptable locations. |
| POST | `/hr/locations` | Add location. Body: `name`, `latitude`, `longitude`, `radius_meters`. |
| PUT | `/hr/locations/:id` | Update location. |
| DELETE | `/hr/locations/:id` | Delete location. |

#### Work Schedule
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/schedule` | Get work schedule. |
| PUT | `/hr/schedule` | Update. Body: `expected_start`, `expected_end`, `late_grace_minutes`, `overtime_buffer_minutes`. |

#### Overtime
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/overtime-requests` | List all overtime requests. Query: `status`. |

#### Clock History
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/clock-history` | All employees' clock history. Query: `user_id`, `from`, `to`, `page`, `limit`. |

#### Leave Management
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/leave-requests` | List leave requests. Query: `status`, `user_id`, `from_date`, `to_date`. |
| PATCH | `/hr/leave-requests/:id/review` | Approve/deny. Body: `action`, `hr_note`. |
| PATCH | `/hr/leave-requests/:id/early-return` | Log early return. Body: `actual_return_date`, `reason`. |
| GET | `/hr/leave-requests/:id/extensions` | List extension requests. |
| PATCH | `/hr/leave-extensions/:id/review` | Approve/deny extension. Body: `action`, `hr_note`. |
| GET | `/hr/leave-report` | Export leave report as CSV. Query: `year`, `department_id`, `user_id`, `leave_type`, `status`. |

#### Leave Policy (dynamic types)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/leave-policy` | List all leave types and their defaults. |
| POST | `/hr/leave-policy` | Create type. Body: `leave_type`, `default_days`, `gender_applicable`. |
| PUT | `/hr/leave-policy/:type` | Update type defaults. Body: `default_days`, `gender_applicable`. |
| DELETE | `/hr/leave-policy/:type` | Delete type (blocked if active leave requests exist). |

#### Holidays
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/holidays` | List holidays. Query: `year`. |
| POST | `/hr/holidays` | Create. Body: `date`, `name`, `description`. |
| PUT | `/hr/holidays/:id` | Update. |
| DELETE | `/hr/holidays/:id` | Delete. |

#### Reports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/hr/report/attendance` | Attendance report preview. Query: `year`, `month`, `department_id`. |
| GET | `/hr/report/attendance/export` | Export attendance CSV. |
| GET | `/hr/report/overtime` | Overtime report preview. Query: `year`, `department_id`. |
| GET | `/hr/report/overtime/export` | Export overtime CSV. |

---

## 8. Frontend Structure

### 8.1 Routing Map

**Public routes** (no auth required):

| Path | Page |
|------|------|
| `/login` | Login page |
| `/mobile` | Mobile QR clock-in page (opened from phone) |
| `/` | Redirects to `/login` |

**Employee routes** (roles: employee, supervisor, hr):

| Path | Page |
|------|------|
| `/employee/dashboard` | Employee dashboard |
| `/employee/history` | Clock history |
| `/employee/overtime` | Overtime requests |
| `/employee/leave` | Leave management |

**Supervisor routes** (roles: supervisor, hr):

| Path | Page |
|------|------|
| `/supervisor/dashboard` | Supervisor dashboard |
| `/supervisor/team` | Team view |
| `/supervisor/overtime` | Overtime approvals |

**HR routes** (role: hr):

| Path | Page | Tabs |
|------|------|------|
| `/hr/dashboard` | HR dashboard | — |
| `/hr/workforce` | Workforce hub | Employees, Departments |
| `/hr/attendance` | Attendance hub | Clock History, Flagged Events, Locations, Tokens |
| `/hr/leave` | Leave hub | Requests, Policy, Holidays, Schedule |
| `/hr/overtime` | Overtime management | — |
| `/hr/reports` | Reports | Attendance, Leave, Overtime |

### 8.2 Key Components

| Component | Purpose |
|-----------|---------|
| `Layout` | App shell: sidebar nav, header with date, logout button with confirmation dialog |
| `ProtectedRoute` | Checks `user` from `AuthContext`. Redirects to `/login` if unauthenticated, `/unauthorized` if wrong role. Shows spinner during loading. |
| `ErrorBoundary` | Class component that catches render errors. Shows a "Something went wrong" page with "Try Again" and "Back to Login" buttons instead of a blank screen. |
| `HubTabs` | Reusable pill-style tab bar. Accepts `tabs`, `activeTab`, `onChange`. |
| `Modal` | Overlay dialog with title, close button, size variants (sm, md, lg). |
| `StatCard` | Dashboard KPI card with icon, label, value, optional subtitle. |
| `Badge` | Colored status label (success, warning, danger, info, neutral, purple). |

### 8.3 State Management

The app uses **React Context** for auth state and **local component state** (`useState`) for everything else. There is no Redux or other global state library.

- `AuthContext` holds: `user`, `token`, `isLoading`, `login()`, `logout()`.
- Each page fetches its own data on mount via `useEffect` and stores it in local state.

### 8.4 API Layer (`services/api.ts`)

- Creates an Axios instance with `baseURL: '/api'` and `withCredentials: true`.
- **Request interceptor**: Attaches the in-memory JWT token as `Authorization: Bearer <token>`.
- **Response interceptor**: On 401, tries a silent token refresh. On failure, clears auth state via a callback registered by `AuthContext` (no hard page reload).
- Exports one function per API endpoint (e.g. `getHRDashboard()`, `createUser()`, `clockInQR()`).

---

## 9. Feature Walkthroughs

### 9.1 QR Code Clock-in

1. **HR side**: The dashboard or any HR page can display a QR code. The backend generates a QR session (`qr_sessions` table) containing a UUID token. A new session is created every 5 minutes (configurable via `QR_ROTATION_MINUTES`).
2. **Employee side**: The employee opens their phone camera, scans the QR code. This opens the mobile clock-in page (`/mobile?t=<token>`) on the phone's browser.
3. **GPS capture**: The mobile page requests the phone's GPS coordinates via the browser Geolocation API. HTTPS is required for this (hence the `basicSsl` plugin in development).
4. **Clock-in**: The mobile page sends `POST /api/clock/qr` with the QR token and GPS coordinates.
5. **Flag evaluation**: The backend checks:
   - Is the employee within any acceptable location's radius? (Haversine distance formula, tolerance for GPS accuracy)
   - Is it a weekday and after the late grace period?
   - If either check fails, the event is flagged with a reason.
6. **Holiday check**: If today is a holiday, regular QR clock-in is blocked. The employee must use the overtime request flow instead.

### 9.2 Token Clock-in

1. **Employee requests token**: Employee submits a token request with a reason and selected location.
2. **HR approves**: HR reviews the request. On approval, a one-time token is auto-generated, the employee is auto-clocked in, and the token is linked to the request.
3. **Direct token generation**: HR can also generate tokens directly for any employee from the Tokens tab.

### 9.3 Overtime Workflow

1. Employee submits an overtime request with a reason and date.
2. The employee's supervisor approves or rejects it.
3. If supervisor approves, HR sees it in the overtime queue. HR can approve and generate an overtime token.
4. The overtime token auto-clocks the employee in as an overtime session (`is_overtime = 1`).

### 9.4 Leave Management

1. **Policy setup**: HR defines leave types (paid, sick, maternity, paternity, or any custom type) with default days and gender applicability.
2. **Balance seeding**: When an employee's dashboard loads, any missing leave balances are automatically created from the current policies.
3. **Request**: Employee selects a leave type, date range, and description. The system calculates working days (excluding weekends and holidays).
4. **Review**: HR approves or denies. On approval, the employee's balance is deducted.
5. **Extensions**: While on leave, an employee can request an extension. HR reviews it.
6. **Early return**: An employee or HR can log an early return, which credits back unused days.
7. **Status transitions** (automated via cron):
   - `approved` → `active` when `start_date` arrives
   - `active` → `completed` when `end_date` passes
   - `early_return` → `completed` when `actual_return_date` passes

### 9.5 Holiday Management

1. HR adds holiday dates (e.g. "Heritage Day", 2026-09-24) from the Leave hub, Holidays tab.
2. On holiday dates:
   - Regular QR and token clock-in is blocked (403 response with holiday message).
   - Overtime token clock-in still works.
   - Employees see a banner on their dashboard: "Today is a holiday."
   - Attendance reports exclude holidays from working day counts, so employees are not marked absent.

### 9.6 Location Management

1. HR adds acceptable locations with latitude, longitude, and radius (meters).
2. Each location has a Leaflet map popup showing its position and radius circle.
3. When an employee clocks in with GPS, the system checks if they are within any active location's radius using the Haversine formula.
4. GPS accuracy tolerance: the system accounts for phone GPS inaccuracy by adding the reported accuracy to the allowed radius.

### 9.7 Flagging System

Clock-in events can be flagged for two reasons:
- **UNEXPECTED_LOCATION**: Employee's GPS is outside all acceptable location radii.
- **LATE_ARRIVAL**: Employee clocked in after `expected_start + late_grace_minutes` on a weekday.

Flags can be combined (e.g., both late and unexpected location). HR reviews flags and can:
- Dismiss the flag (unflag).
- Optionally add the employee's location as a new acceptable location during unflagging.

### 9.8 Reports

Three report types available from the Reports page:

1. **Attendance Report**: Monthly breakdown per employee — days present, days absent (only counting past working days, not future), working days in month, total hours. Excludes holidays from working day count. Exportable as CSV.
2. **Leave Report**: Leave requests by type, status, department. Exportable as CSV.
3. **Overtime Report**: Overtime requests by status, department. Exportable as CSV.

### 9.9 Auto Clock-out

A cron job runs every minute. For each employee who is currently clocked in (non-overtime, regular session), if the current time is past `expected_end + overtime_buffer_minutes`, the system automatically inserts a `clock_out` event with `method = 'auto_checkout'`. Weekends are skipped.

---

## 10. User Roles and Permissions

| Capability | Employee | Supervisor | HR |
|-----------|----------|------------|-----|
| Clock in/out (QR, token) | Yes | Yes | Yes |
| View own dashboard and history | Yes | Yes | Yes |
| Request overtime | Yes | Yes | Yes |
| Request leave | Yes | Yes | Yes |
| Request clock-in token | Yes | Yes | Yes |
| Approve team overtime | — | Yes | Yes |
| View team stats | — | Yes | Yes |
| Manage users | — | — | Yes |
| Manage departments | — | — | Yes |
| Manage locations | — | — | Yes |
| Generate tokens | — | — | Yes |
| Approve token requests | — | — | Yes |
| Review flags | — | — | Yes |
| Review leave requests | — | — | Yes |
| Set leave policies | — | — | Yes |
| Manage holidays | — | — | Yes |
| Set work schedule | — | — | Yes |
| Export reports | — | — | Yes |
| Delete users | — | — | Yes |

---

## 11. Cron Jobs (Automated Tasks)

These run inside the backend Express process (no external scheduler needed).

| Schedule | Job | Description |
|----------|-----|-------------|
| Every 1 minute | Auto clock-out | Clocks out employees still clocked in after `expected_end + buffer`. Skips weekends and overtime sessions. |
| Every 5 minutes | QR rotation | Creates a new QR session token and invalidates old ones. Interval controlled by `QR_ROTATION_MINUTES`. |
| Daily at 00:05 | Leave transitions | Moves `approved` → `active`, `active` → `completed`, `early_return` → `completed` based on dates. Also cleans up expired refresh tokens. |

---

## 12. Development Setup (Quick Start)

### Prerequisites

- **Node.js** (LTS, v18+): https://nodejs.org
- **MySQL** (8.0+): https://dev.mysql.com/downloads/
- **A terminal**: PowerShell, Command Prompt, or VS Code terminal

### Steps

```bash
# 1. Clone or open the project
cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System"

# 2. Create the database (run from Command Prompt or MySQL Workbench)
#    PowerShell does not support < redirection; use cmd /c wrapper:
cmd /c '"C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p < "backend\migrations\001_create_tables.sql"'
cmd /c '"C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p < "backend\migrations\002_seed_data.sql"'
# ... repeat for migrations 003 through 008

# 3. Configure backend
cd backend
copy .env.example .env
# Edit .env: set DB_PASSWORD and JWT_SECRET

# 4. Install and start backend
npm install
npm run dev
# Should show: MySQL connected, Cron jobs started, Server on port 5000

# 5. In a second terminal, install and start frontend
cd frontend
npm install
npm run dev
# Should show: Vite dev server at https://localhost:5173

# 6. Open https://localhost:5173 in your browser
# Login: hr@company.com / Admin@1234
```

### Testing on Phone (LAN)

1. Find your PC's local IP: `ipconfig` → look for `192.168.x.x`.
2. Open Windows Firewall for ports 5173 and 5000:
   ```powershell
   netsh advfirewall firewall add rule name="Clock-in Dev" dir=in action=allow protocol=TCP localport=5173,5000
   ```
3. On your phone (same Wi-Fi network), open `https://192.168.x.x:5173`.
4. Accept the self-signed certificate warning.
5. Scan a QR code from the HR dashboard — it will open the mobile clock-in page on your phone.

---

## 13. Database Migrations

Migrations are plain SQL files run in order. Each is designed to be run exactly once.

| File | Description |
|------|-------------|
| `001_create_tables.sql` | Creates the database and all initial tables (users, departments, clock_events, qr_sessions, one_time_tokens, overtime_requests, acceptable_locations, work_schedule, leave_balances). |
| `002_seed_data.sql` | Inserts the default HR user (hr@company.com / Admin@1234) and a "General" department. |
| `003_leave_overhaul.sql` | Adds gender to users, allocation tracking to leave_balances, and creates leave_requests + leave_extension_requests tables. |
| `004_refresh_tokens.sql` | Creates refresh_tokens table for persistent login sessions. |
| `005_leave_policies.sql` | Creates leave_policies table with default values for paid, sick, maternity, paternity leave. |
| `006_gps_accuracy.sql` | Adds gps_accuracy column to clock_events. |
| `007_token_requests.sql` | Creates token_requests table for employee-initiated token requests. |
| `008_dynamic_leaves_and_holidays.sql` | Changes leave_type columns from ENUM to VARCHAR(50) for custom types, adds gender_applicable to policies, creates holidays table. |
| `009_early_departures.sql` | Adds `early_departure_reason` column to clock_events for recording reasons when staff leave significantly before end of day. |
| `010_password_reset_tokens.sql` | Extends `one_time_tokens.token_type` enum to include `password_reset` for email-based password reset flow. |

**How to run a migration (PowerShell):**

```powershell
cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System"
cmd /c '"C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p < "backend\migrations\008_dynamic_leaves_and_holidays.sql"'
```

Replace `9.6` with your MySQL version. Enter your MySQL root password when prompted.

**How to run a migration (MySQL Workbench):**

1. Open MySQL Workbench, connect to your server.
2. File → Open SQL Script → select the migration file.
3. Click Execute (lightning bolt icon).

---

## 14. Environment Variables

All backend configuration is in `backend/.env`.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend API port |
| `DB_HOST` | `localhost` | MySQL hostname |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | *(empty)* | MySQL password — **must be set** |
| `DB_NAME` | `clockin_system` | Database name |
| `JWT_SECRET` | *(placeholder)* | Secret for signing JWTs — **must be changed** to a long random string |
| `JWT_EXPIRES_IN` | `8h` | Access token lifetime (e.g. `1h`, `8h`, `30m`) |
| `QR_ROTATION_MINUTES` | `5` | How often the QR code regenerates |
| `TOKEN_EXPIRY_MINUTES` | `60` | How long one-time tokens are valid (including password reset tokens) |
| `FRONTEND_URL` | *(unset)* | **Optional in development** (auto-detected from request headers). **Required in production** — set to your frontend domain (e.g. `https://clockin.yourcompany.com`). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | *(unset)* | SMTP server for sending emails (password reset). If unset, emails are skipped with a warning. |
| `SMTP_USER` / `SMTP_PASS` | *(unset)* | SMTP credentials. |
| `SMTP_FROM_EMAIL` | *(unset)* | From address for outbound emails (e.g. `no-reply@yourcompany.com`). |

---

## 15. Production Deployment

### 15.1 Build the Frontend

```bash
cd frontend
npm run build
```

This creates `frontend/dist/` with optimized static files (HTML, CSS, JS). These are served by a web server (Nginx recommended).

### 15.2 Server Setup

You need a Linux server (Ubuntu recommended) with:
- Node.js 18+ installed
- MySQL 8.0+ installed or accessible remotely
- Nginx installed
- A domain name pointed to the server's IP

### 15.3 Install and Configure

```bash
# Upload project to server (e.g. /var/www/clockin/)
cd /var/www/clockin

# Install backend dependencies
cd backend
npm install --production
cp .env.example .env
# Edit .env with production values (see below)

# Build frontend
cd ../frontend
npm install
npm run build
```

**Production `.env` settings:**

```env
PORT=5000
DB_HOST=localhost          # or your DB server
DB_PORT=3306
DB_USER=clockin_app        # dedicated user (NOT root)
DB_PASSWORD=strong_password_here
DB_NAME=clockin_system
JWT_SECRET=generate_with_openssl_rand_hex_32
JWT_EXPIRES_IN=8h
QR_ROTATION_MINUTES=5
TOKEN_EXPIRY_MINUTES=60
FRONTEND_URL=https://clockin.yourcompany.com
```

### 15.4 HTTPS with Nginx

GPS geolocation **requires HTTPS** on all modern browsers.

1. **Install Certbot** for free SSL from Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d clockin.yourcompany.com
   ```

2. **Nginx configuration** (`/etc/nginx/sites-available/clockin`):

   ```nginx
   server {
       listen 443 ssl;
       server_name clockin.yourcompany.com;

       ssl_certificate     /etc/letsencrypt/live/clockin.yourcompany.com/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/clockin.yourcompany.com/privkey.pem;

       # Serve frontend static files
       root /var/www/clockin/frontend/dist;
       index index.html;

       # Proxy API requests to backend
       location /api {
           proxy_pass http://127.0.0.1:5000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # SPA fallback: any non-API, non-file request returns index.html
       location / {
           try_files $uri $uri/ /index.html;
       }
   }

   # Redirect HTTP to HTTPS
   server {
       listen 80;
       server_name clockin.yourcompany.com;
       return 301 https://$host$request_uri;
   }
   ```

3. **Enable and test:**
   ```bash
   sudo ln -s /etc/nginx/sites-available/clockin /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 15.5 Run Backend with PM2

PM2 keeps the backend running and restarts it on crashes or server reboot.

```bash
sudo npm install -g pm2

cd /var/www/clockin/backend
pm2 start server.js --name clockin-api
pm2 save
pm2 startup    # follow the printed instructions
```

Useful PM2 commands:
- `pm2 status` — see running processes
- `pm2 logs clockin-api` — view logs
- `pm2 restart clockin-api` — restart after code changes
- `pm2 stop clockin-api` — stop the backend

### 15.6 Database Security

1. **Create a dedicated MySQL user** (do not use root in production):
   ```sql
   CREATE USER 'clockin_app'@'localhost' IDENTIFIED BY 'strong_password';
   GRANT ALL PRIVILEGES ON clockin_system.* TO 'clockin_app'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. **Enable MySQL SSL** if the database is on a separate server.

3. **Regular backups**:
   ```bash
   # Add to crontab (daily at 2am):
   0 2 * * * mysqldump -u clockin_app -p'password' clockin_system > /var/backups/clockin_$(date +\%Y\%m\%d).sql
   ```

### 15.7 Production Cookie Settings

In `backend/src/controllers/authController.js`, change the cookie `secure` flag for production:

```javascript
res.cookie('refresh_token', refreshId, {
  httpOnly: true,
  sameSite: 'lax',
  secure:   true,    // ← change from false to true for HTTPS
  maxAge:   remember_me ? days * 24 * 60 * 60 * 1000 : undefined,
  path:     '/',
});
```

Consider making this conditional on an environment variable:
```javascript
secure: process.env.NODE_ENV === 'production',
```

### 15.8 Deployment Checklist

- [ ] MySQL running with dedicated user (not root)
- [ ] All migrations (001–008) executed in order
- [ ] `backend/.env` configured with production values
- [ ] `JWT_SECRET` is a unique, random 64+ character string
- [ ] `FRONTEND_URL` set to your domain
- [ ] Frontend built with `npm run build`
- [ ] Nginx configured with SSL (Let's Encrypt)
- [ ] Backend running via PM2
- [ ] Cookie `secure` flag set to `true`
- [ ] Windows firewall rules not needed on Linux server (use `ufw` if needed)
- [ ] Default HR password changed from `Admin@1234`
- [ ] Database backups configured

---

## 16. Troubleshooting

### Login Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "Invalid credentials" | Wrong email/password, or user deactivated | Check credentials. Verify user exists: `SELECT email, is_active FROM users WHERE email = '...'` |
| Redirect to login after navigating | Token refresh failed (expired cookie, backend down) | Check that the backend is running (`pm2 status`). Check browser DevTools → Network for 401 on `/api/auth/refresh`. |
| 500 on `/api/auth/refresh` | `refresh_tokens` table missing | Run migration 004: `004_refresh_tokens.sql` |
| 500 on login | Database connection failed | Check MySQL is running and `.env` credentials are correct |

### Clock-in Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "HTTPS is required for GPS" | Page loaded over HTTP | Use `https://` URL. In development, the Vite dev server uses a self-signed cert — accept the browser warning. |
| Phone can't reach the app | Firewall blocking, or wrong IP | Run `ipconfig` to find your LAN IP. Open firewall: `netsh advfirewall firewall add rule name="Clock-in Dev" dir=in action=allow protocol=TCP localport=5173,5000` |
| "Today is a holiday" blocks clock-in | Holiday is configured for today | Use the overtime request flow instead. Or remove the holiday from HR → Leave → Holidays. |
| "UNEXPECTED_LOCATION" flag | Employee is outside all acceptable locations | HR can unflag the event and optionally add the employee's location as acceptable. |
| QR code expired | More than 5 minutes since last QR generated | QR auto-refreshes. The employee should scan the latest QR. |
| Empty location dropdown (employee) | No active locations configured | HR must add at least one acceptable location from Attendance → Locations. |

### Frontend Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| Blank page after error | React component crashed | The `ErrorBoundary` should catch it — click "Try Again". If it persists, check browser console for the error. |
| Sidebar link not highlighted | Route mismatch | The sidebar uses `startsWith` matching. If adding new routes, ensure they share the same prefix as the sidebar `href`. |
| Build fails with TypeScript errors | Type mismatch or missing import | Run `npx tsc --noEmit` in the frontend folder to see all errors. |

### Database Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| "ECONNREFUSED" | MySQL not running | Start MySQL service. On Windows: Services → MySQL → Start. |
| "ER_NO_SUCH_TABLE" | Migration not run | Run the missing migration SQL file. See section 13. |
| "Data too long for column 'leave_type'" | Migration 008 not run (column is still ENUM) | Run `008_dynamic_leaves_and_holidays.sql`. |

---

*This document was last updated on March 9, 2026.*
