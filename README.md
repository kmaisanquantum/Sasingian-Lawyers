# Sasingian Lawyers — Legal Practice Management System
### Port Moresby, PNG · app.sasingianlawyers.com

---

## 🗂️ Project Structure

```
sasingian-lawyers/
├── render.yaml                ← Render Blueprint (1-click deploy)
├── .gitignore
├── README.md
├── RENDER_DEPLOY.md           ← Full step-by-step Render guide
│
├── database/
│   └── schema.sql             ← PostgreSQL schema (13 tables, views, seed data)
│
├── backend/                   ← Express.js REST API
│   ├── .env.example           ← Copy to .env for local dev
│   ├── server.js              ← Entry point; serves React build in production
│   ├── package.json
│   ├── config/database.js
│   ├── middleware/auth.js     ← JWT authenticate + role authorize
│   ├── routes/
│   │   ├── auth.js
│   │   ├── matters.js         ← CRUD + time entries + trust deposit/withdraw
│   │   └── payroll.js         ← PNG SWT calculator + payroll records
│   ├── utils/pngPayroll.js    ← 2026 PNG IRC tax engine
│   └── scripts/seed-users.js
│
└── frontend/                  ← React 18 SPA (Vite + Tailwind)
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx
        ├── context/AuthContext.jsx
        ├── utils/api.js
        ├── components/        ← Layout, Sidebar, StatCard, ProtectedRoute
        └── pages/             ← Login, Dashboard, Matters, Trust, Payroll, Staff
```

---

## 🚀 Deploy to Render

**See [RENDER_DEPLOY.md](RENDER_DEPLOY.md) for the full guide.**

```bash
# 1. Push to GitHub
git init && git add . && git commit -m "init"
git remote add origin https://github.com/YOUR_USER/sasingian-lawyers.git
git push -u origin main

# 2. Render Dashboard → New → Blueprint → select repo
#    render.yaml auto-creates: Web Service + PostgreSQL

# 3. Add secrets in Dashboard → sasingian-api → Environment:

# 4. Run via Render Shell:
psql $DATABASE_URL < /opt/render/project/src/database/schema.sql
cd /opt/render/project/src/backend && npm run seed
```

---

## 💻 Local Development

```bash
# Database
createdb sasingian_legal
psql -d sasingian_legal -f database/schema.sql

# Backend
cd backend && npm install
cp .env.example .env   # edit with your local DB URL + JWT secret
npm run seed
npm run dev            # → http://localhost:10000

# Frontend (new terminal)
cd frontend && npm install
npm run dev            # → http://localhost:5173
```

---

## 👤 Default Credentials (change after first login!)

| Role    | Email                          | Password               |
|---------|--------------------------------|------------------------|
| Admin   | kmaisan@dspng.tech             | Admin@Sasingian2026!   |
| Partner | edward@sasingianpng.com        | Edward@Partner2026!    |

---

## 🔢 PNG Payroll — 2026 IRC

```
Tax-free threshold : K20,000/year
Up to K12,500      : 30%  |  K12,501–K20,000 : 35%
K20,001–K33,000    : 40%  |  Over K33,000    : 42%
Employee super: 6.0%  |  Employer super: 8.4%
```

---

## 💰 Render Cost: ~$14/month

| Web Service (Starter) | $7/mo |
| PostgreSQL (Starter)  | $7/mo |

© 2026 Sasingian Lawyers · kmaisan@dspng.tech
