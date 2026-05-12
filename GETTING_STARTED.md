# Attendance Tracker — Full Setup Guide

This guide assumes you are starting from zero. Follow the steps in order. Everything happens on your own computer (Windows).

---

## Part 1: What You Need Installed

The app needs three things:

| Tool | What it does | Where to get it |
|------|--------------|-----------------|
| **Node.js** | Runs the backend and frontend build tools | https://nodejs.org — download the **LTS** version |
| **MySQL** | The database that stores users, clock-ins, etc. | https://dev.mysql.com/downloads/installer/ (Windows) or https://dev.mysql.com/downloads/mysql/ |
| **A terminal** | Where you type commands | Use **PowerShell** or **Command Prompt** (built into Windows), or the terminal inside Cursor/VS Code |

---

## Part 2: Check That Node.js and npm Are Installed

1. Open **PowerShell** or **Command Prompt**:
   - Press `Win + R`, type `powershell`, press Enter, **or**
   - In Cursor: **Terminal → New Terminal**

2. Type this and press Enter:
   ```powershell
   node --version
   ```
   You should see something like `v20.10.0` or `v22.x.x`. If you see “not recognized,” install Node.js from the link above and restart the terminal.

3. Then type:
   ```powershell
   npm --version
   ```
   You should see a number like `10.2.0`. npm is installed together with Node.js.

---

## Part 3: Install and Start MySQL

### Option A: MySQL Installer (recommended on Windows)

1. Download **MySQL Installer** from:  
   https://dev.mysql.com/downloads/installer/

2. Run the installer. When it asks which products to install, include at least:
   - **MySQL Server**
   - **MySQL Workbench** (optional but useful — a graphical tool to view the database)

3. During setup:
   - Choose a **root password** and **remember it**. You will use it in the backend `.env` file.
   - Keep the default port **3306** unless you have a reason to change it.

4. Make sure the MySQL **service** is running:
   - Open **Services** (Win + R → `services.msc` → Enter).
   - Find **MySQL** or **MySQL80** (name may vary).
   - If “Status” is not “Running,” right‑click → **Start**.

### Option B: Other MySQL setups

- If you use **XAMPP**, **WAMP**, or **Laragon**, install MySQL from their control panel and note the root password you set.
- If you use **Docker**, you can run MySQL in a container; the connection details go in `.env` (see Part 5).

---

## Part 4: Where Your Project Lives

Your project folder is:

```
C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System
```

Inside it you have:

- **backend** — the API server (Node.js + Express)
- **frontend** — the React web app
- **backend/migrations** — SQL files that create the database and tables

You will run commands from this folder (or from `backend` and `frontend`). In Cursor, open this folder as the project: **File → Open Folder →** select `Clock-in_System`.

---

## Part 5: Create the Database and Tables (MySQL Setup)

You need to run two SQL files so the app has a database and tables. You can do this from the **command line** or with **MySQL Workbench**.

### Method 1: Command line (PowerShell on Windows)

**Important:** PowerShell does **not** support `<` for input redirection. Use one of the two options below.

1. Open a terminal and go to your project root:
   ```powershell
   cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System"
   ```

2. Run the SQL files using **Command Prompt** from inside PowerShell (replace `9.6` with your MySQL version if different, e.g. `8.0`):
   ```powershell
   cmd /c '"C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p < "backend\migrations\001_create_tables.sql"'
   ```
   Type your MySQL root password when prompted, then press Enter.

3. Run the second file (creates the default HR user):
   ```powershell
   cmd /c '"C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p < "backend\migrations\002_seed_data.sql"'
   ```
   Enter your password again if prompted.

4. If both finish with no errors, the database **clockin_system** and default HR user are ready.

**Running later migrations (e.g. 003, 004, 005):** Use the same approach — **do not** use `-e "SOURCE ..."` (that only works in the interactive MySQL shell). From the project folder, run:
   ```powershell
   cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System"
   cmd /c '"C:\Program Files\MySQL\MySQL Server 9.6\bin\mysql.exe" -u root -p < "backend\migrations\005_leave_policies.sql"'
   ```
   Replace `005_leave_policies.sql` with the migration file you need. Enter your MySQL password when prompted.

