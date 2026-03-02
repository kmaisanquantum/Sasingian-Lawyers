/**
 * seed-users.js
 * Sets real bcrypt password hashes for the three pre-seeded users.
 * Run once after initialising the database:   npm run seed
 */
import bcrypt from 'bcryptjs';
import pg     from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const users = [
  { email: 'kmaisan@dspng.tech',         password: process.env.ADMIN_PASSWORD   || 'Admin@Sasingian2026!'  },
  { email: 'edward@sasingianpng.com',    password: process.env.EDWARD_PASSWORD  || 'Edward@Partner2026!'  },
  { email: 'flora@sasingianpng.com',     password: process.env.FLORA_PASSWORD   || 'Flora@Partner2026!'   },
];

async function seed () {
  console.log('\n🔐  Seeding user passwords…\n');

  // Fix Flora email if old one exists
  try {
    const { rowCount } = await pool.query(
      "UPDATE users SET email = 'flora@sasingianpng.com' WHERE email = 'flora@sasingianlawyers.com'"
    );
    if (rowCount > 0) console.log('  ✅  Updated Flora email in database');
  } catch (err) {
    console.error('  ⚠️  Could not update Flora email:', err.message);
  }

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const { rowCount } = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2 AND (password_hash = '$2b$10$PLACEHOLDER' OR password_hash IS NULL)",
      [hash, u.email]
    );
    console.log(rowCount ? `  ✅  ${u.email}` : `  ⚠️  already seeded or not found: ${u.email}`);
  }
  console.log('\n✅  Done.  Change passwords after first login!\n');
  await pool.end();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
