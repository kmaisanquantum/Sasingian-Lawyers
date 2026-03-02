import pg     from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runReminders() {
  console.log('⏰ Running Statute of Limitations reminders...');

  try {
    const { rows } = await pool.query(`
      SELECT m.case_number, m.matter_name, m.statute_of_limitations, u.email, u.name as partner_name
      FROM matters m
      JOIN users u ON m.assigned_partner_id = u.id
      WHERE m.statute_of_limitations IS NOT NULL
        AND m.status = 'Open'
        AND (
          m.statute_of_limitations = CURRENT_DATE + INTERVAL '30 days' OR
          m.statute_of_limitations = CURRENT_DATE + INTERVAL '7 days' OR
          m.statute_of_limitations = CURRENT_DATE + INTERVAL '1 day'
        )
    `);

    if (rows.length === 0) {
      console.log('  No upcoming deadlines requiring reminders today.');
      return;
    }

    for (const row of rows) {
      console.log(`  [REMINDER] Sending to ${row.email} for matter ${row.case_number}: Deadline ${row.statute_of_limitations}`);
      // In a real system, we'd use nodemailer or a service like SendGrid here.
      // For this implementation, we log the intent.
    }

    console.log(`✅ Processed ${rows.length} reminders.`);
  } catch (err) {
    console.error('❌ Failed to run reminders:', err.message);
  } finally {
    await pool.end();
  }
}

runReminders();
