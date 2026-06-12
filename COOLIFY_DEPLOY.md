# Deploying to Coolify

This guide explains how to deploy the Sasingian Lawyers Legal Practice Management System to a Coolify instance.

## 1. Prerequisites

- A Coolify instance set up and running.
- A PostgreSQL database (can be hosted on Coolify or elsewhere).

## 2. Deployment Steps

### Step 1: Create a New Project & Resource
1. In Coolify, create a new **Project**.
2. Add a new **Resource** -> **Public Repository**.
3. Enter the repository URL.

### Step 2: Configuration
1. **Build Pack**: Select Dockerfile.
2. **Ports**: Ensure the port is set to 3000.
3. **Internal Port**: 3000.

### Step 3: Environment Variables
Add the following environment variables in the Environment Variables tab:

| Key | Value | Description |
|---|---|---|
| NODE_ENV | production | Set to production |
| PORT | 3000 | The port the app listens on |
| DATABASE_URL | postgresql://user:pass@host:port/db | Your PostgreSQL connection string |
| JWT_SECRET | (generate random 64-char hex) | Used for signing tokens |
| JWT_EXPIRE | 7d | Token expiration |
| CORS_ORIGIN | https://your-domain.com | Your public domain |
| ADMIN_PASSWORD | (your secure admin password) | Initial admin password |
| EDWARD_PASSWORD | (your secure edward password) | Initial partner password |

### Step 4: Database Initialization
Coolify will automatically build and start the container. The application is configured to run database initialization and seeding scripts on startup (npm start in backend/package.json calls init-db and seed).

To manually run the initialization if needed (via Coolify Terminal or Docker exec):
1. SSH/Terminal into the container.
2. Run:
   cd /app/backend
   npm run init-db
   npm run seed

## 3. Domain Setup
1. In the Coolify resource settings, go to the Domains tab.
2. Enter your custom domain (e.g., https://app.sasingianlawyers.com).
3. Coolify will handle the SSL certificate via Traefik.

## 4. Troubleshooting

### ECONNREFUSED Errors
If you see `ECONNREFUSED` or `AggregateError [ECONNREFUSED]` in the logs:
1. **Check DATABASE_URL**: Ensure it is NOT pointing to `localhost` or `127.0.0.1`. Inside a Docker container, `localhost` refers to the container itself, not your server or the database container.
2. **Database Accessibility**: Ensure your database is accessible from the Coolify application container. If using another Coolify resource, use its internal network address.
3. **Internal Network**: If the database is also in Coolify, you can use the service name as the host (e.g., `postgresql://user:pass@database:5432/dbname`).

### Port Conflicts
If port 3000 is taken, you can change the PORT env var and the Coolify port configuration.

### Missing Environment Variables
If the app crashes with "CRITICAL ERROR: DATABASE_URL is not set", ensure you have added all variables in Step 3 and clicked **Save**.
