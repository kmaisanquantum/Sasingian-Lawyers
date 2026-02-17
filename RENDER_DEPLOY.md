# Render.com Deployment Guide
## Sasingian Lawyers — Legal Practice Management System

---

## Architecture on Render

```
GitHub Repo
    │
    ▼
Render Blueprint (render.yaml)
    │
    ├─► Web Service: sasingian-api  (Singapore region)
    │       Node 18 · Starter $7/mo
    │       BUILD:  install backend + build React → copy dist to backend/public
    │       START:  node backend/server.js
    │       SERVES: /api/* routes  +  React SPA on all other paths
    │
    └─► PostgreSQL: sasingian-db   (Singapore region)
            Managed · Starter $7/mo · Daily backups
            Internal URL auto-injected as DATABASE_URL
```

**Total estimated cost: ~$14/month** (2 × Starter plans)

---

## Method A — Blueprint Deploy (Recommended, 1-click)

The `render.yaml` file in the project root is a Render Blueprint. It defines
both services and wires them together automatically.

### Steps

#### 1. Push to GitHub
```bash
cd sasingian-final
git init
git add .
git commit -m "Initial commit — Sasingian Lawyers"

# Create a GitHub repo, then:
git remote add origin https://github.com/YOUR_USERNAME/sasingian-lawyers.git
git branch -M main
git push -u origin main
```

#### 2. Connect to Render
1. Go to **https://dashboard.render.com**
2. Click **New +** → **Blueprint**
3. Connect your GitHub account if prompted
4. Select the `sasingian-lawyers` repository
5. Render reads `render.yaml` and shows you a preview of the two services
6. Click **Apply**

Render will now:
- Create the PostgreSQL database (`sasingian-db`)
- Create the Web Service (`sasingian-api`)
- Wire `DATABASE_URL` between them automatically
- Kick off the first build

#### 3. Set Secret Environment Variables

The Blueprint sets most variables, but secrets with `sync: false` must be
added manually:

1. In Render Dashboard → `sasingian-api` → **Environment**
2. Add each of these (click **Add Environment Variable**):

| Key              | Value                                          |
|------------------|------------------------------------------------|
| `JWT_SECRET`     | *(run locally)* `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `ADMIN_PASSWORD` | Your secure admin password                     |
| `EDWARD_PASSWORD`| Edward's initial password                      |
| `FLORA_PASSWORD` | Flora's initial password                       |

3. Click **Save Changes** — Render will redeploy automatically.

#### 4. Initialise the Database

After the first successful deploy:

**Option A — Render Shell (easiest)**
1. In Dashboard → `sasingian-api` → **Shell** tab
2. Run:
```bash
# Upload and run the schema (paste the SQL directly)
psql $DATABASE_URL < /opt/render/project/src/database/schema.sql
```

**Option B — Render CLI**
```bash
# Install Render CLI
npm install -g @render-cli/cli

# Log in
render login

# SSH into the service
render ssh sasingian-api

# Inside the shell:
psql $DATABASE_URL < /opt/render/project/src/database/schema.sql
```

**Option C — External DB client**
1. In Dashboard → `sasingian-db` → **Info** → copy **External Database URL**
2. Open pgAdmin, TablePlus, or DBeaver
3. Connect using the external URL
4. Open and run `database/schema.sql`

#### 5. Seed User Passwords

In the Render Shell for `sasingian-api`:
```bash
cd /opt/render/project/src/backend
npm run seed
```

Output should show:
```
✅  kmaisan@dspng.tech
✅  edward@sasingianpng.com
✅  flora@sasingianlawyers.com
```

#### 6. Add Custom Domain

1. In Dashboard → `sasingian-api` → **Settings** → **Custom Domains**
2. Click **Add Custom Domain**
3. Enter: `app.sasingianlawyers.com`
4. Render gives you a CNAME value. Add it to your DNS:

```
Type:  CNAME
Name:  app
Value: sasingian-api.onrender.com   ← (use the exact value Render gives you)
TTL:   300
```

5. Wait for DNS propagation (usually 5–30 minutes)
6. Render automatically provisions an SSL certificate via Let's Encrypt

#### 7. Update CORS After Getting Your URL

Once your service is live, update `CORS_ORIGIN` in the environment:
```
CORS_ORIGIN=https://app.sasingianlawyers.com
```

---

## Method B — Manual Deploy (Without Blueprint)

If you prefer to set up services individually:

### Create PostgreSQL Database

1. Dashboard → **New +** → **PostgreSQL**
2. Name: `sasingian-db`
3. Database: `sasingian_legal`
4. User: `sasingian_app`
5. Region: **Singapore**
6. Plan: **Starter** ($7/mo)
7. Click **Create Database**
8. Note the **Internal Database URL** — you'll need it next.

### Create Web Service

1. Dashboard → **New +** → **Web Service**
2. Connect your GitHub repo
3. Settings:

| Field              | Value                                                                 |
|--------------------|-----------------------------------------------------------------------|
| Name               | `sasingian-api`                                                       |
| Region             | Singapore                                                             |
| Branch             | `main`                                                                |
| Runtime            | Node                                                                  |
| Build Command      | `cd backend && npm install && cd ../frontend && npm install && npm run build && cp -r dist ../backend/public` |
| Start Command      | `cd backend && npm start`                                             |
| Plan               | Starter                                                               |
| Health Check Path  | `/health`                                                             |

4. Under **Environment Variables**, add:

| Key              | Value                                                   |
|------------------|---------------------------------------------------------|
| `NODE_ENV`       | `production`                                            |
| `PORT`           | `10000`                                                 |
| `DATABASE_URL`   | *(paste the Internal Database URL from the DB service)* |
| `JWT_SECRET`     | *(64-char random hex)*                                  |
| `JWT_EXPIRE`     | `7d`                                                    |
| `CORS_ORIGIN`    | `https://app.sasingianlawyers.com`                      |
| `RATE_LIMIT`     | `100`                                                   |
| `ADMIN_PASSWORD` | *(your choice)*                                         |
| `EDWARD_PASSWORD`| *(your choice)*                                         |
| `FLORA_PASSWORD` | *(your choice)*                                         |

