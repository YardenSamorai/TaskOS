import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function debugIntegrations() {
  console.log("=== DEBUG INTEGRATIONS ===\n");

  try {
    // 1. Check integrations table
    console.log("1. All integrations:");
    const integrations = await sql`SELECT * FROM integrations;`;
    console.log("Count:", integrations.length);
    if (integrations.length > 0) {
      integrations.forEach((i, idx) => {
        console.log(`\n  Integration ${idx + 1}:`);
        console.log(`    ID: ${i.id}`);
        console.log(`    User ID: ${i.user_id}`);
        console.log(`    Provider: ${i.provider}`);
        console.log(`    Provider Username: ${i.provider_username}`);
        console.log(`    Workspace ID: ${i.workspace_id || 'NULL (global)'}`);
        console.log(`    Is Active: ${i.is_active}`);
        console.log(`    Created At: ${i.created_at}`);
      });
    } else {
      console.log("  No integrations found");
    }

    // 2. Check all users
    console.log("\n\n2. All users:");
    const users = await sql`SELECT id, email, name FROM users LIMIT 10;`;
    users.forEach(u => {
      console.log(`  - ${u.email} (${u.id})`);
    });

    // 3. Check table structure
    console.log("\n\n3. Integrations table columns:");
    const columns = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'integrations'
      ORDER BY ordinal_position;
    `;
    columns.forEach(c => {
      console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
    });

  } catch (error) {
    console.error("Error:", error);
  }
}

debugIntegrations();
