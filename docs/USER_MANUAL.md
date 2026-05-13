# Attendance Tracker — User Manual

**Version:** 1.0 · **Audience:** All staff (Employee, Supervisor, HR)

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Roles and Permissions](#2-roles-and-permissions)
3. [Getting Started — Logging In](#3-getting-started--logging-in)
   - 3.1 [Signing In](#31-signing-in)
   - 3.2 [Forgot Password](#32-forgot-password)
   - 3.3 [Resetting Your Password via Email Link](#33-resetting-your-password-via-email-link)
4. [Navigation and Layout](#4-navigation-and-layout)
   - 4.1 [The Sidebar](#41-the-sidebar)
   - 4.2 [Light and Dark Mode](#42-light-and-dark-mode)
   - 4.3 [Signing Out](#43-signing-out)
5. [Your Profile](#5-your-profile)
6. [Employee Guide](#6-employee-guide)
   - 6.1 [Dashboard Overview](#61-dashboard-overview)
   - 6.2 [Clocking In — QR Code Method](#62-clocking-in--qr-code-method)
   - 6.3 [Clocking In — One-Time Token Method](#63-clocking-in--one-time-token-method)
   - 6.4 [Clocking Out](#64-clocking-out)
   - 6.5 [Attendance History](#65-attendance-history)
   - 6.6 [Leave Management](#66-leave-management)
     - 6.6.1 [Viewing Your Leave Balances](#661-viewing-your-leave-balances)
     - 6.6.2 [Requesting Leave](#662-requesting-leave)
     - 6.6.3 [Logging a Return (Early, On Time, or Late)](#663-logging-a-return-early-on-time-or-late)
     - 6.6.4 [Requesting a Leave Extension](#664-requesting-a-leave-extension)
   - 6.7 [Overtime Requests](#67-overtime-requests)
   - 6.8 [Holiday Dates](#68-holiday-dates)
7. [Supervisor Guide](#7-supervisor-guide)
   - 7.1 [Supervisor Dashboard](#71-supervisor-dashboard)
   - 7.2 [Reviewing Your Team's Overtime](#72-reviewing-your-teams-overtime)
8. [HR Guide](#8-hr-guide)
   - 8.1 [HR Dashboard](#81-hr-dashboard)
   - 8.2 [Workforce Management — Employees](#82-workforce-management--employees)
     - 8.2.1 [Adding a New Employee](#821-adding-a-new-employee)
     - 8.2.2 [Editing an Employee](#822-editing-an-employee)
     - 8.2.3 [Resetting an Employee's Password](#823-resetting-an-employees-password)
     - 8.2.4 [Editing Leave Balances](#824-editing-leave-balances)
     - 8.2.5 [Deactivating an Employee](#825-deactivating-an-employee)
   - 8.3 [Workforce Management — Departments](#83-workforce-management--departments)
   - 8.4 [Attendance Hub](#84-attendance-hub)
     - 8.4.1 [Attendance History](#841-attendance-history)
     - 8.4.2 [Flagged Events](#842-flagged-events)
     - 8.4.3 [Acceptable Locations](#843-acceptable-locations)
     - 8.4.4 [One-Time Tokens](#844-one-time-tokens)
   - 8.5 [Leave Management Hub](#85-leave-management-hub)
     - 8.5.1 [Reviewing Leave Requests](#851-reviewing-leave-requests)
     - 8.5.2 [Logging a Return on Behalf of an Employee](#852-logging-a-return-on-behalf-of-an-employee)
     - 8.5.3 [Reviewing Extension Requests](#853-reviewing-extension-requests)
     - 8.5.4 [Leave Policy](#854-leave-policy)
     - 8.5.5 [Holiday Calendar](#855-holiday-calendar)
     - 8.5.6 [Work Schedule](#856-work-schedule)
   - 8.6 [Overtime Management](#86-overtime-management)
   - 8.7 [System Reports](#87-system-reports)
     - 8.7.1 [Attendance Report](#871-attendance-report)
     - 8.7.2 [Leave Report](#872-leave-report)
     - 8.7.3 [Overtime Report](#873-overtime-report)
9. [Mobile QR Clock-In (Phone Flow)](#9-mobile-qr-clock-in-phone-flow)
   - 9.1 [Scanning and Signing In on Mobile](#91-scanning-and-signing-in-on-mobile)
   - 9.2 [Location (GPS)](#92-location-gps)
   - 9.3 [Completing the Clock-In](#93-completing-the-clock-in)
   - 9.4 [Troubleshooting Mobile Issues](#94-troubleshooting-mobile-issues)
10. [Understanding Flags and Reviews](#10-understanding-flags-and-reviews)
11. [Overtime Workflow — End to End](#11-overtime-workflow--end-to-end)
12. [Leave Workflow — End to End](#12-leave-workflow--end-to-end)
13. [Frequently Asked Questions](#13-frequently-asked-questions)

---

## 1. Introduction

**Attendance Tracker** is a web-based attendance management system for your organisation. It covers:

- Employee **clock-in and clock-out** via QR code scan (on a mobile phone) or a one-time token.
- **GPS location verification** — the system checks whether an employee clocked in from an approved location.
- **Leave requests, balances, extensions, and return logging** for all leave types (paid, sick, maternity, paternity, and any custom types your HR team has configured).
- **Overtime requests** that flow through supervisor approval, then HR approval, and auto-clock the employee in for the overtime session.
- **Dashboards, reports, and exports** for HR and supervisors.

Anyone on the system is one of three roles: **Employee**, **Supervisor**, or **HR**. Supervisors also have full access to everything an employee has. HR users have access to all areas of the application.

---

## 2. Roles and Permissions

| Capability | Employee | Supervisor | HR |
|---|:---:|:---:|:---:|
| Clock in/out (QR, token) | ✓ | ✓ | ✓ |
| Request overtime | ✓ | ✓ | ✓ |
| Request leave | ✓ | ✓ | ✓ |
| View own attendance history | ✓ | ✓ | ✓ |
| See team dashboard / approve overtime | — | ✓ | ✓ |
| Approve/deny leave requests | — | — | ✓ |
| Manage employees and departments | — | — | ✓ |
| Manage locations, tokens, flags | — | — | ✓ |
| Generate attendance/leave/overtime reports | — | — | ✓ |
| Manage leave policy and holidays | — | — | ✓ |

---

## 3. Getting Started — Logging In

### 3.1 Signing In

1. Open the Attendance Tracker URL in any modern browser.
2. Enter your **Email Address** and **Password** in the login card.
3. Tick **"Keep me signed in for 30 days"** if you are on a personal device and want to stay logged in after closing the browser. Leave it unchecked on shared computers.
4. Click **Sign In**.
5. You will be taken to your role's dashboard automatically:
   - **HR** → HR Dashboard
   - **Supervisor** → Supervisor Dashboard
   - **Employee** → Employee Dashboard

If your credentials are incorrect or your account has been deactivated, an error message will appear below the form.

> **Contact HR** if you need an account created or cannot log in.

---

### 3.2 Forgot Password

1. On the login screen, click **"Forgot your password?"**.
2. Enter your **email address** and click **Send reset link**.
3. If the email address matches an account, a password-reset link will be sent to that inbox (check your spam folder).
4. The confirmation message is the same whether or not the email exists — this is intentional for security.

---

### 3.3 Resetting Your Password via Email Link

1. Open the email from Attendance Tracker and click the **Reset Password** button (or copy the link into your browser).
2. The link contains your email and a secure token. If either is missing, you will see an error — request a new link.
3. Enter a **New password** (minimum 8 characters) and **Confirm** it.
4. Click **Update password**.
5. After success, you will be automatically redirected to the login page after a few seconds.

---

## 4. Navigation and Layout

### 4.1 The Sidebar

The left-hand sidebar is present on every page once you are signed in. It contains:

- **Attendance Tracker logo** at the top.
- **Your name and role badge** (e.g., "employee", "supervisor", "hr").
- **Navigation links** — these differ by role (see [Roles and Permissions](#2-roles-and-permissions)).
- **Profile** link at the bottom — opens your account settings.
- **Sign Out** button at the very bottom.

On **small/mobile screens** the sidebar is hidden by default. Tap the **hamburger menu (☰)** in the top bar to slide it open. Tap anywhere outside the sidebar or select a link to close it.

The **top bar** shows today's date in the upper-right corner.

---

### 4.2 Light and Dark Mode

The app supports a light and a dark theme. To switch:

1. Click **Profile** in the sidebar.
2. In the **Appearance** card, click **Light** or **Dark**.
3. Your choice is saved in your browser and is remembered even after closing the window.

Dark mode uses dark charcoal backgrounds with purple accents.

---

### 4.3 Signing Out

1. Click **Sign Out** at the bottom of the sidebar.
2. A confirmation dialog appears — click **Sign Out** to confirm, or **Cancel** to go back.
3. You will be redirected to the login page.

---

## 5. Your Profile

**Route:** `/account/profile` · **Access:** All roles

Click **Profile** in the sidebar footer to open your profile page. It has three cards:

| Card | Contents |
|---|---|
| **Account** | Read-only: your name, email, role, and department. To change these, ask HR. |
| **Appearance** | Light / Dark theme toggle. |
| **Security** | Change your password. |

**Changing your password:**

1. Enter your **Current password**.
2. Enter a **New password** (8+ characters).
3. Re-enter it in **Confirm new password**.
4. Click **Update password**.

All three fields are required. The new password and confirmation must match. On success, a green message appears and the fields clear. The new password takes effect immediately on all future logins (existing sessions may remain active on other devices).

---

## 6. Employee Guide

### 6.1 Dashboard Overview

**Route:** `/employee/dashboard`

This is your main screen. It provides:

| Section | Description |
|---|---|
| **Banners** | Important notices — holiday today, end-of-day clock-in blocked, success/error feedback for recent actions. |
| **Clock panel** | Your current status (Clocked In / Not Clocked In). If clocked in, shows the time you clocked in and your total hours today. Clock-out button appears here when you are in. |
| **QR Code / Token buttons** | Start a clock-in. |
| **Leave balances** | Quick glance at days remaining per leave type for the current year. A "Manage leave →" link takes you to the full leave page. |
| **Recent activity** | Your clock-in and clock-out events for today. Use the refresh icon to reload. |
| **Overtime requests** | Your pending and recent overtime requests. |

> **Holiday notice:** If today is a configured company holiday, a banner will say so and regular clock-in will be disabled. You will need an overtime token from HR to work on a holiday.

---

### 6.2 Clocking In — QR Code Method

This is the standard method. The QR code is displayed on your **workplace screen** or **shared device**, and you scan it with your personal phone.

**On the workplace screen (Dashboard):**

1. Click **Show QR Code**.
2. A modal opens with a QR code and instructions.
3. The QR code rotates automatically every 5 minutes for security. A countdown shows how long remains. Click **Refresh** to get a new code early.

**On your phone:**

1. Open your phone's camera or a QR scanning app.
2. Point it at the code — the browser will open a clock-in page automatically.
3. Follow the steps on your phone (see [Section 9 — Mobile QR Clock-In](#9-mobile-qr-clock-in-phone-flow)).

The workplace screen polls for your clock-in and will close the modal automatically once detected.

---

### 6.3 Clocking In — One-Time Token Method

Use this when you cannot scan a QR code (e.g., working from a different location or technical issue).

1. On your dashboard, click **Request Token** (or **Request Clock-in Token** in the button area).
2. Select the **Location** you will be clocking in from (only approved locations are listed).
3. Enter a **Reason** for requesting a token.
4. Click **Submit Request**.

HR receives the request and, if approved, a one-time token is generated and you are **automatically clocked in**. You will see the token appear in your **Pending Tokens** area on the dashboard once approved.

> Tokens expire after 60 minutes. Each token can only be used once.

---

### 6.4 Clocking Out

When you are clocked in, the **Clock Out** button appears in the clock panel.

1. Click **Clock Out**.
2. The system checks whether you are leaving before the scheduled end of the work day:
   - **If you are leaving early:** A modal asks for a **reason** (required). Enter it and click **Confirm Clock Out**.
   - **If you are leaving on time or late:** A simple confirmation modal appears. Click **Yes, Clock Out**.
3. Your session ends and your total hours for the day update.

---

### 6.5 Attendance History

**Route:** `/employee/history` · **Sidebar label:** "Attendance history"

This page shows a full log of all your clock-in and clock-out events.

**Filtering:**

- **From** — filter events from this date.
- **To** — filter events up to and including this date.
- Click **Filter** to apply.

**Table columns:**

| Column | Description |
|---|---|
| Date & Time | Exact timestamp of the event. |
| Type | "→ Clock In" or "← Clock Out"; overtime events are tagged "OT". |
| Method | `qr`, `token`, or `auto checkout` (auto-checkout happens at end-of-day if you forget). |
| Status | Any flags (e.g., "Late arrival", "Unexpected location") or "OK". |
| Notes | Early departure reason if you left before end of day. |

---

### 6.6 Leave Management

**Route:** `/employee/leave` · **Sidebar label:** "My Leave"

#### 6.6.1 Viewing Your Leave Balances

At the top of the page you will see a balance card for each leave type you have been allocated for the current year. Each card shows:

- Leave type name.
- Days remaining / days allocated.
- A progress bar (fills as days are used).

#### 6.6.2 Requesting Leave

1. Click **Request Leave** (top right of the page).
2. Fill in the form:
   - **Leave Type** — select from the types available to you (only types with remaining balance are shown with their remaining days).
   - **Start Date** — cannot be before today.
   - **End Date** — cannot be before the start date.
   - A **working-days preview** appears once both dates are set. It shows how many working days (Mon–Fri) fall in your range. If this exceeds your remaining balance, the row turns red and you cannot submit.
   - **Reason / Description** — required; explain why you are taking this leave.
3. Click **Submit Request**.

Your request will appear in the **My Requests** list with status **Pending**. HR will approve or deny it.

**Leave request statuses:**

| Status | Meaning |
|---|---|
| Pending | Submitted, awaiting HR review. |
| Approved | Approved by HR; will become active when the start date arrives. |
| Denied | HR has denied the request (an HR note will explain why). |
| Active | You are currently on leave. |
| Completed | Leave period has ended. |
| Return logged | You returned from leave (early, on time, or late). The leave will fully complete once the cron job runs. |

#### 6.6.3 Logging a Return (Early, On Time, or Late)

When a leave is **Active** or **Approved** and you have returned to work (or are about to), you can record your actual return date. This is important because:

- If you return **early**, unused days are credited back to your balance.
- If you return **late**, the extra working days you were absent are deducted from your balance.
- If you return **on time**, no balance change occurs.

**To log your return:**

1. Find the relevant leave card in **My Requests**.
2. Click **Log return**.
3. The modal shows the scheduled end date of your leave.
4. Select the **Actual return date** (must be on or after the leave start date and cannot be in the future).
5. Enter a **Reason for return** — a brief explanation.
6. Click **Log return**.

The leave card will update to show the return detail (e.g., "Returned early on 8 May 2026: Personal reason") and the status will change to **Return logged**.

#### 6.6.4 Requesting a Leave Extension

If you need more time and HR permits it:

1. Find the active or approved leave card.
2. Click **Request Extension** (only shown if no extension is already pending).
3. Enter the number of **Extra working days** needed (minimum 1).
4. Enter a **Reason**.
5. Click **Submit Request**.

HR will review the extension. If approved, your leave end date is pushed out by the number of extra working days and your allocation is increased accordingly. If denied, an HR note will appear.

---

### 6.7 Overtime Requests

**Route:** `/employee/overtime` · **Sidebar label:** "Overtime Requests"

Overtime must be requested in advance.

1. Click **New Request**.
2. Select the **Date** (must be today or later).
3. Enter a **Reason**.
4. Click **Submit Request**.

Once submitted, the request goes to your supervisor for approval, then to HR. HR will generate an overtime token, which **auto-clocks you in** for the overtime session. You will see the request status update through: Pending → Supervisor Approved → HR Approved.

---

### 6.8 Holiday Dates

Holiday dates are managed by HR. On a holiday:

- A banner appears on your dashboard: **"Today is a holiday: [holiday name]."**
- Regular QR and token clock-in is disabled.
- You will not be marked absent.
- If you need to work on a holiday, request overtime and HR will provide a token.

---

## 7. Supervisor Guide

Supervisors see all employee pages plus a supervisor-specific section.

### 7.1 Supervisor Dashboard

**Route:** `/supervisor/dashboard`

The dashboard gives you a live overview of your team.

**Summary cards:**

| Card | Description |
|---|---|
| Team members | Total headcount in your team. |
| Present today | How many have clocked in today. |
| Absent today | How many have not clocked in. |
| Pending OT | How many overtime requests are waiting for your approval. |

**Pending Overtime Requests:**

These are requests from your team waiting for supervisor approval. Each row shows the employee, requested date, and reason. You can:

- Click **Approve** — approves the request and forwards it to HR.
- Click **Reject** — opens a modal asking for a **Reason for Rejection** (required), then confirms rejection.

**Today's Team Attendance table:**

Shows each team member's clock-in time, clock-out time, status ("Active" = still in, "Done" = clocked out, "Absent" = not in yet), and any early-departure note.

**My Team cards:**

A grid of all your direct reports with their name, role, and department.

---

### 7.2 Reviewing Your Team's Overtime

**Route:** `/supervisor/overtime` · **Sidebar label:** "Overtime Requests"

This page lists overtime requests from your team with filter buttons:

- **All** — show everything.
- **Pending** — requests waiting for your review.
- **Supervisor Approved** — you have already approved; waiting for HR.
- **HR Approved** — fully approved and scheduled.
- **Rejected** — declined requests.

For pending requests, use the **Approve** or **Reject** buttons (reject requires a reason).

---

## 8. HR Guide

HR users access all employee and supervisor features plus a full administration suite.

### 8.1 HR Dashboard

**Route:** `/hr/dashboard`

Your command-centre overview for the whole organisation.

**Action Items** _(only visible when counts are above zero):_

| Item | Description |
|---|---|
| Token Requests | Employees who have requested a one-time token. Click to go to the Tokens tab. |
| Overtime Requests | Supervisor-approved overtime awaiting your final approval. |
| Leave Requests | Leave requests in Pending status. |
| Flagged Events | Attendance events flagged for review. |

**KPI cards:** Total employees, present/absent/late today, flagged events count, pending overtime count.

**Charts:**

- **Weekly Attendance (Last 7 Days):** Bar chart of how many employees were present each day.
- **Department Attendance:** Horizontal stacked bar per department (present vs absent).

**Quick Actions:** Buttons that navigate directly to common tasks — Add Employee, Manage Locations, Leave Policy, View Reports.

---

### 8.2 Workforce Management — Employees

**Route:** `/hr/workforce` (default tab: Employees)

This is where you manage employee accounts.

#### 8.2.1 Adding a New Employee

1. Click **Add Employee**.
2. Fill in all fields:
   - **Full Name** — displayed everywhere in the system.
   - **Email** — used for login and password resets. Must be unique.
   - **Password** — minimum 8 characters. The employee should change this after first login.
   - **Role** — `employee`, `supervisor`, or `hr`.
   - **Gender** — `male`, `female`, or `other`. This determines which leave types are seeded automatically (e.g., maternity leave is only seeded for female employees).
   - **Department** — optional; assign from configured departments.
3. Click **Create Employee**.

> Leave balances are seeded automatically based on the current leave policy and the employee's gender when their dashboard first loads.

#### 8.2.2 Editing an Employee

1. Find the employee in the table (use the **search bar** and/or the **role filter**).
2. Click the **edit icon** (pencil) on their row.
3. Modify any fields: Name, Email, Role, Department, Gender, **Active Account** (uncheck to deactivate).
4. Click **Save Changes**.

#### 8.2.3 Resetting an Employee's Password

1. Click the **reset password icon** (key) on the employee's row.
2. Enter a **new password** (minimum 8 characters).
3. Click **Reset Password**.

The employee can then log in with this password and change it via their Profile page.

#### 8.2.4 Editing Leave Balances

Use this to manually correct a leave balance (e.g., carry-over days, policy corrections).

1. Click the **leave icon** (heart) on the employee's row.
2. Select the **Leave Type** from the dropdown (filtered by the employee's gender and applicable policies).
3. Set **Days allocated** (the total days they are entitled to) and **Days used**.
4. The **Days remaining** is calculated automatically and shown in grey.
5. Click **Update Balance**.

> **Important:** Changing an allocation does not retroactively adjust existing leave requests.

#### 8.2.5 Deactivating an Employee

Click the **delete icon** on the employee's row. A confirmation prompt explains that this **deactivates** the account (they cannot log in) but does not delete their history. Click **OK** to confirm.

To re-activate them, open Edit and tick the **Active Account** checkbox again.

---

### 8.3 Workforce Management — Departments

**Route:** `/hr/workforce?tab=departments`

Click the **Departments** tab in the Workforce hub.

**Creating a department:**

1. Click **New Department**.
2. Enter the **Name** (required) and optional **Description**.
3. Click **Create**.

**Editing:** Click the pencil icon on a department card, update name/description, click **Save Changes**.

**Deleting:** Click the delete icon. Any employees assigned to this department will be unassigned (their department field is cleared). A confirmation prompt will appear.

---

### 8.4 Attendance Hub

**Route:** `/hr/attendance` · Tabs: History | Flagged Events | Locations | Tokens

#### 8.4.1 Attendance History

**Tab:** History

Browse every clock event across all employees.

**Filters:**

- **Employee** — select a specific employee or "All Employees".
- **From** and **To** date — date range filter.
- Click **Filter** to search; results paginate at 50 per page.

**Table columns:** Employee, Department, Date/Time, Event type (Clock In/Out), Method, GPS coordinates (with a Google Maps link if available), Flag status.

Use **Previous / Next** to move through pages.

#### 8.4.2 Flagged Events

**Tab:** Flagged Events

The system automatically flags clock events that are suspicious. Common flag reasons:

| Flag | Meaning |
|---|---|
| LATE_ARRIVAL | Employee clocked in after the grace period. |
| UNEXPECTED_LOCATION | GPS coordinates are not near any acceptable location. |
| NO_LOCATION | No GPS was captured (e.g., HTTP instead of HTTPS, or permission denied). |

**Reviewing a flagged event:**

1. Click **Review & Unflag** on the row.
2. A summary shows the event details.
3. If the event has GPS coordinates and you want to add that location as acceptable:
   - Tick **Add this location as an acceptable location**.
   - Enter a **Location name**.
   - Set the **Acceptable Radius** in metres (50–5000 m, default 200 m).
4. Click **Confirm Unflag**.

The flag is removed. If you chose to add the location, it is immediately saved to the Acceptable Locations list.

#### 8.4.3 Acceptable Locations

**Tab:** Locations · Manage the list of approved clock-in sites.

**Adding a location:**

1. Click **Add Location**.
2. Enter a **Name**.
3. Click on the **interactive map** to place a pin at the exact coordinates, or type them manually in the **Latitude** and **Longitude** fields.
4. Adjust the **Radius** using the slider (50–2000 m). Employees within this radius will not be flagged for location.
5. Click **Add Location**.

**Other actions per location row:**

| Action | Description |
|---|---|
| Map icon | Opens a map preview modal with the marker and radius circle. |
| Edit icon | Change name, coordinates, or radius. |
| Active toggle | Temporarily disable a location (shown as "Inactive") without deleting it. |
| Delete icon | Permanently remove the location. |

#### 8.4.4 One-Time Tokens

**Tab:** Tokens · Two sub-tabs: **Pending Requests** and **Generated Tokens**.

**Pending Requests:**

Employees who have requested a token appear here. For each request you can:

- **Approve & Clock In** — generates a one-time token and auto-clocks the employee in immediately. A success state shows the generated token string.
- **Reject** — opens a modal with an optional note field; click **Reject Request** to confirm.

**Generated Tokens:**

A searchable log of all tokens. Filter by status: All / Active / Used. Columns include the token string, recipient, type (Regular / Overtime), who generated it, expiry time, and status.

**Generating a token manually:**

1. Click **Generate Token**.
2. Select the **Employee** (HR users are excluded from the list).
3. Select **Token type**: Regular (clock-in token) or Overtime.
4. If Overtime, you may optionally enter the **Overtime Request ID** to link the token to that request.
5. Click **Generate**.
6. The modal shows the token string with a **Copy** button. Share this with the employee. It expires in 60 minutes.

---

### 8.5 Leave Management Hub

**Route:** `/hr/leave` · Tabs: Requests | Policy | Holidays | Schedule

#### 8.5.1 Reviewing Leave Requests

**Tab:** Requests

**Internal tabs:**

| Tab | Shows |
|---|---|
| Pending | New requests awaiting approval. |
| Active | Approved leaves currently in progress. |
| Extensions | Leaves that have a pending extension request (badge shows count). |
| All | Every leave request across all employees. |

**Each leave card shows:** Employee name, department, leave type, date range, working days, description, HR note (if any), return details (if logged).

**Approving or denying a request (Pending tab):**

1. Click **Approve** or **Deny** on the card.
2. A modal opens:
   - **Approve:** Enter an optional note for the employee → click **Approve Request**.
   - **Deny:** Enter a **mandatory reason** explaining why → click **Deny Request**.
3. The card will move to the appropriate category.

On approval the employee's leave balance is deducted for the requested working days.

#### 8.5.2 Logging a Return on Behalf of an Employee

When a leave is **Active** or **Approved**, you can record the return for the employee:

1. Click **Log return** on the leave card.
2. The modal states the scheduled end date.
3. Select the **Actual return date** (on or after leave start, not in the future).
4. Enter a **Reason for return**.
5. Click **Log return**.

The system auto-classifies: **early** (balance refunded), **on time** (no change), or **late** (extra days deducted).

#### 8.5.3 Reviewing Extension Requests

Click the **Extensions** tab or expand the extensions section on any leave card showing a pending extension badge.

Each extension card shows: extra days requested, reason, approve/deny buttons.

- **Approve:** Pushes the leave end date forward by the extra working days and increases the employee's allocation.
- **Deny:** Extension not granted; optional note.

#### 8.5.4 Leave Policy

**Tab:** Policy

Define what leave types exist and the defaults for new employees.

**Table columns:** Leave type, Default days, Gender applicability (All / Male / Female), Edit/Delete.

**Adding a leave type:**

1. Click **Add Leave Type**.
2. Enter the **leave type name** — use lowercase letters and underscores (e.g., `family_responsibility`). This becomes the internal key.
3. Set **Default days** (0 or more, whole numbers).
4. Set **Applies to** — All, Male only, or Female only.
5. Click **Create**.

**Editing an existing type:** Click the pencil icon on the row, change days or gender applicability, click **Save**.

**Deleting:** Click the delete icon. This is blocked if any employees have active leave requests of this type.

> **Important:** Changes to policy defaults only affect **new** employees. To adjust an existing employee's balance, use **Edit Leave** in the Employees section.

#### 8.5.5 Holiday Calendar

**Tab:** Holidays

Manage company holiday dates. These affect the whole system:

- Regular clock-in is **blocked** on holiday dates.
- Employees are **not marked absent** on holidays.
- Absent employees on holidays are excluded from attendance reports.

**Adding a holiday:**

1. Click **Add Holiday**.
2. Select the **Date**.
3. Enter the **Holiday Name** (e.g., "Heritage Day").
4. Optional: add a **Description**.
5. Click **Create**.

**Year selector:** Use the dropdown at the top to view past or future years (current year ± 1).

Past holidays are shown dimmed. Edit or delete any holiday with the icons on each row.

#### 8.5.6 Work Schedule

**Tab:** Schedule

Set the standard working hours and rules. These apply to all employees (Mon–Fri only).

| Field | Description |
|---|---|
| **Expected Start Time** | The time employees are expected to have clocked in by (e.g., 08:00). |
| **Expected End Time** | The standard end-of-day time (e.g., 17:00). |
| **Late grace period (minutes)** | How many minutes after start time before a clock-in is flagged as LATE_ARRIVAL (0–120 min). |
| **Auto-checkout buffer (minutes)** | Minutes after the expected end time before the system automatically clocks out employees who have not done so (0–60 min). |

The **blue summary box** previews the resulting rules in plain language before you save.

Click **Save Schedule** to apply.

---

### 8.6 Overtime Management

**Route:** `/hr/overtime`

This page shows overtime requests that have been **supervisor-approved** and are now awaiting your final decision.

**Filters:** All, Pending, Ready for HR (supervisor approved), Approved, Rejected.

**Approving overtime:**

1. Click **Approve & Clock In** on a `supervisor_approved` row.
2. A summary modal shows the request details.
3. Click **Approve & Clock In for Overtime** to confirm.
4. The system generates an overtime token and **auto-clocks the employee in** for the overtime session. A success message appears.

**What happens next:** The employee is immediately clocked in as an overtime session (`is_overtime = true`). The overtime request status changes to `hr_approved`.

**Rejecting overtime:**

1. On a `supervisor_approved` row, click **Reject**.
2. Enter a **reason** (required). This is stored for the employee and for audit.
3. Confirm with **Reject request**. The status becomes `rejected`; no token is issued and the employee is **not** clocked in.

---

### 8.7 System Reports

**Route:** `/hr/reports` · Tabs: Attendance | Leave | Overtime

All reports follow the same pattern: set filters → **Preview** (shows a table on-screen) → **Download CSV** (saves a spreadsheet file).

#### 8.7.1 Attendance Report

**Filters:** Year, Month (optional — leave blank for full year), Department.

**Preview columns:**

| Column | Description |
|---|---|
| Employee | Full name. |
| Department | Department name. |
| Gender | Recorded gender. |
| Days Present | Number of days with at least one clock-in. |
| Days Absent | Working days without any clock-in. |
| Late Arrivals | Number of times flagged as late. |
| Attendance % | `days_present / total_working_days × 100`. |
| Working Days | Total working days (Mon–Fri, excluding holidays) in the period. |

#### 8.7.2 Leave Report

**Filters:** Year, Department, Leave Type, Status.

**Preview columns:**

| Column | Description |
|---|---|
| Employee | Full name. |
| Department | Department name. |
| Gender | Gender. |
| Leave Type | Type of leave. |
| Start / End | Leave date range. |
| Days | Working days requested. |
| Status | Current status (Pending / Approved / Active / Completed / Return logged / Denied). |
| Return type (early / late) | If a return was logged: `Early (d MMM yyyy)`, `Late (…)`, or `On time (…)`. Empty if no return logged. |
| HR Note | Any note added when approving or denying. |
| Submitted | Date the request was made. |

The downloaded CSV has the same columns, plus a **Return reason** column.

#### 8.7.3 Overtime Report

**Filters:** Year, Department.

**Preview columns:** Employee, approved OT sessions, session dates, types (Regular / Double), and counts by status.

---

## 9. Mobile QR Clock-In (Phone Flow)

This is the page that opens on **your phone** after scanning the QR code from the workplace screen.

### 9.1 Scanning and Signing In on Mobile

1. Point your phone camera at the QR code displayed on the workplace screen.
2. Your phone's browser opens the clock-in page automatically.
3. If this is your **first time** on this device, you will see a login form:
   - Enter your **Email** and **Password**.
   - Tap **Sign In & Continue**.
4. Your session is saved in the browser for future scans on the same phone — you will not need to log in again until your session expires.

> A banner appears on the login screen if the page is served over HTTP (not HTTPS). In this case, your GPS location cannot be captured. Your clock-in will still be recorded but will be reviewed by HR.

---

### 9.2 Location (GPS)

After logging in, a **GPS status chip** shows the current location status:

| Status | Meaning |
|---|---|
| Location pending | GPS not yet requested. |
| Getting location… | Browser is acquiring your position. |
| Location captured | GPS fixed; coordinates will be sent. |
| Location denied | You refused the browser's location permission. |
| Location not available | Your device or browser does not support geolocation. |
| Location unavailable (HTTP) | The page is served over plain HTTP; GPS is blocked by the browser. |

If location is **denied** or **unavailable**, your clock-in will still work but it will be flagged for HR review. HR can unflag it if it was a legitimate clock-in.

To fix a denied location: go to your phone's Settings → Browser → Site permissions → Location → allow for this site, then reload the page.

---

### 9.3 Completing the Clock-In

1. The "Clock In" screen shows your name, the GPS chip, and any warnings.
2. Tap **Clock In Now**.
3. A "Clocking in…" spinner appears briefly.
4. On success you will see a green "You're clocked in!" confirmation with the time.
5. If your clock-in was flagged (location issue or late arrival), a yellow notice explains the reason and that HR will review it.
6. Close the page — you are done.

---

### 9.4 Troubleshooting Mobile Issues

| Problem | Solution |
|---|---|
| QR code page won't open | Make sure your phone's camera app supports QR scanning; alternatively use a third-party scanner. |
| "Invalid QR code" error | The QR code may have rotated. Ask the workplace screen to show a fresh code. |
| "Today is a holiday" blocked message | Regular clock-in is disabled on holidays. Request overtime through the app or contact HR. |
| "Clock-in disabled until tomorrow" | End-of-day cut-off has been reached. Contact HR if this is an error. |
| "Your session expired" | Tap "Sign In & Continue" and log in again — your mobile token expired. |
| GPS stuck on "Getting location…" for a long time | Tap the button anyway; the system will use whatever coordinates are available. If GPS times out, clock-in still proceeds without location. |
| "Switch account" | Tap this link at the bottom of the clock-in screen to log in as a different user on the same phone. |

---

## 10. Understanding Flags and Reviews

The system automatically **flags** a clock event when something looks unusual. Flags do not prevent work — they are a prompt for HR review. Here is what triggers them:

| Flag type | Trigger |
|---|---|
| **LATE_ARRIVAL** | Clock-in timestamp is more than the grace period after the expected start time. |
| **UNEXPECTED_LOCATION** | GPS coordinates are not within any acceptable location's radius. |
| **NO_LOCATION / LOW_ACCURACY** | No GPS was provided or the accuracy was very poor. |

**What employees should know:**

- A yellow notice appears on your mobile clock-in success screen if you were flagged.
- Your clock-in is recorded normally — flagging does not mean you are absent.
- HR will review flags regularly and may add your location as acceptable.

**What HR should do:**

1. Open **Attendance → Flagged Events**.
2. Review each flagged event.
3. If it is legitimate, click **Review & Unflag** and optionally add the location.
4. If it is genuinely suspicious, leave it flagged for further investigation.

---

## 11. Overtime Workflow — End to End

```
Employee submits request (date + reason)
         ↓
Supervisor reviews on Supervisor Dashboard or Overtime page
  ├── Approve → forwards to HR
  └── Reject (reason required) → employee sees rejection
         ↓
HR reviews on Overtime page (only supervisor-approved items shown for action)
  ├── Approve & Clock In → system generates token → employee is auto-clocked in
  └── (Reject not shown in HR step; supervisor handles rejection)
         ↓
Employee shows as present for overtime in attendance history
```

**Rules:**
- Overtime requests must be for a **future** date (today or later at the time of submission).
- HR approval auto-clocks the employee in as overtime — no QR scan needed.
- On a holiday, regular clock-in is blocked but overtime tokens still work.

---

## 12. Leave Workflow — End to End

```
Employee submits leave request (type, dates, reason)
         ↓
HR reviews (Pending tab → Approve or Deny)
  ├── Deny (reason required) → employee sees denial and HR note
  └── Approve → balance deducted; request becomes "Approved"
         ↓
Cron job daily:
  - Approved → Active when start_date arrives
  - Active → Completed when end_date passes
         ↓
During leave — employee or HR can:
  • Log return → classifies Early / On time / Late; adjusts balance
  • Request extension → HR approves → end_date extended, allocation increased
         ↓
Return logged → Completed when actual_return_date passes (cron)
```

**Balance logic at a glance:**

| Action | Effect on balance |
|---|---|
| Request approved | `days_requested` deducted from `days_remaining`. |
| Return logged — Early | Working days between day after return and scheduled end are **refunded**. |
| Return logged — On time | No change. |
| Return logged — Late | Working days between scheduled end and actual return are **added** to `days_used`. |
| Extension approved | `days_allocated` increased; `days_remaining` increased by extension days. |

---

## 13. Frequently Asked Questions

**Q: I cannot log in. What do I do?**
A: Check that your email and password are correct (passwords are case-sensitive). Use the "Forgot your password?" link if needed. If you still cannot access your account, contact HR — your account may be deactivated.

---

**Q: The QR code says "Invalid" or expired. What do I do?**
A: QR codes rotate every 5 minutes. Ask whoever is managing the workplace screen to click the **Refresh** button in the QR code modal to generate a new one, then scan again.

---

**Q: My clock-in was flagged. Am I in trouble?**
A: No — being flagged does not mark you absent or disciplined. It means HR will review the event. The most common reasons are clocking in slightly after the grace period (late flag) or GPS not capturing an acceptable location. HR will unflag it if it was legitimate.

---

**Q: I forgot to clock out. What happens?**
A: The system has an auto-checkout that runs at a set time after the expected end of day. Your attendance is recorded up to that point. If you need a manual correction, contact HR.

---

**Q: How do I know how many leave days I have left?**
A: Your leave balances appear on your **Dashboard** (quick summary) and in full on your **My Leave** page with a breakdown per leave type.

---

**Q: I need to change my email address or name.**
A: Contact HR — you cannot edit your own name or email from the Profile page (it is read-only). HR can update it via the Employees edit screen.

---

**Q: I returned from leave early but forgot to log my return. Can I still log it?**
A: Yes, as long as your leave is still showing as Active or Approved. Go to **My Leave**, find the leave card, and click **Log return**. The return date must be in the past (not in the future) and on or after your leave start date.

---

**Q: I returned late (after my scheduled end date). What do I do?**
A: Click **Log return** on the leave card and enter your actual return date (even though it is after the end date). The system will calculate the extra working days and adjust your leave balance accordingly.

---

**Q: My leave request was approved but my balance did not change.**
A: Leave balances update on approval. If there is a discrepancy, contact HR — they can manually adjust your balance via the Employees → Edit Leave function.

---

**Q: What is the difference between a Regular token and an Overtime token?**
A: A **Regular** token clocks you in for a standard work session. An **Overtime** token clocks you in flagged as an overtime session (`is_overtime = true`), which appears separately in reports. HR generates overtime tokens only after approving overtime requests.

---

**Q: I am a supervisor. Can I approve leave for my team?**
A: No — leave approval is handled only by HR users. Supervisors approve overtime requests only.

---

**Q: Can I see other employees' data?**
A: Employees can only see their own data. Supervisors can see their team's attendance on the supervisor dashboard but cannot access HR administration pages. HR has access to all data.

---

**Q: The app looks different on my colleague's screen.**
A: You may be using different themes (Light vs Dark). Go to **Profile → Appearance** to switch.

---

**Q: I selected a leave date and the working-days preview shows 0. Why?**
A: The preview counts only Monday–Friday. If your selected range falls entirely on a weekend, no working days are counted and submission is blocked. Adjust your dates to include at least one weekday.

---

*End of User Manual*

---

**For technical setup, deployment, and developer documentation see:**
- [`GETTING_STARTED.md`](../GETTING_STARTED.md) — developer setup guide
- [`SYSTEM_DOCUMENTATION.md`](../SYSTEM_DOCUMENTATION.md) — full technical reference
- [`docs/HANDOFF_DOCUMENTATION.md`](./HANDOFF_DOCUMENTATION.md) — onboarding for new developers
