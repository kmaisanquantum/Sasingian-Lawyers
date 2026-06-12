import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error('\n❌ CRITICAL ERROR: DATABASE_URL environment variable is not set!');
  console.error('In production/Docker, you must provide a valid connection string.');
  console.error('Example: postgresql://user:pass@db-host:5432/dbname\n');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => console.log('✅ Database connected'));
pool.on('error',   (err) => {
  console.error('❌ DB error:', err.message);
  if (err.message.includes('ECONNREFUSED')) {
    console.error('👉 Tip: Check if DATABASE_URL is correct and the database is accessible.');
  }
  process.exit(-1);
});

export const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    console.error('Query error:', { text, err: err.message });
    throw err;
  }
};

export const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

export default pool;
