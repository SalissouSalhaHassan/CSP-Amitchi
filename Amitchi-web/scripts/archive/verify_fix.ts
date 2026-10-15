import postgres from "postgres";

const remoteUrl =
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  try {
    // فحص أعمدة users
    const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position`;
    console.log("users columns:", cols.map((c: any) => c.column_name).join(", "));

    // الفترات النهائية
    const periods = await sql`SELECT id, name, session_id, school_id, is_active FROM academic_periods ORDER BY id`;
    console.log("\n✅ الفترات بعد الإصلاح:");
    periods.forEach((p: any) =>
      console.log(`  [${p.id}] "${p.name}" | session_id=${p.session_id} | school_id=${p.school_id} | is_active=${p.is_active}`)
    );

    // السنوات النشطة
    const sessions = await sql`SELECT id, session_name, school_id, is_active FROM school_sessions ORDER BY id`;
    console.log("\n✅ السنوات الدراسية:");
    sessions.forEach((s: any) =>
      console.log(`  [${s.id}] "${s.session_name}" | school_id=${s.school_id} | is_active=${s.is_active}`)
    );

    // فصول SALISSOU
    const cs5 = await sql`
      SELECT cs.id, sc.class_name, ss.subject_name, cs.employee_id
      FROM class_subjects cs
      LEFT JOIN school_classes sc ON sc.id = cs.class_id
      LEFT JOIN school_subjects ss ON ss.id = cs.subject_id
      WHERE cs.employee_id = 5
    `;
    console.log(`\n✅ SALISSOU (employee_id=5) - ${cs5.length} مادة:`);
    cs5.forEach((cs: any) =>
      console.log(`  [${cs.id}] الفصل="${cs.class_name}" | المادة="${cs.subject_name}"`)
    );

    // إحصاء student_results للتأكد
    const counts = await sql`SELECT session_id, COUNT(*) as cnt FROM student_results GROUP BY session_id ORDER BY session_id`;
    console.log("\n✅ عدد النتائج لكل سنة:");
    counts.forEach((c: any) =>
      console.log(`  session_id=${c.session_id}: ${c.cnt} نتيجة`)
    );

  } catch (err: any) {
    console.error("❌", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
