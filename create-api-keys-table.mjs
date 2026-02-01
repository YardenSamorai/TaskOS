import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

// Load environment variables from .env.local
config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function createApiKeysTable() {
  try {
    console.log("Creating api_keys table...");

    // Create the table
    await sql`
      CREATE TABLE IF NOT EXISTS api_keys (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        key_hash varchar(255) NOT NULL UNIQUE,
        name varchar(255) NOT NULL,
        last_used_at timestamp with time zone,
        expires_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON api_keys(user_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS api_keys_key_hash_idx ON api_keys(key_hash);
    `;

    console.log("✅ api_keys table created successfully!");
    console.log("✅ Indexes created successfully!");
    
    return true;
  } catch (error) {
    console.error("❌ Error creating api_keys table:", error);
    throw error;
  }
}

// Run the migration
createApiKeysTable()
  .then(() => {
    console.log("\n🎉 Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });
