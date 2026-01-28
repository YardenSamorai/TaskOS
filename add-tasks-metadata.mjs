import { neon } from '@neondatabase/serverless';
import 'dotenv/config';

const sql = neon(process.env.DATABASE_URL);

async function migrate() {
  console.log('🚀 Adding metadata column to tasks table...\n');

  try {
    // Check if column already exists
    const checkColumn = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'tasks' AND column_name = 'metadata'
    `;

    if (checkColumn.length > 0) {
      console.log('✅ Column "metadata" already exists in tasks table');
      return;
    }

    // Add the metadata column
    await sql`
      ALTER TABLE tasks 
      ADD COLUMN metadata TEXT
    `;

    console.log('✅ Successfully added "metadata" column to tasks table');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

migrate();
