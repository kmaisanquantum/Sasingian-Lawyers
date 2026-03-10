import pg     from 'pg';
if (process.env.RENDER_BUILD_ID) {
  console.log('🏗️  Render build detected. Skipping database initialization.');
  process.exit(0);
}

import fs     from 'fs';
import path   from 'path';
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

async function initDb() {
  console.log('\n🗄️  Initializing database schema…\n');

  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schema);
    console.log('  ✅  Schema applied successfully.');
  } catch (err) {
    console.error('  ❌  Failed to apply schema:', err.message);
    throw err;
  } finally {
    await pool.end();
  }
}

initDb().catch(err => {
  console.error('Database initialization failed:', err);
  // Exit with 0 to allow application boot even if DB init fails (e.g. during pre-boot checks)
  process.exit(0);
});
