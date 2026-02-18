/**
 * Security hardening migration script.
 * Adds audit_logs table and new columns to api_keys.
 *
 * Run: node migrate-security.mjs
 */
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function migrate() {
  console.log("Connected to database");

  try {
    // Add new columns to api_keys table
    console.log("Adding new columns to api_keys...");
    await sql`
      ALTER TABLE api_keys
        ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        ADD COLUMN IF NOT EXISTS scopes TEXT NOT NULL DEFAULT '["read:tasks"]',
        ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS api_keys_workspace_id_idx ON api_keys(workspace_id)
    `;

    // Create audit_logs table
    console.log("Creating audit_logs table...");
    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50) NOT NULL,
        entity_id UUID,
        metadata TEXT,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS audit_workspace_created_idx
        ON audit_logs(workspace_id, created_at)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS audit_user_created_idx
        ON audit_logs(user_id, created_at)
    `;

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

migrate();
