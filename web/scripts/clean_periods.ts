import postgres from "postgres";

const remoteUrl =
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  try {
    console.log("\n🧹 تنظيف الفترات المكررة...\n");

    // فحص الفترات المكررة
    const periods = await sql`SELECT id, name, session_id, school_id, is_active FROM academic_periods ORDER BY id`;
    console.log("الفترات الحالية:");
    periods.forEach((p: any) =>
      console.log(`  [${p.id}] "${p.name}" | session_id=${p.session_id} | school_id=${p.school_id}`)
    );

    // احذف الفترات المكررة - احتفظ بأقل id لكل مجموعة (session_id, name الأساسية)
    // الفترات التي يجب حذفها: [3] و [4] (مكررات لـ [1] و [9])
    // ونحتفظ بـ: [1] 1er Semestre, [2] 2eme Semestre, [9] و [10] (الأحدث) لـ school_id=1
    
    // الاستراتيجية: احذف المكررات بناءً على (school_id, session_id, name trimmed)
    const deduped = await sql`
      DELETE FROM academic_periods
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY school_id, session_id, TRIM(name)
                   ORDER BY id DESC
                 ) as rn
          FROM academic_periods
          WHERE school_id IS NOT NULL
        ) ranked
        WHERE rn > 1
      )
      RETURNING id, name
    `;
    console.log(`\n✅ تم حذف ${deduped.length} فترة مكررة:`);
    deduped.forEach((p: any) => console.log(`  حُذف [${p.id}] "${p.name}"`));

    // تحقق نهائي
    const finalPeriods = await sql`
      SELECT ap.id, ap.name, ap.session_id, ap.school_id, ap.is_active, ss.session_name
      FROM academic_periods ap
      LEFT JOIN school_sessions ss ON ss.id = ap.session_id
      ORDER BY ap.school_id, ap.session_id, ap.id
    `;
    console.log("\n✅ الفترات النهائية النظيفة:");
    finalPeriods.forEach((p: any) =>
      console.log(
        `  [${p.id}] "${p.name}" | ${p.session_name} | school_id=${p.school_id} | active=${p.is_active}`
      )
    );

    // تعيين فترة واحدة نشطة فقط لكل (session_id, school_id)
    await sql`UPDATE academic_periods SET is_active = false WHERE school_id = 1 AND session_id = 3`;
    await sql`
      UPDATE academic_periods SET is_active = true
      WHERE id = (
        SELECT id FROM academic_periods
        WHERE school_id = 1 AND session_id = 3
        ORDER BY id ASC LIMIT 1
      )
    `;
    console.log("\n✅ تعيين فترة واحدة نشطة لـ school_id=1, session_id=3");

    const active = await sql`
      SELECT id, name, is_active FROM academic_periods WHERE school_id = 1 AND session_id = 3 ORDER BY id
    `;
    active.forEach((p: any) =>
      console.log(`  [${p.id}] "${p.name}" | is_active=${p.is_active}`)
    );

  } catch (err: any) {
    console.error("❌", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