**If MySQL is in a different folder:** Check `C:\Program Files\MySQL\` for a folder like `MySQL Server 8.0` or `MySQL Server 9.6`, then use that path in the commands above (the `bin` folder must contain `mysql.exe`).

### Method 2: MySQL Workbench (GUI)

1. Open **MySQL Workbench** and connect to your MySQL server (localhost, user `root`, your password).

2. **File → Open SQL Script**.

3. Go to:
   ```
   C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System\backend\migrations
   ```
   Open **001_create_tables.sql**.

4. Click the **Execute** (lightning) button to run the script.

5. Then **File → Open SQL Script** and open **002_seed_data.sql**. Execute it as well.

6. In the left sidebar, refresh the “Schemas” list; you should see **clockin_system** with tables like `users`, `departments`, `clock_events`, etc.

---

## Part 6: Configure the Backend (.env)

The backend reads settings from a file named `.env` in the `backend` folder. You create it from the example file.

1. In File Explorer (or Cursor), go to:
   ```
   C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System\backend
   ```

2. You should see a file **.env.example**. Duplicate it and rename the copy to **.env** (no “.example”):
   - Right‑click `.env.example` → Copy → Paste → Rename the copy to `.env`

   Or in PowerShell from the project root:
   ```powershell
   cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System\backend"
   Copy-Item .env.example .env
   ```

3. Open **.env** in Cursor (or Notepad). You will see lines like:
   ```
   PORT=5000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=clockin_system
   JWT_SECRET=change_this_to_a_long_random_secret_string
   ...
   ```

4. **Edit these two values** (the rest can stay as-is for local use):

   - **DB_PASSWORD**  
     Replace `your_mysql_password` with the **actual MySQL root password** you set when installing MySQL.  
     Example: `DB_PASSWORD=MySecretPass123`

   - **JWT_SECRET**  
     Replace with a long random string (used to sign login tokens). For example, type 30+ random letters/numbers, or use a password generator.  
     Example: `JWT_SECRET=myCompanyClockInSecretKey2024XyZ`

5. Save the file. Do **not** share `.env` or commit it to Git; it contains secrets.

---

## Part 7: Install Backend Dependencies and Start the API

1. Open a terminal in Cursor (**Terminal → New Terminal**) or open PowerShell.

2. Go to the backend folder:
   ```powershell
   cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System\backend"
   ```

3. Install dependencies (this downloads all packages listed in `package.json`):
   ```powershell
   npm install
   ```
   Wait until it finishes (you may see a lot of output). It can take one to two minutes.

4. Start the backend server:
   ```powershell
   npm run dev
   ```
   You should see something like:
   - `✅ MySQL connected`
   - `✅ Cron jobs started`
   - `🚀 Server running on http://localhost:5000`

5. **Leave this terminal window open.** The backend must keep running while you use the app. If you close it, the API stops.

6. To test that the API is up, open a browser and go to:  
   **http://localhost:5000/api/health**  
   You should see something like: `{"status":"ok","timestamp":"..."}`

---

## Part 8: Install Frontend Dependencies and Start the Web App

Use a **second** terminal (the first one is still running the backend).

1. Open **Terminal → New Terminal** in Cursor (or a new PowerShell window).

2. Go to the frontend folder:
   ```powershell
   cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System\frontend"
   ```

3. Install dependencies:
   ```powershell
   npm install
   ```
   Wait until it finishes.

4. Start the frontend development server:
   ```powershell
   npm run dev
   ```
   You should see something like:
   - `Vite dev server running at: http://localhost:5173`

5. **Leave this terminal open as well.** Both backend and frontend must be running.

6. Open your browser and go to:  
   **http://localhost:5173**  
   You should see the Attendance Tracker **login page**.

---

## Part 9: First Login and What You See

1. On the login page, use the **default HR account** created by the seed script:
   - **Email:** `hr@company.com`
   - **Password:** `Admin@1234`

