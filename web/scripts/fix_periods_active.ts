import postgres from "postgres";

const remoteUrl =
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });
  try {
    console.log("\n🔧 إصلاح is_active للفترات الدراسية...\n");

    // لا نحذف - نضبط فقط is_active بشكل صحيح
    // نجعل جميع الفترات is_active=false أولاً
    await sql`UPDATE academic_periods SET is_active = false`;

    // ثم نفعّل أول فترة لكل (school_id, session_id) بعد الترتيب
    // 1er Semestre/Trimestre = نشط للسنة الحالية
    const activeSessions = await sql`SELECT id, school_id FROM school_sessions WHERE is_active = true`;
    
    for (const sess of activeSessions) {
      // تفعيل أول فترة لكل مدرسة وسنة
      const firstPeriod = await sql`
        SELECT id FROM academic_periods
        WHERE session_id = ${sess.id}
          AND school_id = ${sess.school_id}
        ORDER BY id ASC
        LIMIT 1
      `;
      
      if (firstPeriod.length > 0) {
        await sql`
          UPDATE academic_periods SET is_active = true
          WHERE id = ${firstPeriod[0].id}
        `;
        console.log(`✅ فعّلت الفترة [${firstPeriod[0].id}] للمدرسة ${sess.school_id}`);
      }
    }

    // فحص نهائي
    const periods = await sql`
      SELECT ap.id, ap.name, ap.session_id, ap.school_id, ap.is_active, ss.session_name, ss.is_active as session_active
      FROM academic_periods ap
      LEFT JOIN school_sessions ss ON ss.id = ap.session_id
      ORDER BY ap.school_id, ap.id
    `;
    console.log("\n📋 الفترات النهائية:");
    periods.forEach((p: any) =>
      console.log(
        `  [${p.id}] "${p.name?.trim()}" | school=${p.school_id} | session="${p.session_name}" | is_active=${p.is_active} | session_active=${p.session_active}`
      )
    );

    // اختبار: ماذا سيحدث عندما يطلب الموبايل الفترات للمدرسة 1 والسنة 3؟
    const mobileTest = await sql`
      SELECT id, name, period_type, is_active, session_id, school_id
      FROM academic_periods
      WHERE school_id = 1 AND session_id = 3
      ORDER BY id
    `;
    console.log(`\n📱 محاكاة طلب الموبايل (school_id=1, session_id=3): ${mobileTest.length} فترة`);
    mobileTest.forEach((p: any) =>
      console.log(`  [${p.id}] "${p.name?.trim()}" | is_active=${p.is_active}`)
    );

    console.log("\n🎉 تم الإصلاح بنجاح!");

  } catch (err: any) {
    console.error("❌", err.message);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
