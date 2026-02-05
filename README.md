# Patient Management System — drjaju.com

A comprehensive clinic/hospital patient management platform with OPD workflow, prescriptions, billing, ABHA integration, and multi-role access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TailwindCSS 3, React Router 7 |
| Backend | Node.js, Express 5, MySQL 8 (mysql2), JWT auth |
| Database | MySQL 8 — 130 tables, 8 views, ~1M+ SNOMED rows |
| PDF | jsPDF + jsPDF-autotable (server-side), Puppeteer (fallback) |
| Email | Nodemailer (SMTP) |
| QR Codes | qrcode npm package |
| Caching | Redis (optional) + in-memory fallback |
| Monitoring | PM2, Morgan, Sentry (frontend) |
| Testing | Vitest (frontend), Jest (backend) |

---

## Setup

### Prerequisites
- Node.js 18+
- MySQL 8
- Redis (optional — app falls back to memory cache)

### Backend
```bash
cd backend
cp .env.example .env        # fill in your values
npm install
npm start                   # production
npm run dev                 # development (nodemon)
```
Server runs on `PORT` from `.env` (default 5000).

### Frontend
```bash
cd frontend
cp .env.example .env        # set VITE_API_URL
npm install
npm run dev                 # development (Vite, port 5174)
npm run build               # production build → dist/
```

### Database
Run table creation scripts before first boot:
```bash
mysql -u root -p patient_management < backend/src/scripts/medicalHistoryTables.sql
mysql -u root -p patient_management < backend/src/scripts/snomedInjectionsComplete.sql
mysql -u root -p patient_management < backend/src/scripts/smartSuggestionsInjections.sql
```

### Production Deploy (Nginx + PM2)
```
/var/www/patient_management/
├── backend/          → PM2 process "patient-backend" (port 5000)
└── frontend/dist/    → Served by Nginx on port 80/443
```
- Build frontend locally (`npm run build`), copy `dist/` to server.
- Copy backend `src/` to server.
- `pm2 restart patient-backend`

---

## Currently Working Features

### Authentication & Access Control
- [x] Login (email/password)
- [x] OTP Login (universal + doctor-specific)
- [x] JWT token-based auth with 401 auto-redirect
- [x] Role-based access: admin, doctor, staff, sub_admin, receptionist, nurse, lab_tech, pharmacist
- [x] Permission matrix: 9 modules × multiple actions per role

### Patient Management
- [x] CRUD patients (9,400+ records)
- [x] Patient search (global)
- [x] VIP patient tiers (Bronze/Silver/Gold/Platinum)
- [x] Patient overview with timeline
- [x] Family history management
- [x] Drug allergy management with severity levels
- [x] Medical conditions (legacy text fields + new toggle system)

### Queue & OPD Workflow
- [x] Reception dashboard → Doctor consultation → Billing
- [x] Patient queue with priority ordering
- [x] Check-in / in-progress / completed status flow
- [x] Doctor consultation notes

### Prescription Pad
- [x] Configurable pad sections (drag & drop order, enable/disable)
- [x] Symptoms with smart suggestions
- [x] Diagnosis input
- [x] Medication selector with 62 medicines + search
- [x] Injection form with 22,500+ SNOMED medications (search-based)
- [x] Smart injection suggestions (105 symptom→injection mappings)
- [x] Vitals entry with auto-BMI calculation
- [x] Advice (multilingual: EN/HI/MR/BN/GU/TA/TE/KN/ML/PA/UR)
- [x] Follow-up date
- [x] Draft auto-save (30s interval + localStorage)
- [x] Drug interaction warnings
- [x] Allergy conflict detection

### Medical History (dr.eka.care style)
- [x] Quick toggle conditions (Y/N) with "Since" field — 37 conditions
- [x] Existing Conditions section with add/delete
- [x] Past Surgical Procedures section with add/delete
- [x] Drug Allergies display with severity badges
- [x] Family History display

### Prescription Sharing
- [x] WhatsApp: opens wa.me link with formatted prescription message
- [x] Email: sends HTML email with prescription details + PDF download link
- [x] Copy Link: shareable URL to public prescription view
- [x] QR Code: generated on-demand, downloadable as PNG
- [x] Public Prescription View page (no auth required for shared links)
- [x] PDF download (blob-based, triggers browser download)
- [x] Print (browser print with @media print styles)

### Billing
- [x] Bill creation with consultation/medicine/procedure charges
- [x] Payment tracking (cash/card/UPI/etc.)
- [x] Receipt generation
- [x] Bill PDF generation (public link, no auth needed)

### Appointments
- [x] Appointment booking (walk-in, online, referral, emergency)
- [x] Slot management per doctor
- [x] Status tracking (scheduled → checked-in → completed)
- [x] Follow-up scheduling

### ABHA Integration
- [x] ABHA account linking
- [x] ABHA registration flow
- [x] API logging for ABHA calls

### SNOMED CT / ICD Coding
- [x] 188K+ SNOMED concepts imported
- [x] 22K+ injectable medications from SNOMED
- [x] ICD-10 and ICD-11 code lookup
- [x] Snowstorm API integration (external SNOMED server)

### Analytics & Reporting
- [x] Dashboard views (doctor, staff, reception)
- [x] Enhanced analytics (admin/doctor only)
- [x] Doctor export

