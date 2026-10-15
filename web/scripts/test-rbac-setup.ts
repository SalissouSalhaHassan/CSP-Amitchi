import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("❌ DATABASE_URL is not defined in .env.local");
  process.exit(1);
}

const isSupabase = connectionString.includes("supabase.co") || connectionString.includes("supabase.com");

const client = postgres(connectionString, {
  prepare: false,
  ssl: isSupabase ? { rejectUnauthorized: false } : false,
});

async function setupTestRBAC() {
  console.log("🚀 Setting up RBAC Test Environment...");

  try {
    // 1. Create a "Restricted Role" if not exists
    const roles_result = await client`
      INSERT INTO roles (role_name, description) 
      VALUES ('Test_Viewer', 'Role with view-only access to Students')
      ON CONFLICT (role_name) DO UPDATE SET description = EXCLUDED.description
      RETURNING id;
    `;

    const roleId = roles_result[0].id;

    // 2. Assign View-only permissions for Students
    await client`
      INSERT INTO role_permissions (role_id, module_name, can_view, can_edit, can_delete)
      VALUES (${roleId}, 'Students', true, false, false)
      ON CONFLICT DO NOTHING;
    `;

    // 3. Create a Test User
    await client`
      INSERT INTO users (utilisateur, nom_prenom, mot_de_passe, admin, role_id)
      VALUES ('viewer@test.com', 'Test Viewer User', 'password123', false, ${roleId})
      ON CONFLICT (utilisateur) DO UPDATE SET role_id = EXCLUDED.role_id;
    `;

    console.log("✅ Setup Complete!");
    console.log("");
    console.log("📝 HOW TO TEST:");
    console.log("1. Open http://localhost:3000");
    console.log("2. Login with:");
    console.log("   - Email: viewer@test.com");
    console.log("   - Password: password123");
    console.log("3. Go to the 'Students' page.");
    console.log("4. VERIFY: The 'Add Student' button is HIDDEN.");
    console.log("5. VERIFY: The 'Edit' and 'Delete' icons in the list are HIDDEN.");
  } catch (error) {
    console.error("❌ Setup Failed:", error);
  } finally {
    await client.end();
  }
}

setupTestRBAC();
