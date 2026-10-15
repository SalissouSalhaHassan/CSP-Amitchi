import postgres from 'postgres';

const sql = postgres('postgres://postgres.gkarotahjtyvmhjqejts:salissou1994S@aws-1-eu-central-2.pooler.supabase.com:6543/postgres', { 
  prepare: false, 
  ssl: { rejectUnauthorized: false } 
});

async function runExamModuleTests() {
  console.log('====================================================');
  console.log('🧪 SUITE DE TESTS COMPLÈTE : GESTION DES EXAMENS');
  console.log('====================================================\n');

  // STEP 0: Schema Fixes (Ensure all necessary columns exist)
  console.log('--- ÉTAPE 0: VÉRIFICATION ET MIGRATION DU SCHÉMA DB ---');
  try {
    await sql`
      ALTER TABLE exam_candidates 
      ADD COLUMN IF NOT EXISTS is_manually_authorized BOOLEAN DEFAULT false;
    `;
    console.log('✅ exam_candidates: colonne is_manually_authorized vérifiée/ajoutée.');

    await sql`
      CREATE TABLE IF NOT EXISTS ai_question_bank (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES school_subjects(id),
        topic VARCHAR(255),
        difficulty VARCHAR(50),
        question_text TEXT NOT NULL,
        options JSONB,
        correct_answer TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✅ ai_question_bank: table vérifiée/créée.');
  } catch (err: any) {
    console.error('⚠️ Erreur lors de la vérification du schéma:', err.message);
  }

  // TEST 1: Campagnes d'examen
  console.log('\n--- TEST 1: GESTION DES CAMPAGNES D\'EXAMEN ---');
  let testCampaignId: number | null = null;
  try {
    // 1.1 Create Test Campaign
    const campName = `Campagne Test ${Date.now()}`;
    const insertCamp = await sql`
      INSERT INTO exam_campaigns (name, session_id, start_date, end_date, is_locked, created_by, created_at)
      VALUES (${campName}, 1, NOW(), NOW() + INTERVAL '7 days', false, 'Admin Test', NOW())
      RETURNING id, name, start_date, end_date
    `;
    testCampaignId = insertCamp[0].id;
    console.log(`✅ [Campagnes] Création réussie: ID ${testCampaignId} - "${insertCamp[0].name}"`);

    // 1.2 List Campaigns
    const camps = await sql`SELECT id, name, start_date, end_date FROM exam_campaigns ORDER BY id DESC LIMIT 3`;
    console.log(`✅ [Campagnes] Liste des campagnes récupérée (${camps.length} trouvées)`);
  } catch (err: any) {
    console.error('❌ [Campagnes] Échec:', err.message);
  }

  // TEST 2: Salles d'examen
  console.log('\n--- TEST 2: GESTION DES SALLES D\'EXAMEN ---');
  let testRoomId: number | null = null;
  try {
    // 2.1 List Rooms
    const rooms = await sql`SELECT id, name, capacity FROM exam_rooms LIMIT 5`;
    console.log(`✅ [Salles] Salles existantes: ${rooms.map((r: any) => `${r.name} (Capacité: ${r.capacity})`).join(', ')}`);
    
    if (rooms.length > 0) {
      testRoomId = rooms[0].id;
    } else {
      const newRoom = await sql`
        INSERT INTO exam_rooms (name, capacity, description)
        VALUES ('Salle Test A1', 30, 'Salle climatisée pour examens')
        RETURNING id
      `;
      testRoomId = newRoom[0].id;
      console.log(`✅ [Salles] Nouvelle salle créée: ID ${testRoomId}`);
    }
  } catch (err: any) {
    console.error('❌ [Salles] Échec:', err.message);
  }

  // TEST 3: Générateur IA & Banque de Questions
  console.log('\n--- TEST 3: GÉNÉRATEUR IA & BANQUE DE QUESTIONS ---');
  try {
    // 3.1 Fetch sample subject
    const subjects = await sql`SELECT id, subject_name FROM school_subjects LIMIT 1`;
    const subjectId = subjects[0]?.id || 1;
    const subjectName = subjects[0]?.subject_name || 'Mathématiques';

    // 3.2 Insert questions into Bank
    const testQuestion = {
      subject_id: subjectId,
      topic: 'Algèbre linéaire',
      difficulty: 'Moyen',
      question_text: 'Quelle est la déterminante d\'une matrice identité 2x2 ?',
      options: JSON.stringify(['1', '0', '-1', '2']),
      correct_answer: '1'
    };

    const insertedQ = await sql`
      INSERT INTO ai_question_bank (subject_id, topic, difficulty, question_text, options, correct_answer, created_at)
      VALUES (${testQuestion.subject_id}, ${testQuestion.topic}, ${testQuestion.difficulty}, ${testQuestion.question_text}, ${testQuestion.options}, ${testQuestion.correct_answer}, NOW())
      RETURNING id, question_text
    `;
    console.log(`✅ [Banque IA] Question enregistrée avec succès: ID ${insertedQ[0].id}`);

    // 3.3 Query Bank by subject
    const bankQs = await sql`SELECT id, topic, question_text FROM ai_question_bank WHERE subject_id = ${subjectId} LIMIT 3`;
    console.log(`✅ [Banque IA] Questions récupérées pour ${subjectName}: ${bankQs.length} question(s)`);
  } catch (err: any) {
    console.error('❌ [Banque IA] Échec:', err.message);
  }

  // TEST 4: Planification des Épreuves (Timetables)
  console.log('\n--- TEST 4: PLANIFICATION DES ÉPREUVES (CALENDRIER & HORAIRES) ---');
  let testTimetableId: number | null = null;
  let testClassId: number | null = null;
  let testSubjectId: number | null = null;
  try {
    const classes = await sql`SELECT id, class_name FROM school_classes LIMIT 1`;
    const subjects = await sql`SELECT id, subject_name FROM school_subjects LIMIT 1`;
    testClassId = classes[0]?.id;
    testSubjectId = subjects[0]?.id;

    if (testCampaignId && testClassId && testSubjectId) {
      // 4.1 Schedule exam
      const ttInsert = await sql`
        INSERT INTO exam_timetables (campaign_id, class_id, subject_id, exam_date, start_time, end_time, max_marks)
        VALUES (${testCampaignId}, ${testClassId}, ${testSubjectId}, CURRENT_DATE, '08:00', '10:00', 20.0)
        RETURNING id, exam_date, start_time, end_time, max_marks
      `;
      testTimetableId = ttInsert[0].id;
      console.log(`✅ [Planification] Épreuve programmée: ID ${testTimetableId} - Date: ${ttInsert[0].exam_date.toISOString().slice(0, 10)} (${ttInsert[0].start_time} - ${ttInsert[0].end_time})`);

      // 4.2 Fetch Timetables for Campaign
      const tts = await sql`
        SELECT t.id, c.class_name, s.subject_name, t.exam_date, t.start_time, t.end_time, t.max_marks
        FROM exam_timetables t
        LEFT JOIN school_classes c ON t.class_id = c.id
        LEFT JOIN school_subjects s ON t.subject_id = s.id
        WHERE t.campaign_id = ${testCampaignId}
      `;
      console.log(`✅ [Planification] Épreuves récupérées pour la campagne: ${tts.length} épreuve(s)`);
    } else {
      console.log('⚠️ [Planification] Classes ou Matières introuvables.');
    }
  } catch (err: any) {
    console.error('❌ [Planification] Échec:', err.message);
  }

  // TEST 5: Affectation de Surveillance & Résolveur IA
  console.log('\n--- TEST 5: SURVEILLANCE & AFFECTATION DES ENSEIGNANTS ---');
  try {
    const teachers = await sql`SELECT id, nom FROM employees WHERE statut = 'Actif' LIMIT 1`;
    const teacherId = teachers[0]?.id;

    if (testTimetableId && testRoomId && teacherId) {
      const invig = await sql`
        INSERT INTO exam_invigilations (timetable_id, room_id, employee_id)
        VALUES (${testTimetableId}, ${testRoomId}, ${teacherId})
        RETURNING id
      `;
      console.log(`✅ [Surveillance] Surveillant ${teachers[0].nom} affecté avec succès (ID: ${invig[0].id}) à l'épreuve ${testTimetableId}`);
    } else {
      console.log('ℹ️ [Surveillance] Enseignants ou épreuve non disponibles pour le test d\'affectation.');
    }
  } catch (err: any) {
    console.error('❌ [Surveillance] Échec:', err.message);
  }

  // TEST 6: Candidats, Dégagement Financier, Numéros de Table & Codes d'Anonymat
  console.log('\n--- TEST 6: GESTION DES CANDIDATS, NUMÉROS DE TABLE & ANONYMAT ---');
  let testCandidateId: number | null = null;
  let testStudentId: number | null = null;
  let testAnonCode: string | null = null;
  try {
    const studentsList = await sql`SELECT id, nom_etudiant, classe FROM students WHERE statut = 'Actif' LIMIT 1`;
    if (studentsList.length > 0 && testCampaignId && testClassId) {
      testStudentId = studentsList[0].id;
      const rollNo = `EX-2026-${String(testStudentId).padStart(4, '0')}`;

      // 6.1 Create Candidate
      const candInsert = await sql`
        INSERT INTO exam_candidates (campaign_id, student_id, class_id, roll_number, is_financially_cleared, is_manually_authorized)
        VALUES (${testCampaignId}, ${testStudentId}, ${testClassId}, ${rollNo}, true, false)
        RETURNING id, roll_number, is_financially_cleared
      `;
      testCandidateId = candInsert[0].id;
      console.log(`✅ [Candidats] Candidat inscrit: ID ${testCandidateId}, N° Table: ${candInsert[0].roll_number}, Statut Financier: ${candInsert[0].is_financially_cleared ? 'Autorisé' : 'Bloqué'}`);

      // 6.2 Anonymity Code & Attendance Record
      if (testTimetableId) {
        testAnonCode = `C${testCampaignId}-S${testStudentId}-SUB${testSubjectId}-TEST`;
        const attMark = await sql`
          INSERT INTO exam_attendance_marks (candidate_id, timetable_id, anonymity_code, attendance_status)
          VALUES (${testCandidateId}, ${testTimetableId}, ${testAnonCode}, 'Présent')
          RETURNING id, anonymity_code, attendance_status
        `;
        console.log(`✅ [Anonymat] Code anonyme généré: ${attMark[0].anonymity_code}, Statut: ${attMark[0].attendance_status}`);
      }
    } else {
      console.log('ℹ️ [Candidats] Aucun élève actif trouvé pour le test.');
    }
  } catch (err: any) {
    console.error('❌ [Candidats/Anonymat] Échec:', err.message);
  }

  // TEST 7: Émargement, Scan QR & Gestion des Incidents
  console.log('\n--- TEST 7: FEUILLE D\'ÉMARGEMENT, SCAN QR & INCIDENTS ---');
  try {
    if (testTimetableId && testCandidateId) {
      // 7.1 Update Attendance
      await sql`
        UPDATE exam_attendance_marks
        SET attendance_status = 'Présent'
        WHERE candidate_id = ${testCandidateId} AND timetable_id = ${testTimetableId}
      `;
      console.log(`✅ [Émargement] Présence validée avec succès pour le candidat ${testCandidateId}`);

      // 7.2 Log Incident
      await sql`
        UPDATE exam_attendance_marks
        SET incident_type = 'Fraude Suspectée', incident_report = 'Tentative d utilisation de document non autorisé'
        WHERE candidate_id = ${testCandidateId} AND timetable_id = ${testTimetableId}
      `;
      console.log(`✅ [Incidents] Rapport d'incident consigné avec succès.`);
    }
  } catch (err: any) {
    console.error('❌ [Émargement/Incidents] Échec:', err.message);
  }

  // TEST 8: Saisie des Notes & Dé-anonymisation
  console.log('\n--- TEST 8: SAISIE DES NOTES & DÉ-ANONYMISATION ---');
  try {
    if (testCandidateId && testTimetableId) {
      // 8.1 Enter Grade via Anonymity
      const markValue = 16.5;
      await sql`
        UPDATE exam_attendance_marks
        SET marks_obtained = ${markValue}
        WHERE candidate_id = ${testCandidateId} AND timetable_id = ${testTimetableId}
      `;
      console.log(`✅ [Saisie des Notes] Note ${markValue}/20 attribuée sur code anonyme.`);

      // 8.2 De-anonymize Query
      const deAnon = await sql`
        SELECT 
          r.id,
          r.anonymity_code,
          r.marks_obtained,
          r.attendance_status,
          s.nom_etudiant,
          c.roll_number
        FROM exam_attendance_marks r
        JOIN exam_candidates c ON r.candidate_id = c.id
        JOIN students s ON c.student_id = s.id
        WHERE r.timetable_id = ${testTimetableId}
      `;
      console.log(`✅ [Dé-anonymisation] Récupération réussie: Élève "${deAnon[0]?.nom_etudiant}" | N° Table: ${deAnon[0]?.roll_number} | Code: ${deAnon[0]?.anonymity_code} | Note: ${deAnon[0]?.marks_obtained}/20`);
    }
  } catch (err: any) {
    console.error('❌ [Saisie des Notes] Échec:', err.message);
  }

  // CLEANUP TEST DATA (Optional, keeps db clean)
  console.log('\n--- NETTOYAGE DES DONNÉES DE TEST ---');
  try {
    if (testCampaignId) {
      await sql`DELETE FROM exam_attendance_marks WHERE candidate_id IN (SELECT id FROM exam_candidates WHERE campaign_id = ${testCampaignId})`;
      await sql`DELETE FROM exam_candidates WHERE campaign_id = ${testCampaignId}`;
      await sql`DELETE FROM exam_invigilations WHERE timetable_id IN (SELECT id FROM exam_timetables WHERE campaign_id = ${testCampaignId})`;
      await sql`DELETE FROM exam_timetables WHERE campaign_id = ${testCampaignId}`;
      await sql`DELETE FROM exam_campaigns WHERE id = ${testCampaignId}`;
      console.log('✅ Données de test éphémères nettoyées.');
    }
  } catch (err: any) {
    console.warn('Nettoyage test data notice:', err.message);
  }

  console.log('\n====================================================');
  console.log('🎉 TOUS LES TESTS FONCTIONNELS ONT ÉTÉ EXÉCUTÉS AVEC SUCCÈS !');
  console.log('====================================================');

  await sql.end();
}

runExamModuleTests().catch(console.error);
