import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function dbInit(pool) {
  try {
    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE  table_schema = 'public'
        AND    table_name   = 'users'
      );
    `);

    if (!rows[0].exists) {
      console.log('🔄 Database table "users" not found. Initializing schema...');

      const schemaPath = path.join(__dirname, '../../database/schema.sql');
      let schema = fs.readFileSync(schemaPath, 'utf8');

      // Replace placeholder hashes with real ones
      schema = schema.replace(/'\$2b\$10\$PLACEHOLDER'/g, (match, offset, string) => {
        // Find which user we are replacing for by looking back in the string
        const context = string.substring(Math.max(0, offset - 100), offset);
        if (context.includes('kmaisan@dspng.tech')) return "'$2a$10$2E3wKeR3NSEaXWggqq4leuPZbJk5Us0zJaLqKKyP4otxNdQuAo7u.'";
        if (context.includes('edward@sasingianpng.com')) return "'$2a$10$xcWfyYTxBq6rE4mAjly1HO26EKw.gDtHAiHRmAG7Dvo5aI0NmXnnG'";
        if (context.includes('flora@sasingianlawyers.com')) return "'$2a$10$iigTdiLhMhVKtd5.a8196eLfquhF6uMD0O.f1EaqIf8UNNq7hMtz2'";
        return "'$2a$10$2E3wKeR3NSEaXWggqq4leuPZbJk5Us0zJaLqKKyP4otxNdQuAo7u.'"; // Default to admin
      });

      // Execute the schema
      // We use a single query call for the whole schema.
      // Note: pg handles multiple statements in a single string.
      await pool.query(schema);

      console.log('✅ Database schema and seed data initialized successfully');
    } else {
      console.log('✅ Database "users" table exists. Skipping initialization.');
    }
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    // We don't throw here to allow the server to still try and start,
    // though it will likely fail later if the DB is truly broken.
  }
}
