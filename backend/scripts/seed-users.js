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
  { name: 'Admin User',      email: 'kmaisan@dspng.tech',       password: process.env.ADMIN_PASSWORD  || 'Admin@Sasingian2026!', role: 'Admin',   rate: 0.00 },
  { name: 'Edward Sasingian', email: 'edward@sasingianpng.com', password: process.env.EDWARD_PASSWORD || 'Edward@Partner2026!', role: 'Partner', rate: 450.00 },
  { name: 'Flora Sasingian',  email: 'flora@sasingianpng.com',  password: process.env.FLORA_PASSWORD  || 'Flora@Partner2026!',  role: 'Partner', rate: 450.00 },
];

async function seed () {
  console.log('\n🔐  Seeding user passwords and cleaning up…\n');

  // 1. Delete the old Flora email as requested
  try {
    const { rowCount } = await pool.query("DELETE FROM users WHERE email = 'flora@sasingianlawyers.com'");
    if (rowCount > 0) console.log(`  🗑️  Deleted old user flora@sasingianlawyers.com (${rowCount} rows)`);
  } catch (err) {
    console.error('  ⚠️  Error deleting old user:', err.message);
  }

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);

    // Check if user exists
    const { rows } = await pool.query("SELECT id, password_hash FROM users WHERE email = $1", [u.email]);

    if (rows.length === 0) {
      // Create new user
      await pool.query(
        "INSERT INTO users (name, email, password_hash, role, hourly_rate) VALUES ($1, $2, $3, $4, $5)",
        [u.name, u.email, hash, u.role, u.rate]
      );
      console.log(`  ✅  Created user: ${u.email}`);
    } else if (rows[0].password_hash === '$2b$10$PLACEHOLDER' || rows[0].password_hash === null) {
      // Update password for existing placeholder
      await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hash, u.email]);
      console.log(`  ✅  Seeded password for: ${u.email}`);
    } else {
      console.log(`  ℹ️  User already exists and is seeded: ${u.email}`);
    }
  }

  console.log('\n✅  Done.\n');
  await pool.end();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
