import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log('🚀 Starting Payroll & HR Migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- Updating users table ---');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS designation VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS bank_account_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS bank_account_name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS bar_dues DECIMAL(12,2) DEFAULT 0.00
    `);

    console.log('--- Updating payroll table ---');
    await client.query(`
      ALTER TABLE payroll
      ADD COLUMN IF NOT EXISTS leave_deductions DECIMAL(12,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS performance_bonus DECIMAL(12,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS bar_dues DECIMAL(12,2) DEFAULT 0.00
    `);

    console.log('--- Creating staff_documents table ---');
    await client.query(`
      CREATE TABLE IF NOT EXISTS staff_documents (
          id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          staff_id      UUID REFERENCES users(id) ON DELETE CASCADE,
          category      VARCHAR(100) NOT NULL CHECK (category IN ('Payslip','Contract','Identification','Other')),
          file_name     VARCHAR(255) NOT NULL,
          file_path     TEXT NOT NULL,
          uploaded_by   UUID REFERENCES users(id),
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_staff_docs_staff ON staff_documents(staff_id)`);

    console.log('--- Creating vw_staff_productivity view ---');
    await client.query(`
      CREATE OR REPLACE VIEW vw_staff_productivity AS
      SELECT
          u.id AS staff_id,
          u.name AS staff_name,
          u.role,
          u.hourly_rate,
          COALESCE(SUM(te.hours), 0) AS total_hours,
          COALESCE(SUM(te.hours * te.hourly_rate), 0) AS billable_value,
          COUNT(DISTINCT te.matter_id) AS matters_worked_on
      FROM users u
      LEFT JOIN time_entries te ON u.id = te.user_id
      GROUP BY u.id, u.name, u.role, u.hourly_rate
    `);

    await client.query('COMMIT');
    console.log('✅ Migration completed successfully.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
