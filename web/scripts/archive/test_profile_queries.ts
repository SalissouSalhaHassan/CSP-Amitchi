import postgres from "postgres";

const remoteUrl = "postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres";

async function main() {
  const sql = postgres(remoteUrl, { ssl: { rejectUnauthorized: false } });

  try {
    console.log("Fetching a sample student...");
    const studentList = await sql`SELECT id, nom_etudiant, behavior_score FROM students LIMIT 1`;
    if (studentList.length === 0) {
      console.log("No students found in DB.");
      return;
    }
    const student = studentList[0];
    const studentId = student.id;
    console.log(`Testing query for student: ${student.nom_etudiant} (ID: ${studentId})`);

    // 1. Test Grades query
    console.log("\n1. Testing Grades Query...");
    const grades = await sql`
      SELECT er.id, er.marks_obtained, er.remarks, e.exam_name, e.max_marks, e.exam_date, s.subject_name
      FROM exam_results er
      INNER JOIN exams e ON er.exam_id = e.id
      INNER JOIN school_subjects s ON e.subject_id = s.id
      WHERE er.student_id = ${studentId}
      ORDER BY e.exam_date DESC
    `;
    console.log(`Grades found: ${grades.length}`);

    // 2. Test Remediation query
    console.log("\n2. Testing Remediation Query...");
    const remediations = await sql`
      SELECT pr.id, pr.difficulties, pr.current_grade, pr.target_grade, pr.remediation_plan, 
             pr.sessions_planned, pr.sessions_completed, pr.status, pr.alert_level, pr.created_at, s.subject_name
      FROM pedagogie_remediations pr
      INNER JOIN school_subjects s ON pr.subject_id = s.id
      WHERE pr.student_id = ${studentId}
      ORDER BY pr.created_at DESC
    `;
    console.log(`Remediations found: ${remediations.length}`);

    // 3. Test LMS Assignments query
    console.log("\n3. Testing LMS Assignments Query...");
    const assignments = await sql`
      SELECT la.id, la.title, la.description, la.due_date, la.max_score, la.status, s.subject_name
      FROM lms_assignments la
      INNER JOIN school_subjects s ON la.subject_id = s.id
      WHERE la.student_id = ${studentId}
      ORDER BY la.due_date DESC
    `;
    console.log(`Assignments found: ${assignments.length}`);

    // 4. Test Behavior Rewards query
    console.log("\n4. Testing Behavior Rewards Query...");
    const rewards = await sql`
      SELECT id, reward_type, points_effect, reason, granted_by, created_at
      FROM behavior_rewards
      WHERE student_id = ${studentId}
      ORDER BY created_at DESC
    `;
    console.log(`Rewards found: ${rewards.length}`);

    // 5. Test Counselor Notes query
    console.log("\n5. Testing Counselor Notes Query...");
    const notes = await sql`
      SELECT id, note_type, confidential_content, recommendations, is_secret, created_at
      FROM counselor_notes
      WHERE student_id = ${studentId}
      ORDER BY created_at DESC
    `;
    console.log(`Counselor notes found: ${notes.length}`);

    console.log("\n✅ All remote queries tested successfully with NO database errors!");
  } catch (err: any) {
    console.error("\n❌ Database Query Error:", err.message);
    console.error(err);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

main();
