/**
 * seed-users.js
 * Sets real bcrypt password hashes for the three pre-seeded users.
 * Run once after initialising the database:   npm run seed
 */
import bcrypt from 'bcryptjs';
import pg     from 'pg';
import dotenv from 'dotenv';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

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
  { email: 'flora@sasingianlawyers.com', password: process.env.FLORA_PASSWORD   || 'Flora@Partner2026!'   },
];

const PLACEHOLDER_HASH = '$2b$10$PLACEHOLDER';

async function seed () {
  console.log('\n🔐  Seeding user passwords…\n');
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
  const result = spawnSync('node', [path.join(__dirname, 'apply-migration.js')], { stdio: 'inherit' });
  if (result.error) {
    console.error('Migration failed:', result.error);
  }
}

seed().then(runMigration).catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
}).finally(() => {
  pool.end();
});
