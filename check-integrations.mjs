import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function checkIntegrations() {
  console.log("Checking integrations...\n");

  try {
    const integrations = await sql`SELECT * FROM integrations;`;
    console.log("Integrations count:", integrations.length);
    
    if (integrations.length > 0) {
      console.log("\nIntegrations:");
      integrations.forEach((i, idx) => {
        console.log(`\n--- Integration ${idx + 1} ---`);
        console.log("ID:", i.id);
        console.log("User ID:", i.user_id);
        console.log("Provider:", i.provider);
        console.log("Provider Username:", i.provider_username);
        console.log("Is Active:", i.is_active);
        console.log("Created At:", i.created_at);
      });
    } else {
      console.log("No integrations found.");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

checkIntegrations();
