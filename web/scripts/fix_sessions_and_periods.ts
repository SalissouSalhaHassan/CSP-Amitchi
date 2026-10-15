import postgres from "postgres";

const remoteUrl =
  "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, {
    prepare: false,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log("\n========================================");
    console.log("  🔧 EDUT - FIX SESSIONS & PERIODS");
    console.log("========================================\n");

    // ─── STEP 1: فحص البيانات الحالية ───────────────────
    console.log("📋 STEP 1: فحص البيانات الحالية...\n");

    const sessions = await sql`SELECT * FROM school_sessions ORDER BY id`;
    console.log("السنوات الدراسية الحالية:");
    sessions.forEach((s: any) =>
      console.log(
        `  [${s.id}] ${s.session_name} | school_id=${s.school_id} | is_active=${s.is_active} | status=${s.status}`
      )
    );

    const periods = await sql`SELECT * FROM academic_periods ORDER BY id`;
    console.log(`\nالفترات الدراسية الحالية: ${periods.length} فترة`);
    periods.forEach((p: any) =>
      console.log(
        `  [${p.id}] ${p.name} | session_id=${p.session_id} | school_id=${p.school_id} | is_active=${p.is_active}`
      )
    );

    const teachers = await sql`
      SELECT e.id, e.nom, e.email, e.educational_level
      FROM employees e
      WHERE e.poste ILIKE '%prof%' OR e.poste ILIKE '%enseignant%' OR e.poste ILIKE '%teacher%'
      ORDER BY e.id
    `;
    console.log(`\nالأساتذة الحاليون: ${teachers.length}`);
    teachers.forEach((t: any) =>
      console.log(`  [${t.id}] ${t.nom} | ${t.email} | niveau=${t.educational_level}`)
    );

    const classSubjectsData = await sql`
      SELECT cs.id, cs.class_id, cs.subject_id, cs.employee_id,
             sc.class_name, ss.subject_name
      FROM class_subjects cs
      LEFT JOIN school_classes sc ON sc.id = cs.class_id
      LEFT JOIN school_subjects ss ON ss.id = cs.subject_id
      ORDER BY cs.id
      LIMIT 20
    `;
    console.log(`\nروابط الفصل/المادة/الأستاذ (أول 20):`);
    classSubjectsData.forEach((cs: any) =>
      console.log(
        `  [${cs.id}] الفصل="${cs.class_name}" | المادة="${cs.subject_name}" | employee_id=${cs.employee_id}`
      )
    );

    // ─── STEP 2: تفعيل السنة الدراسية ───────────────────
    console.log("\n📋 STEP 2: تفعيل السنة الدراسية 2024-2025 / 2025-2026...\n");

    // أولاً: إلغاء تفعيل جميع السنوات
    await sql`UPDATE school_sessions SET is_active = false`;
    console.log("  ✅ تم إلغاء تفعيل جميع السنوات");

    // ابحث عن أحدث سنة لكل مدرسة وفعّلها
    const latestSessions = await sql`
      SELECT DISTINCT ON (school_id) id, school_id, session_name
      FROM school_sessions
      ORDER BY school_id, id DESC
    `;
    console.log(`  🔍 أحدث سنة لكل مدرسة:`);
    for (const sess of latestSessions) {
      await sql`
        UPDATE school_sessions
        SET is_active = true, status = 'Actif'
        WHERE id = ${sess.id}
      `;
      console.log(`  ✅ فُعِّلت: [${sess.id}] ${sess.session_name} (school_id=${sess.school_id})`);
    }

    // ─── STEP 3: إنشاء الفترات الدراسية المفقودة ────────
    console.log("\n📋 STEP 3: إنشاء الفترات الدراسية (Trimestres)...\n");

    const activeSessions = await sql`SELECT * FROM school_sessions WHERE is_active = true`;

    for (const sess of activeSessions) {
      // تحقق من وجود فترات لهذه السنة
      const existingPeriods = await sql`
        SELECT id FROM academic_periods WHERE session_id = ${sess.id}
      `;

      if (existingPeriods.length > 0) {
        console.log(
          `  ⏭️  السنة [${sess.id}] ${sess.session_name} لديها ${existingPeriods.length} فترات - لن نضيف مكررات`
        );
        continue;
      }

      console.log(`  🆕 إنشاء فترات للسنة [${sess.id}] ${sess.session_name} (school_id=${sess.school_id})...`);

      // استخرج سنة من اسم الجلسة (مثال: "2025-2026" → 2025)
      const yearMatch = sess.session_name?.match(/(\d{4})/);
      const startYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

      const trimestres = [
        {
          name: "1er Trimestre",
          periodType: "Trimestre",
          startDate: `${startYear}-09-01`,
          endDate: `${startYear}-12-20`,
          isActive: true,
        },
        {
          name: "2ème Trimestre",
          periodType: "Trimestre",
          startDate: `${startYear + 1}-01-05`,
          endDate: `${startYear + 1}-03-28`,
          isActive: false,
        },
        {
          name: "3ème Trimestre",
          periodType: "Trimestre",
          startDate: `${startYear + 1}-04-08`,
          endDate: `${startYear + 1}-06-30`,
          isActive: false,
        },
      ];

      for (const trimestre of trimestres) {
        await sql`
          INSERT INTO academic_periods (school_id, name, period_type, start_date, end_date, session_id, is_active)
          VALUES (
            ${sess.school_id},
            ${trimestre.name},
            ${trimestre.periodType},
            ${trimestre.startDate}::timestamp,
            ${trimestre.endDate}::timestamp,
            ${sess.id},
            ${trimestre.isActive}
          )
        `;
        console.log(
          `    ✅ أُنشئت: ${trimestre.name} (${trimestre.startDate} → ${trimestre.endDate})`
        );
      }
    }

    // ─── STEP 4: تحقق من ربط الأساتذة بالفصول ──────────
    console.log("\n📋 STEP 4: التحقق من ربط الأساتذة بالفصول...\n");

    const unlinkedSubjects = await sql`
      SELECT cs.id, cs.class_id, cs.subject_id, sc.class_name, ss.subject_name
      FROM class_subjects cs
      LEFT JOIN school_classes sc ON sc.id = cs.class_id
      LEFT JOIN school_subjects ss ON ss.id = cs.subject_id
      WHERE cs.employee_id IS NULL
    `;
    if (unlinkedSubjects.length > 0) {
      console.log(`  ⚠️  ${unlinkedSubjects.length} مادة غير مرتبطة بأستاذ:`);
      unlinkedSubjects.forEach((cs: any) =>
        console.log(`    [${cs.id}] ${cs.class_name} | ${cs.subject_name}`)
      );
    } else {
      console.log("  ✅ جميع المواد مرتبطة بأساتذة");
    }

    // SALISSOU SALHA - employee_id = 5، نتأكد من ربط فصوله
    const salissouLinks = await sql`
      SELECT cs.id, cs.class_id, cs.subject_id, cs.employee_id,
             sc.class_name, ss.subject_name
      FROM class_subjects cs
      LEFT JOIN school_classes sc ON sc.id = cs.class_id
      LEFT JOIN school_subjects ss ON ss.id = cs.subject_id
      WHERE cs.employee_id = 5
    `;
    console.log(`\n  🧑‍🏫 SALISSOU SALHA (employee_id=5) - فصوله ومواده:`);
    if (salissouLinks.length === 0) {
      console.log("  ⚠️  لا توجد فصول/مواد مرتبطة به!");
    } else {
      salissouLinks.forEach((cs: any) =>
        console.log(`    [${cs.id}] الفصل="${cs.class_name}" | المادة="${cs.subject_name}"`)
      );
    }

    // ─── STEP 5: التحقق النهائي ──────────────────────────
    console.log("\n📋 STEP 5: التحقق النهائي...\n");

    const finalSessions = await sql`SELECT id, session_name, school_id, is_active FROM school_sessions WHERE is_active = true`;
    console.log("✅ السنوات النشطة:");
    finalSessions.forEach((s: any) =>
      console.log(`  [${s.id}] ${s.session_name} (school_id=${s.school_id})`)
    );

    const finalPeriods = await sql`
      SELECT ap.id, ap.name, ap.session_id, ap.school_id, ap.is_active, ss.session_name
      FROM academic_periods ap
      JOIN school_sessions ss ON ss.id = ap.session_id
      WHERE ss.is_active = true
      ORDER BY ap.id
    `;
    console.log(`\n✅ الفترات للسنوات النشطة: ${finalPeriods.length} فترة`);
    finalPeriods.forEach((p: any) =>
      console.log(`  [${p.id}] ${p.name} | ${p.session_name} | is_active=${p.is_active}`)
    );

    console.log("\n========================================");
    console.log("  🎉 تم الإصلاح بنجاح!");
    console.log("========================================\n");
  } catch (err: any) {
    console.error("❌ خطأ:", err.message);
    throw err;
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
