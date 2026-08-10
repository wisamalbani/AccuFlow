import { config } from "dotenv";
config();
import { Client } from "pg";

async function run() {
  const connectionString = process.env.SUPABASE_URL!.replace("https://", "postgres://postgres:").replace(".supabase.co", "") + "@" + process.env.SUPABASE_URL!.replace("https://", "db.").replace(".supabase.co", ".supabase.co:5432/postgres");
  // wait, I don't have the password. I only have SUPABASE_KEY.
  // Actually, I can't connect via pg without the postgres password.
  console.log("No password available");
}
run();
