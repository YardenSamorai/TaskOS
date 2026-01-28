import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function createIntegrationsTables() {
  console.log("Checking and creating integrations tables...\n");

  try {
    // Check if integrations table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'integrations'
      );
    `;

    if (tableExists[0].exists) {
      console.log("✅ integrations table already exists");
      
      // Check columns
      const columns = await sql`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'integrations';
      `;
      console.log("Columns:", columns.map(c => c.column_name).join(", "));
    } else {
      console.log("Creating integrations table...");
      
      await sql`
        CREATE TABLE IF NOT EXISTS integrations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
          provider VARCHAR(50) NOT NULL,
          provider_account_id VARCHAR(255),
          provider_username VARCHAR(255),
          access_token TEXT,
          refresh_token TEXT,
          token_expires_at TIMESTAMPTZ,
          scope TEXT,
          metadata TEXT,
          is_active BOOLEAN NOT NULL DEFAULT true,
          last_sync_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      
      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS integrations_user_id_idx ON integrations(user_id);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS integrations_provider_idx ON integrations(provider);
      `;
      
      console.log("✅ integrations table created!");
    }

    // Check if linked_repositories table exists
    const repoTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'linked_repositories'
      );
    `;

    if (repoTableExists[0].exists) {
      console.log("✅ linked_repositories table already exists");
    } else {
      console.log("Creating linked_repositories table...");
      
      await sql`
        CREATE TABLE IF NOT EXISTS linked_repositories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
          workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
          external_id VARCHAR(255) NOT NULL,
          name VARCHAR(255) NOT NULL,
          full_name VARCHAR(500),
          url TEXT,
          default_branch VARCHAR(100),
          is_private BOOLEAN DEFAULT false,
          last_sync_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;
      
      // Create indexes
      await sql`
        CREATE INDEX IF NOT EXISTS linked_repos_integration_idx ON linked_repositories(integration_id);
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS linked_repos_workspace_idx ON linked_repositories(workspace_id);
      `;
      
      console.log("✅ linked_repositories table created!");
    }

    console.log("\n✅ All done!");
  } catch (error) {
    console.error("Error:", error);
  }
}

createIntegrationsTables();