5. Click **Create Web Service**

---

## Post-Deploy Verification

### Health Check
```bash
curl https://app.sasingianlawyers.com/health
# Expected: {"status":"OK","timestamp":"...","env":"production","version":"1.0.0"}
```

### Test Login
```bash
curl -X POST https://app.sasingianlawyers.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"edward@sasingianpng.com","password":"Edward@Partner2026!"}'
```

### Test Payroll Calculator
```bash
TOKEN="paste-your-token-here"

curl -X POST https://app.sasingianlawyers.com/api/payroll/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"grossPay":2000,"payFrequency":"Fortnightly"}'
```

---

## Local Development

```bash
# 1. Database (local PostgreSQL)
createdb sasingian_legal
psql -d sasingian_legal -f database/schema.sql

# 2. Backend
cd backend
npm install
cp .env.example .env
# Edit .env:
#   DATABASE_URL=postgresql://localhost/sasingian_legal
#   JWT_SECRET=any-long-random-string-for-dev
#   NODE_ENV=development
#   CORS_ORIGIN=http://localhost:5173
npm run seed
npm run dev          # → http://localhost:10000

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev          # → http://localhost:5173  (proxies /api to port 10000)
```

---

## Default Credentials

> ⚠️ **Change all passwords immediately after first login via the app.**

| Role    | Email                          | Default Password       |
|---------|--------------------------------|------------------------|
| Admin   | `kmaisan@dspng.tech`           | `Admin@Sasingian2026!` |
| Partner | `edward@sasingianpng.com`      | `Edward@Partner2026!`  |
| Partner | `flora@sasingianlawyers.com`   | `Flora@Partner2026!`   |

---

## Render Free Tier vs Paid

| Feature               | Free              | Starter ($7/mo)      |
|-----------------------|-------------------|----------------------|
| Sleep after inactivity| Yes (15 min)      | ❌ Always on          |
| Build minutes         | 500/month         | Unlimited            |
| Bandwidth             | 100 GB/month      | 500 GB/month         |
| Custom domain + SSL   | ✅                | ✅                    |
| Suitable for prod?    | Dev/testing only  | ✅ Yes                |

**Recommendation:** Use Starter plan for both services (~$14/mo total).

---

## Monitoring & Logs

- **Logs**: Dashboard → `sasingian-api` → **Logs** tab (live tail)
- **Metrics**: Dashboard → `sasingian-api` → **Metrics** (CPU, memory, requests)
- **Deploys**: Dashboard → `sasingian-api` → **Events** (history of all deploys)
- **DB**: Dashboard → `sasingian-db` → **Metrics** (connections, storage)

Set up email alerts:
Dashboard → Account Settings → **Notifications** → enable deploy failure alerts.

---

## Database Backups

Render Starter PostgreSQL includes **daily automated backups** retained for 7 days.

Manual backup at any time:
```bash
# From Render Shell or local machine with external URL
pg_dump $DATABASE_URL -F c -f sasingian_backup_$(date +%Y%m%d).dump
```

---

## Troubleshooting

### Build fails — "Cannot find module"
Make sure the build command runs from the repo root:
```
cd backend && npm install && cd ../frontend && npm install && npm run build && cp -r dist ../backend/public
```

### 502 Bad Gateway
Check logs for startup errors. Most common causes:
- `DATABASE_URL` not set or wrong
- Port mismatch (Render expects the app to listen on `$PORT`)

### Login returns 401
Run the seed script again from the Shell:
```bash
cd /opt/render/project/src/backend && npm run seed
```

### CORS errors in browser
Update `CORS_ORIGIN` in environment to exactly match your live URL (no trailing slash).

### Database "relation does not exist"
The schema hasn't been run yet. Execute `database/schema.sql` against the DB.

---

## Useful Links

| Resource                  | URL                                              |
|---------------------------|--------------------------------------------------|
| Render Dashboard          | https://dashboard.render.com                    |
| Render Blueprint Docs     | https://render.com/docs/blueprint-spec           |
| Render PostgreSQL Docs    | https://render.com/docs/databases                |
| Render Custom Domains     | https://render.com/docs/custom-domains           |
| Render CLI                | https://render.com/docs/cli                      |
| Support                   | kmaisan@dspng.tech                               |

---

© 2026 Sasingian Lawyers · Port Moresby, Papua New Guinea
