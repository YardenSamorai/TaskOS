import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function createTable() {
  try {
    console.log('Creating user_notification_preferences table...');
    
    await sql`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_task_assigned BOOLEAN NOT NULL DEFAULT true,
        email_task_completed BOOLEAN NOT NULL DEFAULT true,
        email_task_due_soon BOOLEAN NOT NULL DEFAULT true,
        email_new_comment BOOLEAN NOT NULL DEFAULT true,
        email_mentions BOOLEAN NOT NULL DEFAULT true,
        push_enabled BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      )
    `;
    
    console.log('✅ Table created successfully!');
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('✅ Table already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

createTable();
