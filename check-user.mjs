import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL);

async function checkUsers() {
  console.log("Checking users in database...\n");
  
  try {
    const users = await sql`SELECT id, name, email, plan, created_at FROM users ORDER BY created_at DESC LIMIT 10`;
    
    console.log("Recent users:");
    users.forEach((user, i) => {
      console.log(`${i + 1}. ${user.name || "(no name)"} - ${user.email} (${user.plan}) - Created: ${new Date(user.created_at).toLocaleString()}`);
    });
    
    console.log("\nTotal users:", users.length);
  } catch (error) {
    console.error("Error:", error);
  }
}

checkUsers();
