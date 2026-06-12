import pg     from 'pg';
import fs     from 'fs';
import path   from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

if (process.env.RENDER_BUILD_ID) {
  console.log('🏗️  Render build detected. Skipping database initialization.');
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL is not set. Skipping database initialization.');
  process.exit(1);
}

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
    if (err.message.includes('ECONNREFUSED')) {
      console.error('  👉 Tip: The database host might be unreachable. Check your DATABASE_URL.');
    }
    throw err;
  } finally {
    await pool.end();
  }
}

initDb().catch(err => {
  console.error('Database initialization failed:', err.message);
  // Exit with 0 to allow application boot even if DB init fails (the server will then fail clearly)
  process.exit(0);
});
