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
        const context = string.substring(Math.max(0, offset - 100), offset);
        if (context.includes('kmaisan@dspng.tech')) return "'$2a$10$2E3wKeR3NSEaXWggqq4leuPZbJk5Us0zJaLqKKyP4otxNdQuAo7u.'";
        if (context.includes('edward@sasingianpng.com')) return "'$2a$10$xcWfyYTxBq6rE4mAjly1HO26EKw.gDtHAiHRmAG7Dvo5aI0NmXnnG'";
        if (context.includes('flora@sasingianlawyers.com')) return "'$2a$10$iigTdiLhMhVKtd5.a8196eLfquhF6uMD0O.f1EaqIf8UNNq7hMtz2'";
        return "'$2a$10$2E3wKeR3NSEaXWggqq4leuPZbJk5Us0zJaLqKKyP4otxNdQuAo7u.'";
      });

      // Split schema into individual statements
      const statements = schema
        .replace(/--.*$/gm, '')           // Remove single line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      console.log(`🚀 Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        try {
          await pool.query(statements[i]);
        } catch (stmtErr) {
          console.error(`❌ Error in statement ${i + 1}: ${statements[i].substring(0, 50)}...`);
          console.error(`   Message: ${stmtErr.message}`);

          // Ignore specific common errors that might be non-fatal
          if (statements[i].toUpperCase().includes('CREATE EXTENSION')) {
            console.log('   (Continuing anyway as extension might already exist or be restricted)');
          } else if (stmtErr.message.includes('already exists')) {
            console.log('   (Continuing as object already exists)');
          } else {
            throw stmtErr;
          }
        }
      }

      console.log('✅ Database schema and seed data initialized successfully');
    } else {
      console.log('✅ Database "users" table exists. Skipping initialization.');
    }
  } catch (err) {
    console.error('❌ Database initialization failed!');
    console.error('   Error Stack:', err.stack);
  }
}
