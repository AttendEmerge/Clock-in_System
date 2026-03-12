# Clock-in System

A full-stack employee clock-in system with QR scanning, GPS location validation, overtime management, and HR administration.

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
| `FRONTEND_URL` | Frontend origin for CORS (default: http://localhost:5173) |
