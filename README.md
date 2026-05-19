# Attendance Tracker

A full-stack attendance tracking app with QR scanning, GPS location validation, overtime management, and HR administration.

**New to the project?** See **[GETTING_STARTED.md](GETTING_STARTED.md)** for a full step-by-step setup guide (installing Node.js and MySQL, creating the database, configuring the backend, and running the app).

**Handing off or onboarding a new team?** See **[docs/HANDOFF_DOCUMENTATION.md](docs/HANDOFF_DOCUMENTATION.md)** for in-depth handoff documentation (architecture, where to add features, conventions, and operations).

## Tech Stack
- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** MySQL

## Project Structure
```
Clock-in_System/
├── backend/         # Express API server
├── frontend/        # React web app
└── README.md
```

## Setup Instructions

### 1. Database Setup
1. Install MySQL and create the database:
```bash
mysql -u root -p < backend/migrations/001_create_tables.sql
mysql -u root -p < backend/migrations/002_seed_data.sql
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env and fill in your MySQL password and a strong JWT_SECRET
npm install
npm run dev
```
The API runs on `http://localhost:5000`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The app runs on `http://localhost:5173`

## Default Login
After running the seed file:
- **Email:** `hr@company.com`
- **Password:** `Admin@1234`
- **Role:** HR Admin

## User Roles

| Role | Capabilities |
|------|-------------|
| `employee` | Clock in/out (QR or token), request overtime, view personal stats |
| `supervisor` | All employee features + approve overtime requests for their team |
| `hr` | Full system administration |

## Clock-in Methods

### QR Code
- A dynamic QR code rotates every 5 minutes (configurable)
- Employee opens the app on their phone, clicks **Scan QR**
- Camera captures GPS coordinates at time of scan
- Location is validated against the acceptable locations list

### One-Time Token
- HR generates a token for a specific employee
- Tokens expire after 60 minutes (configurable)
- Employee enters the token on their dashboard

### Password Reset
- Users who forget their password can click **“Forgot your password?”** on the login page.
- They enter their email address and, if an active account exists, the system emails a secure, time-limited reset link.
- The link opens a **Reset Password** page where they choose a new password.
- HR can still reset passwords directly for users from the HR Users screen.

## Key Features
- **Auto clock-out**: Employees are automatically clocked out at end of configured work day
- **Flagging**: Unexpected locations and late arrivals are automatically flagged for HR review
- **Overtime workflow**: Employee → Supervisor approval → HR generates overtime token
- **Location management**: HR can add/remove acceptable clock-in locations
- **Leave tracking**: Paid, sick, maternity, paternity leave balances per employee

## Environment Variables (backend/.env)

| Variable | Description |
|----------|-------------|
| `DB_HOST` | MySQL host (default: localhost) |
| `DB_PORT` | MySQL port (default: 3306) |
| `DB_USER` | MySQL username |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name (default: clockin_system) |
| `JWT_SECRET` | Secret key for JWT signing — change this! |
| `JWT_EXPIRES_IN` | Token expiry (default: 8h) |
| `QR_ROTATION_MINUTES` | How often QR rotates (default: 5) |
| `TOKEN_EXPIRY_MINUTES` | One-time token expiry (default: 60) |
| `APP_TIMEZONE` | Organization timezone for auto clock-out (e.g. `Africa/Blantyre` for Malawi; default: UTC) |
| `FRONTEND_URL` | **Required on Render** — public app URL for CORS, password-reset emails, and QR links (e.g. `https://attend-39qi.onrender.com`). Unset in local dev uses Origin or `http://localhost:5173`. |
| `RESEND_API_KEY` | (Recommended on Render) Resend.com API key for password-reset emails; avoids blocked SMTP ports. |
| `RESEND_FROM_EMAIL` | Optional. From address for Resend (e.g. `Clock-in <onboarding@resend.dev>`). |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Alternative: SMTP server for emails (often blocked on Render — use Resend instead). |
| `SMTP_USER` / `SMTP_PASS` | SMTP credentials |
| `SMTP_FROM_EMAIL` | From address when using SMTP (e.g. no-reply@yourcompany.com) |
