import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function init() {
  console.log('🔑 Env keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_') && !k.startsWith('NODE_')).join(', '));
  console.log('🔍 Checking database schema...');
  try {
    const { rows } = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'");

    if (rows.length > 0) {
      console.log('✅ Database already initialized.');
      await pool.end();
      return;
    }

    console.log('⏳ Initializing database schema...');
    const schemaPath = path.join(__dirname, '../../database/schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // pg.query can execute multiple statements if they are not prepared
    await pool.query(schema);

    console.log('✅ Database initialization complete.');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
  } finally {
    await pool.end();
  }
}

init();
