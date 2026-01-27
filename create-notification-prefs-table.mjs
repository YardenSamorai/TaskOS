import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);

async function createTable() {
  try {
    console.log('Dropping old table if exists...');
    await sql`DROP TABLE IF EXISTS user_notification_preferences`;
    
    console.log('Creating user_notification_preferences table...');
    
    await sql`
      CREATE TABLE user_notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        email_notifications BOOLEAN NOT NULL DEFAULT true,
        task_assigned BOOLEAN NOT NULL DEFAULT true,
        task_completed BOOLEAN NOT NULL DEFAULT true,
        task_due_soon BOOLEAN NOT NULL DEFAULT true,
        mentions BOOLEAN NOT NULL DEFAULT true,
        comments BOOLEAN NOT NULL DEFAULT true,
        weekly_digest BOOLEAN NOT NULL DEFAULT true,
        marketing_emails BOOLEAN NOT NULL DEFAULT false,
        push_notifications BOOLEAN NOT NULL DEFAULT true,
        desktop_notifications BOOLEAN NOT NULL DEFAULT true,
        sound_enabled BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `;
    
    console.log('✅ Table created successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTable();
