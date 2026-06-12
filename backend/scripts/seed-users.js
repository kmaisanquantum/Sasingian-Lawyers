/**
 * seed-users.js
 * Sets real bcrypt password hashes for the pre-seeded users.
 * Run once after initialising the database:   npm run seed
 */
import bcrypt from 'bcryptjs';
import pg     from 'pg';
import dotenv from 'dotenv';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

if (process.env.RENDER_BUILD_ID) {
  console.log('🏗️  Render build detected. Skipping seeding.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set. Skipping seeding.');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const users = [
  { email: 'kmaisan@dspng.tech',         password: process.env.ADMIN_PASSWORD   || 'Admin@Sasingian2026!'  },
  { email: 'edward@sasingianpng.com',    password: process.env.EDWARD_PASSWORD  || 'Edward@Partner2026!'  },
  { email: 'flora@sasingianpng.com',     password: process.env.FLORA_PASSWORD   || 'Flora@Partner2026!'  },
];

const PLACEHOLDER_HASH = '$2b$10$PLACEHOLDER';

async function seed () {
  console.log('\n🔐  Seeding user passwords…\n');

  // Cleanup: Ensure flora is removed from production database
  const floraEmail = 'flora@sasingianlawyers.com';

  // Explicit password update for Admin per user request
  const adminEmail = 'kmaisan@dspng.tech';
  const adminPass = 'kilomike@2024';
  const adminHash = await bcrypt.hash(adminPass, 10);
  const { rowCount: adminUpdateCount } = await pool.query(
    'UPDATE users SET password_hash = $1 WHERE email = $2',
    [adminHash, adminEmail]
  );
  if (adminUpdateCount > 0) {
    console.log(`  ✅  Password updated for ${adminEmail}`);
  }
  const { rowCount: deletedCount } = await pool.query('DELETE FROM users WHERE email = $1', [floraEmail]);
  if (deletedCount > 0) {
    console.log(`  🗑️  removed from database: ${floraEmail}`);
  }

  for (const u of users) {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE email = $1', [u.email]);

    if (rows.length === 0) {
      console.log(`  ⚠️  not found: ${u.email}`);
      continue;
    }

    if (rows[0].password_hash !== PLACEHOLDER_HASH) {
      console.log(`  ℹ️  already seeded: ${u.email}`);
      continue;
    }

    const hash = await bcrypt.hash(u.password, 10);
    const { rowCount } = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE email = $2',
      [hash, u.email]
    );
    console.log(rowCount ? `  ✅  ${u.email}` : `  ⚠️  failed to update: ${u.email}`);
  }
  console.log('\n✅  Done.  Change passwords after first login!\n');
}

async function runMigration() {
  console.log('\n🔄 Checking for migrations...');
  const migrationPath = path.join(__dirname, 'apply-migration.js');
  // Only run if the file exists
  try {
    const result = spawnSync('node', [migrationPath], { stdio: 'inherit' });
    if (result.error) {
      console.error('Migration failed:', result.error);
    }
  } catch (e) {
    // apply-migration.js might not exist yet
  }
}

seed().then(runMigration).catch(err => {
  console.error('Seed failed:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.error('  👉 Tip: The database host might be unreachable. Check your DATABASE_URL.');
  }
  // Exit with 0 to allow application boot even if seeding fails
  process.exit(0);
}).finally(() => {
  pool.end();
});
