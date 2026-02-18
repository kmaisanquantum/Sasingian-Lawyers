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

      // Robustly split schema into individual statements, respecting $$ blocks
      const statements = [];
      let currentStatement = '';
      let inDollarBlock = false;
      const lines = schema.split('\n');

      for (const line of lines) {
        const cleanLine = line.replace(/--.*$/, '').trim();

        currentStatement += line + '\n';

        if (cleanLine.includes('$$')) {
          const matches = cleanLine.match(/\$\$/g) || [];
          if (matches.length % 2 !== 0) {
            inDollarBlock = !inDollarBlock;
          }
        }

        if (!inDollarBlock && cleanLine.endsWith(';')) {
          const stmt = currentStatement.trim();
          if (stmt) statements.push(stmt);
          currentStatement = '';
        }
      }
      if (currentStatement.trim()) statements.push(currentStatement.trim());

      console.log(`🚀 Executing ${statements.length} SQL statements...`);

      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
          await pool.query(stmt);
        } catch (stmtErr) {
          // Identify if error is fatal
          const isExtension = stmt.toUpperCase().includes('CREATE EXTENSION');
          const isAlreadyExists = stmtErr.message.includes('already exists');

          if (isExtension || isAlreadyExists) {
            console.log(`   ⚠️  Stmt ${i + 1} skipped: ${stmtErr.message}`);
          } else {
            console.error(`❌ Fatal error in stmt ${i + 1}:\n${stmt.substring(0, 200)}...`);
            console.error(`   Message: ${stmtErr.message}`);
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
    console.error('   Error Message:', err.message);
    console.error('   Error Stack:', err.stack);
  }
}