### System
- [x] Audit logging for all data mutations
- [x] Backup & restore
- [x] Clinic management (multi-clinic ready)
- [x] Doctor QR codes for appointment booking
- [x] Swagger API documentation at `/api-docs`
- [x] Health endpoint at `/health`

---

## Known Issues / Non-Working

### Database
- **`medical_history_options.category` enum** — does not include `'family'` or `'allergy'`; Family History entries use `'lifestyle'` as workaround. Fix: `ALTER TABLE medical_history_options MODIFY category ENUM('chronic','general','surgical','lifestyle','family','allergy','other') DEFAULT 'chronic';`
- **`patient_medical_history.since_date` is DATE type** — free-text "Since" input from UI (e.g. "2020") will fail MySQL DATE validation. Needs `ALTER ... MODIFY since_date VARCHAR(50) NULL;` or frontend must send valid `YYYY-MM-DD`.
- **`email_logs` lacks `patient_id` / `clinic_id`** — cannot scope email audit to a patient or clinic without joining through `recipient_email`.
- **`doctors` table has 1 row** but `injection_templates.doctor_id` FK points to `users` table, not `doctors` — inconsistency.
- **Duplicate medical_history_options** were seeded twice; cleaned up to 37 entries.

### Frontend
- **`Analytics.old.jsx`** — dead file, never imported.
- **`PrescriptionView.jsx`** (public shared link page) route `/prescription/view/:id` — works but has no 404 fallback animation if prescription ID is invalid.
- **Silent 401 redirect** — user gets no toast/notification when session expires; just redirected to login.
- **No token refresh** — JWT expires and forces full re-login; no refresh token mechanism.
- **`prompt()` used for email input** — `emailPrescription()` uses browser `prompt()` instead of a modal input. Works but is not styled.

### Backend
- **CSRF protection disabled** — `csurf` package was deprecated; no replacement CSRF token mechanism in place.
- **`/api/vitals` routes have no auth middleware** — vitals endpoints are publicly accessible.
- **`codeprana-api` (PM2 id 3)** — unknown service running alongside `patient-backend`. Needs investigation.
- **Redis not confirmed active** — app falls back to memory cache; Redis config in `.env` may not be connected.
- **Bull job queue** in `package.json` but no active queue workers visible.

### Security Concerns (Priority Order)
1. **Credentials in `.env`** — DB password, SMTP password, JWT secret, WHO ICD keys all in plaintext `.env`. Must not be committed to git.
2. **JWT stored in localStorage** — vulnerable to XSS. Consider httpOnly cookie or encrypted storage.
3. **No CSRF protection** — stateless JWT mitigates this partially, but form-based flows are exposed.
4. **Public vitals endpoint** — `/api/vitals` has no authentication.
5. **Rate limit at 2000 req/15min** — generous; tighten for auth endpoints.

---

## Architecture

### Data Flow
```
Browser (React SPA)
  → Vite proxy /api → Express backend (port 5000)
    → mysql2 connection pool (200 connections)
    → Redis cache (optional, 300s TTL)
    → Nodemailer SMTP (emails)
    → wa.me URLs (WhatsApp, client-side open)
    → QRCode npm (server-side generation)
    → Snowstorm API (SNOMED CT queries)
    → WHO ICD API (ICD-11 lookups)
```

### Route Auth Map
| Type | Routes |
|---|---|
| Public (no auth) | `/`, `/login`, `/qr/:id`, `/prescription/view/:id`, `/api/pdf/bill/:id`, `/api/prescriptions/view/:id`, `/health` |
| Protected (JWT) | All `/api/*` except above |
| Admin-only | `/api/analytics`, `/api/audit`, `/api/backup`, `/api/permissions` |

### Key Database Entities
```
clinics (1)
  └── doctors (1) ← users (role=doctor)
        └── prescriptions (21,839)
              └── prescription_items (2,598)
  └── patients (9,412)
        ├── appointments (21,354)
        ├── bills (5)
        ├── patient_medical_history
        ├── patient_chronic_conditions
        ├── patient_surgical_history
        ├── patient_allergies
        └── family_history
  └── injection_templates (22,569)
  └── symptom_injection_mapping (105)
```

---

## Immediate Action Items

1. **Fix `since_date` column** — ALTER to VARCHAR(50) or enforce date format in frontend
2. **Fix `medical_history_options.category` enum** — add 'family' and 'allergy' values
3. **Secure `.env`** — add to `.gitignore`, use secrets manager in production
4. **Add auth to `/api/vitals`** routes
5. **Replace `prompt()` in email share** with modal input
6. **Investigate `codeprana-api` PM2 process** — what is it, is it needed
7. **Add `patient_id` column to `email_logs`** for audit trail

---

## Future Roadmap

- [ ] Token refresh mechanism (refresh token in httpOnly cookie)
- [ ] IPD (inpatient) admission workflow (tables exist, UI pending)
- [ ] Lab investigation report generation
- [ ] Telemedicine / video consultation
- [ ] WhatsApp Business API integration (replace wa.me links with actual message sending)
- [ ] SMS notifications for appointments/reminders
- [ ] Multi-clinic isolation (clinic_id scoping on all queries)
- [ ] Mobile-responsive PWA
- [ ] Automated daily database backup
- [ ] RBAC granular permissions (per-doctor patient access)
