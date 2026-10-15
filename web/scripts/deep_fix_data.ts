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
    console.log("  🔧 EDUT - FIX DATA DEEP CLEAN");
    console.log("========================================\n");

    // ─── إصلاح 1: ربط الفترات بـ school_id الصحيح ────────
    console.log("🔧 FIX 1: إصلاح school_id في academic_periods...\n");

    // الفترات التي school_id = null تُربط بـ session → school_id
    const fixPeriodsSchool = await sql`
      UPDATE academic_periods ap
      SET school_id = ss.school_id
      FROM school_sessions ss
      WHERE ap.session_id = ss.id
        AND ap.school_id IS NULL
        AND ss.school_id IS NOT NULL
      RETURNING ap.id, ap.name, ap.school_id
    `;
    console.log(`  ✅ تم تحديث ${fixPeriodsSchool.length} فترة - ربطها بـ school_id:`);
    fixPeriodsSchool.forEach((p: any) =>
      console.log(`    [${p.id}] ${p.name} → school_id=${p.school_id}`)
    );

    // الفترات التي session_id = null - نربطها بالسنة النشطة
    const fixOrphanPeriods = await sql`
      UPDATE academic_periods ap
      SET session_id = (
        SELECT id FROM school_sessions
        WHERE is_active = true
        LIMIT 1
      ),
      school_id = (
        SELECT school_id FROM school_sessions
        WHERE is_active = true
        LIMIT 1
      )
      WHERE ap.session_id IS NULL
      RETURNING ap.id, ap.name, ap.session_id, ap.school_id
    `;
    console.log(`\n  ✅ ربط ${fixOrphanPeriods.length} فترة يتيمة بالسنة النشطة:`);
    fixOrphanPeriods.forEach((p: any) =>
      console.log(`    [${p.id}] ${p.name} → session_id=${p.session_id}, school_id=${p.school_id}`)
    );

    // ─── إصلاح 2: حذف class_subjects الفارغة ─────────────
    console.log("\n🔧 FIX 2: حذف روابط class_subjects الفارغة (class_id=null أو subject_id=null)...\n");

    const deleteEmpty = await sql`
      DELETE FROM class_subjects
      WHERE class_id IS NULL OR subject_id IS NULL
      RETURNING id
    `;
    console.log(`  ✅ تم حذف ${deleteEmpty.length} رابط فارغ`);

    // ─── إصلاح 3: التحقق من بيانات SALISSOU SALHA ────────
    console.log("\n🔧 FIX 3: التحقق من بيانات SALISSOU SALHA (employee_id=5)...\n");

    const salissou = await sql`
      SELECT e.id, e.nom, e.email, e.educational_level, e.school_id,
             u.role, u.supabase_id
      FROM employees e
      LEFT JOIN users u ON u.utilisateur = e.email
      WHERE e.id = 5
    `;
    console.log("  بيانات الأستاذ:", salissou[0]);

    const salissouClasses = await sql`
      SELECT cs.id, cs.class_id, cs.subject_id, cs.employee_id, cs.coefficient,
             sc.class_name, ss.subject_name,
             sec.section_name, sec.educational_level
      FROM class_subjects cs
      LEFT JOIN school_classes sc ON sc.id = cs.class_id
      LEFT JOIN school_subjects ss ON ss.id = cs.subject_id
      LEFT JOIN school_sections sec ON sec.id = sc.section_id
      WHERE cs.employee_id = 5
      ORDER BY sc.class_name
    `;
    console.log(`\n  فصول/مواد SALISSOU (${salissouClasses.length}):`);
    salissouClasses.forEach((cs: any) =>
      console.log(
        `    [${cs.id}] ${cs.class_name || "???"} | ${cs.subject_name || "???"} | section=${cs.section_name} | level=${cs.educational_level}`
      )
    );

    // ─── إصلاح 4: تأكد أن educational_level لـ employee_id=5 صحيح ─
    console.log("\n🔧 FIX 4: تحديث educational_level للأستاذ SALISSOU SALHA...\n");

    // ابحث عن المستوى من فصوله
    const teacherLevel = await sql`
      SELECT DISTINCT sec.educational_level
      FROM class_subjects cs
      JOIN school_classes sc ON sc.id = cs.class_id
      JOIN school_sections sec ON sec.id = sc.section_id
      WHERE cs.employee_id = 5
        AND sec.educational_level IS NOT NULL
      LIMIT 1
    `;

    if (teacherLevel.length > 0) {
      const level = teacherLevel[0].educational_level;
      const updateLevel = await sql`
        UPDATE employees
        SET educational_level = ${level}
        WHERE id = 5
        RETURNING id, nom, educational_level
      `;
      console.log(`  ✅ تم تحديث educational_level للأستاذ: ${level}`, updateLevel[0]);
    } else {
      // إذا لا يوجد فصل محدد، نستخدم "Tous"
      await sql`UPDATE employees SET educational_level = 'Tous' WHERE id = 5`;
      console.log("  ✅ تم تعيين educational_level = Tous");
    }

    // ─── إصلاح 5: إضافة فترة trimestre إذا لم توجد ──────
    console.log("\n🔧 FIX 5: التحقق من وجود trimestres للسنة النشطة...\n");

    const activeSession = await sql`
      SELECT id, school_id, session_name FROM school_sessions WHERE is_active = true LIMIT 1
    `;

    if (activeSession.length === 0) {
      console.log("  ⚠️ لا توجد سنة نشطة!");
    } else {
      const sess = activeSession[0];
      const trimestres = await sql`
        SELECT id, name FROM academic_periods
        WHERE session_id = ${sess.id}
        ORDER BY id
      `;
      console.log(`  السنة النشطة: [${sess.id}] ${sess.session_name}`);
      console.log(`  الفترات الموجودة (${trimestres.length}):`);
      trimestres.forEach((t: any) =>
        console.log(`    [${t.id}] ${t.name}`)
      );

      // إضافة trimestres إذا كانت الفترات فقط semesters
      const hasTrimestre = trimestres.some(
        (t: any) => t.name?.toLowerCase().includes("trimestre")
      );

      if (!hasTrimestre && trimestres.length > 0) {
        console.log("\n  ⚠️ الفترات الموجودة هي Semesters فقط - لا حاجة لإضافة Trimestres");
        console.log("  ℹ️  تأكد من أن التطبيق يدعم كلا النوعين (Trimestre/Semestre)");
      } else if (trimestres.length === 0) {
        console.log("\n  🆕 لا توجد فترات - سيتم إنشاء Trimestres...");
        const yearMatch = sess.session_name?.match(/(\d{4})/);
        const startYear = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();

        const newPeriods = [
          { name: "1er Trimestre", start: `${startYear}-09-01`, end: `${startYear}-12-20`, active: true },
          { name: "2ème Trimestre", start: `${startYear + 1}-01-05`, end: `${startYear + 1}-03-28`, active: false },
          { name: "3ème Trimestre", start: `${startYear + 1}-04-08`, end: `${startYear + 1}-06-30`, active: false },
        ];

        for (const p of newPeriods) {
          await sql`
            INSERT INTO academic_periods (school_id, name, period_type, start_date, end_date, session_id, is_active)
            VALUES (${sess.school_id}, ${p.name}, 'Trimestre', ${p.start}::timestamp, ${p.end}::timestamp, ${sess.id}, ${p.active})
          `;
          console.log(`    ✅ أُنشئت: ${p.name}`);
        }
      }
    }

    // ─── التحقق النهائي ───────────────────────────────────
    console.log("\n========================================");
    console.log("  📊 التقرير النهائي");
    console.log("========================================\n");

    const finalPeriods = await sql`
      SELECT ap.id, ap.name, ap.session_id, ap.school_id, ap.is_active, ss.session_name
      FROM academic_periods ap
      LEFT JOIN school_sessions ss ON ss.id = ap.session_id
      ORDER BY ap.id
    `;
    console.log(`الفترات الدراسية (${finalPeriods.length}):`);
    finalPeriods.forEach((p: any) =>
      console.log(
        `  [${p.id}] ${p.name} | session="${p.session_name}" | school_id=${p.school_id} | is_active=${p.is_active}`
      )
    );

    const finalClassSubjects = await sql`
      SELECT COUNT(*) as total,
             COUNT(employee_id) as with_teacher
      FROM class_subjects
    `;
    console.log(
      `\nروابط class_subjects: ${finalClassSubjects[0].total} إجمالي | ${finalClassSubjects[0].with_teacher} مع أستاذ`
    );

    console.log("\n🎉 تم الإصلاح العميق بنجاح!");

  } catch (err: any) {
    console.error("❌ خطأ:", err.message);
    console.error(err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
