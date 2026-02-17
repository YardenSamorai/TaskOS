import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in .env.local');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function createAgentProfilesTable() {
  try {
    // Create the enum type
    console.log("Creating agent_profile_type enum...");
    await sql`
      DO $$ BEGIN
        CREATE TYPE agent_profile_type AS ENUM ('code_review', 'code_style');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    console.log("✅ Enum created (or already exists)");

    // Create the table
    console.log("Creating agent_profiles table...");
    await sql`
      CREATE TABLE IF NOT EXISTS agent_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        type agent_profile_type NOT NULL,
        name varchar(255) NOT NULL,
        config text NOT NULL,
        is_default boolean NOT NULL DEFAULT false,
        created_by uuid NOT NULL REFERENCES users(id),
        created_at timestamp with time zone DEFAULT now() NOT NULL,
        updated_at timestamp with time zone DEFAULT now() NOT NULL
      );
    `;
    console.log("✅ agent_profiles table created!");

    // Create index
    console.log("Creating indexes...");
    await sql`
      CREATE INDEX IF NOT EXISTS agent_profile_workspace_type_idx 
      ON agent_profiles(workspace_id, type);
    `;
    console.log("✅ Index created!");

    // Verify
    const result = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'agent_profiles'
      ORDER BY ordinal_position;
    `;
    console.log("\n📋 Table columns:");
    result.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type})`);
    });

    return true;
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

createAgentProfilesTable()
  .then(() => {
    console.log("\n🎉 Migration completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration failed:", error);
    process.exit(1);
  });
