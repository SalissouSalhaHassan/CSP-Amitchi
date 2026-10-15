import postgres from "postgres";

const connectionString = 
  process.env.REMOTE_DATABASE_URL || 
  process.env.DATABASE_URL || 
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

console.log("📊 Connecting to Supabase Remote DB to fetch Promotion des Élèves statistics...");
const client = postgres(connectionString, { prepare: false, ssl: { rejectUnauthorized: false } });

async function getPromotionStats() {
  try {
    // 1. Inspect columns of students table
    const columnsRes = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'students';
    `;
    const colNames = columnsRes.map(c => c.column_name);

    // Total registered students
    const totalStudentsRes = await client`SELECT COUNT(*)::int as count FROM students;`;
    const totalStudents = totalStudentsRes[0].count;

    // Breakdown by Class
    const classBreakdown = await client`
      SELECT classe, COUNT(*)::int as count
      FROM students
      GROUP BY classe
      ORDER BY count DESC;
    `;

    console.log("\n=======================================================");
    console.log("🎓 RAPPORT DES STATISTIQUES DE PROMOTION DES ÉLÈVES");
    console.log("=======================================================");
    console.log(`📌 Nombre total d'élèves inscrits : ${totalStudents}`);
    console.log("-------------------------------------------------------");
    console.log("🏫 DÉTAIL D'EFFECTIF PAR CLASSE :");
    console.table(classBreakdown.map(r => ({
      Classe: r.classe || "Non assignée",
      "Total Élèves": r.count
    })));
    console.log("=======================================================\n");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error fetching promotion stats:", err);
    process.exit(1);
  }
}

getPromotionStats();
