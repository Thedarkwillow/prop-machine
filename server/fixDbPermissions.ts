// FILE: server/fixDbPermissions.ts
import { pool } from "./db";

export async function runPermissionFix() {
  try {
    // Try simple read first. If it works, nothing to do.
    await pool.query("SELECT 1;");
    return;
  } catch (_) {
    console.log("🔧 Fixing DB role permissions (first boot)...");
  }

  try {
    await pool.query(`
      ALTER ROLE prop_machine_db_user WITH LOGIN;
      GRANT CONNECT ON DATABASE prop_machine_db TO prop_machine_db_user;
      GRANT USAGE ON SCHEMA public TO prop_machine_db_user;
      GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO prop_machine_db_user;
    `);

    console.log("✅ DB role permissions fixed");
  } catch (err) {
    console.error("❌ Failed applying DB permission fix", err);
  }
}