2. Click **Sign In**. You should be redirected to the **HR Dashboard**.

3. You will see:
   - Company stats (employees, present today, etc. — may be zeros at first)
   - A sidebar with: Dashboard, Employees, Departments, Clock History, Flagged Events, Locations, Tokens, Overtime Requests, Work Schedule

---

## Part 10: First Steps After Login (Recommended)

Do these once so the system is usable:

1. **Add an acceptable clock-in location** (otherwise QR clock-in will be flagged):
   - Sidebar → **Locations** → **Add Location**
   - Enter a **name** (e.g. “Head Office”)
   - Enter **latitude** and **longitude** of your office (e.g. from Google Maps: right‑click a place → click the coordinates to copy)
   - Set **radius** in metres (e.g. 200). Employees must be within this distance to clock in without a location flag.

2. **Set work schedule** (so late and auto clock-out work correctly):
   - Sidebar → **Work Schedule**
   - Set **Expected Start** and **Expected End** (e.g. 08:00 and 17:00)
   - Set **Late grace minutes** (e.g. 15)
   - Save.

3. **Create at least one employee** (optional but useful for testing):
   - Sidebar → **Employees** → **Add Employee**
   - Fill in name, email, password, role (Employee or Supervisor), and optionally a department.
   - That user can then log in at http://localhost:5173 with that email and password.

4. **Change the default HR password** (recommended for security):
   - You can do this by having an HR user use “Change password” in the app if that feature exists, or by updating the user in the database. For the seed account, consider creating a new HR user from the Employees page and then deactivating or changing the seed account.

---

## Part 11: Summary — What Runs Where

| What | URL | Command to start |
|------|-----|------------------|
| **Backend API** | http://localhost:5000 | From `backend` folder: `npm run dev` |
| **Frontend app** | http://localhost:5173 | From `frontend` folder: `npm run dev` |
| **Database** | MySQL on port 3306 | Started with MySQL service / XAMPP / etc. |

You need **all three** running to use the app: MySQL, backend, frontend. Users only open **http://localhost:5173** in the browser; the frontend talks to the backend, and the backend talks to MySQL.

---

## Part 12: Troubleshooting

### “MySQL connection failed” or “ECONNREFUSED”
- MySQL is not running. Start the MySQL service (see Part 3).
- In `.env`, check `DB_HOST`, `DB_PORT`, `DB_USER`, and especially `DB_PASSWORD`. No spaces around `=` in `.env`.

### “Invalid credentials” when logging in
- Use exactly: email `hr@company.com`, password `Admin@1234`.
- Make sure you ran **002_seed_data.sql** so the HR user exists.

### Blank page or “Cannot GET /” at http://localhost:5173
- You are probably opening the backend URL. Use **http://localhost:5173** for the web app and **http://localhost:5000** for the API.
- Ensure the frontend is started with `npm run dev` from the **frontend** folder.

### “No token provided” or 401 errors in the app
- You are not logged in or the session expired. Log in again at http://localhost:5173.

### Commands “not recognized” (node, npm, mysql)
- **node/npm:** Install Node.js (LTS) and restart the terminal (and Cursor if you use its terminal).
- **mysql:** Add MySQL’s `bin` folder to your system PATH, or use the full path to `mysql.exe` (e.g. `C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`).

### Phone can't reach the app (QR code page doesn't load)
- Your phone and computer must be on the **same Wi-Fi network**.
- Windows Firewall blocks incoming connections by default. Open an **Administrator** PowerShell and run:
  ```powershell
  netsh advfirewall firewall add rule name="Clock-in Dev" dir=in action=allow protocol=TCP localport=5173,5000
  ```
  This allows your phone (and other devices on the LAN) to reach ports 5173 (frontend) and 5000 (backend).
- To remove the rule later: `netsh advfirewall firewall delete rule name="Clock-in Dev"`

### Phone says "HTTPS required for GPS coordinates"
- The dev server now uses HTTPS via a self-signed certificate (`@vitejs/plugin-basic-ssl`).
- When you open `https://192.168.x.x:5173` on your phone for the first time, the browser will warn about the certificate. Tap **Advanced** → **Proceed** (or equivalent) to accept it.
- If you still see an HTTP warning, make sure you're opening the `https://` URL, not `http://`.

### Port 5000 or 5173 already in use
- Another app is using that port. Stop the other app, or change **PORT** in `backend/.env` (e.g. to 5001) and **FRONTEND_URL** if needed; the frontend proxy in `frontend/vite.config.ts` points to the backend port.

---

## Part 13: Production Deployment

When you're ready to deploy Attendance Tracker for real use (not just local development), follow these steps.

### 1. Build the Frontend

Instead of running the Vite dev server, create an optimised production bundle:

```bash
cd frontend
npm run build
```

This creates a `frontend/dist` folder containing static HTML/CSS/JS files. Serve these with a web server (Nginx, Apache, or a Node.js static server).

### 2. Environment Variables Checklist

In `backend/.env` for production:

| Variable | Example | Notes |
|----------|---------|-------|
| `PORT` | `5000` | Backend API port |
| `DB_HOST` | `your-db-host.com` | Database hostname |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `clockin_app` | Dedicated DB user (not root) |
| `DB_PASSWORD` | `strong_password_here` | Use a strong, unique password |
| `DB_NAME` | `clockin_system` | Database name |
| `JWT_SECRET` | `long_random_string_64chars` | Generate with a password manager or `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `8h` | Token lifetime |
| `FRONTEND_URL` | `https://clockin.yourcompany.com` | **Required in production** — the public URL of your frontend |
| `APP_TIMEZONE` | `Africa/Blantyre` | **Required for auto clock-out** — IANA timezone (e.g. `Africa/Blantyre` for Malawi) so the cron uses your local time |

### 3. HTTPS (SSL/TLS)

GPS geolocation **requires HTTPS** on all modern browsers. In development we use a self-signed certificate via `@vitejs/plugin-basic-ssl`, but for production you need a real certificate.

**Option A: Reverse proxy with Nginx (recommended)**

1. Install Nginx on your server.
2. Obtain a free SSL certificate from [Let's Encrypt](https://letsencrypt.org/) using [Certbot](https://certbot.eff.org/).
3. Configure Nginx to:
   - Serve the `frontend/dist` folder for static files.
   - Proxy `/api` requests to the Node.js backend on port 5000.
   - Terminate SSL at Nginx.

Example Nginx config snippet:

```nginx
server {
    listen 443 ssl;
    server_name clockin.yourcompany.com;

    ssl_certificate     /etc/letsencrypt/live/clockin.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/clockin.yourcompany.com/privkey.pem;

    root /var/www/clockin/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}

server {
    listen 80;
    server_name clockin.yourcompany.com;
    return 301 https://$host$request_uri;
}
```

**Option B: Cloud hosting**

Services like Vercel (frontend), Railway, Render, or AWS can handle SSL automatically. Deploy the frontend as a static site and the backend as a Node.js service.

### 4. Run the Backend in Production

Use a process manager like **PM2** to keep the backend running and restart it on crashes:

```bash
npm install -g pm2
cd backend
pm2 start src/index.js --name clockin-api
pm2 save
pm2 startup   # follow the printed instructions to auto-start on reboot
```

### 5. Database Security

- Create a dedicated MySQL user for the app (don't use `root`).
- Enable MySQL SSL if the database is on a separate server.
- Set up regular backups (e.g. `mysqldump` via a cron job).

---

## Quick Reference: Starting the App Next Time

1. Start **MySQL** (if it’s not set to start automatically with Windows).
2. In a terminal: `cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System\backend"` → `npm run dev`.
3. In a second terminal: `cd "C:\Users\Youth Leader\Desktop\GIT PLIPP3R\Clock-in_System\frontend"` → `npm run dev`.
4. Open **http://localhost:5173** in your browser and log in.

That’s the full setup. If you hit a step that doesn’t work, check the exact error message and compare with Part 12 (Troubleshooting); the message usually indicates whether the problem is MySQL, the backend, or the frontend.
