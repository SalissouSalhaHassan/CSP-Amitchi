"use server";

import { db } from "@/infrastructure/database";
import { sql, eq, desc, ilike, or, count, avg, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import {
  graduationProjects,
  graduationDocuments,
  graduationDefenseRooms,
  graduationJuryEvaluations,
  graduationWorkflowLogs,
  graduationArchives,
} from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { employees } from "@/infrastructure/database/schema/hr";

// ─── Inline DB migration (runs on first action call) ──────────────────────────

let migrationPromise: Promise<void> | null = null;

async function ensureMigrations() {
  if (migrationPromise) return migrationPromise;

  migrationPromise = (async () => {
    try {
      // Create base table first if not exists
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS graduation_projects (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          title VARCHAR(255) NOT NULL,
          status VARCHAR(50) DEFAULT 'Proposition'
        )
      `);

      await db.execute(sql`
        ALTER TABLE graduation_projects
          ADD COLUMN IF NOT EXISTS project_code VARCHAR(50),
          ADD COLUMN IF NOT EXISTS summary TEXT,
          ADD COLUMN IF NOT EXISTS keywords VARCHAR(500),
          ADD COLUMN IF NOT EXISTS department VARCHAR(100),
          ADD COLUMN IF NOT EXISTS filiere VARCHAR(100),
          ADD COLUMN IF NOT EXISTS niveau VARCHAR(50),
          ADD COLUMN IF NOT EXISTS language VARCHAR(30) DEFAULT 'Français',
          ADD COLUMN IF NOT EXISTS academic_year VARCHAR(20),
          ADD COLUMN IF NOT EXISTS student_id INTEGER,
          ADD COLUMN IF NOT EXISTS supervisor_id INTEGER,
          ADD COLUMN IF NOT EXISTS president_id INTEGER,
          ADD COLUMN IF NOT EXISTS examiner_id INTEGER,
          ADD COLUMN IF NOT EXISTS rapporteur_id INTEGER,
          ADD COLUMN IF NOT EXISTS secretary_id INTEGER,
          ADD COLUMN IF NOT EXISTS defense_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS defense_end_time TIMESTAMP,
          ADD COLUMN IF NOT EXISTS room_name VARCHAR(100),
          ADD COLUMN IF NOT EXISTS defense_duration_mins INTEGER DEFAULT 60,
          ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS end_date TIMESTAMP,
          ADD COLUMN IF NOT EXISTS grade DOUBLE PRECISION,
          ADD COLUMN IF NOT EXISTS mention VARCHAR(50),
          ADD COLUMN IF NOT EXISTS decision VARCHAR(50),
          ADD COLUMN IF NOT EXISTS archive_ref VARCHAR(100),
          ADD COLUMN IF NOT EXISTS archive_url VARCHAR(500),
          ADD COLUMN IF NOT EXISTS is_distinguished BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false,
          ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
          ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS graduation_documents (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
          school_id INTEGER,
          doc_type VARCHAR(50) NOT NULL,
          title VARCHAR(255) NOT NULL,
          file_url VARCHAR(1000),
          version VARCHAR(20) DEFAULT 'v1.0',
          uploaded_at TIMESTAMP DEFAULT NOW(),
          notes TEXT
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS graduation_defense_rooms (
          id SERIAL PRIMARY KEY,
          school_id INTEGER,
          room_name VARCHAR(100) NOT NULL,
          capacity INTEGER DEFAULT 30,
          equipment TEXT,
          location VARCHAR(255),
          is_available BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS graduation_jury_evaluations (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
          school_id INTEGER,
          science_quality DOUBLE PRECISION,
          methodology DOUBLE PRECISION,
          presentation DOUBLE PRECISION,
          innovation DOUBLE PRECISION,
          questions DOUBLE PRECISION,
          average DOUBLE PRECISION,
          mention VARCHAR(50),
          decision VARCHAR(50),
          jury_comments TEXT,
          evaluated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS graduation_workflow_logs (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
          from_status VARCHAR(50),
          to_status VARCHAR(50),
          changed_at TIMESTAMP DEFAULT NOW(),
          notes TEXT
        )
      `);
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS graduation_archives (
          id SERIAL PRIMARY KEY,
          project_id INTEGER REFERENCES graduation_projects(id) ON DELETE CASCADE,
          school_id INTEGER,
          archive_ref VARCHAR(100) NOT NULL,
          qr_code_url VARCHAR(500),
          permanent_link VARCHAR(500),
          report_url VARCHAR(500),
          presentation_url VARCHAR(500),
          code_url VARCHAR(500),
          archived_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } catch (e) {
      console.error("[GraduationMigration] Non-fatal:", e);
      // Reset promise on failure so next call can try again
      migrationPromise = null;
    }
  })();

  return migrationPromise;
}


// ─── KPI Stats ────────────────────────────────────────────────────────────────

export async function getGraduationStats() {
  return protectedDbAction("Academics", "canView", async () => {
    await ensureMigrations();
    const schoolId = await getActiveSchoolId();

    const [rows] = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status NOT IN ('Validation Finale','Archivage')) AS active_count,
        COUNT(DISTINCT student_id) AS students_count,
        COUNT(DISTINCT supervisor_id) AS supervisors_count,
        COUNT(*) FILTER (WHERE defense_date IS NOT NULL AND status NOT IN ('Validation Finale','Archivage')) AS defenses_planned,
        COUNT(*) FILTER (WHERE status = 'Proposition') AS pending_count,
        COUNT(*) FILTER (WHERE status IN ('Validation Finale','Archivage')) AS validated_count,
        COUNT(*) FILTER (WHERE is_distinguished = true) AS distinguished_count,
        COUNT(*) FILTER (WHERE is_published = true) AS publications_count,
        ROUND(
          100.0 * COUNT(*) FILTER (WHERE decision = 'Validé') / NULLIF(COUNT(*) FILTER (WHERE decision IS NOT NULL), 0), 1
        ) AS success_rate,
        ROUND(AVG(grade) FILTER (WHERE grade IS NOT NULL), 2) AS avg_grade
      FROM graduation_projects
      WHERE school_id = ${schoolId}
    `) as any;

    const row = Array.isArray(rows) ? rows[0] : rows;

    return {
      data: {
        activeCount: Number(row?.active_count || 0),
        studentsCount: Number(row?.students_count || 0),
        supervisorsCount: Number(row?.supervisors_count || 0),
        defensesPlanned: Number(row?.defenses_planned || 0),
        pendingCount: Number(row?.pending_count || 0),
        validatedCount: Number(row?.validated_count || 0),
        distinguishedCount: Number(row?.distinguished_count || 0),
        publicationsCount: Number(row?.publications_count || 0),
        successRate: Number(row?.success_rate || 0),
        avgGrade: Number(row?.avg_grade || 0),
      }
    };
  });
}

// ─── Status distribution for donut chart ──────────────────────────────────────

export async function getGraduationStatusDistribution() {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT status, COUNT(*) as cnt
      FROM graduation_projects
      WHERE school_id = ${schoolId}
      GROUP BY status
      ORDER BY cnt DESC
    `) as any;
    const list = Array.isArray(rows) ? rows : (rows?.rows || []);
    return { data: list.map((r: any) => ({ status: r.status, count: Number(r.cnt) })) };
  });
}

// ─── Projects CRUD ────────────────────────────────────────────────────────────

export async function getGraduationProjects(filters?: { search?: string; status?: string; department?: string }) {
  return protectedDbAction("Academics", "canView", async () => {
    await ensureMigrations();
    const schoolId = await getActiveSchoolId();
    const data = await db.query.graduationProjects.findMany({
      where: eq(graduationProjects.schoolId, schoolId),
      with: {
        student: true,
        supervisor: true,
        president: true,
        examiner: true,
        rapporteur: true,
        secretary: true,
        documents: true,
        evaluations: true,
        archive: true,
      },
      orderBy: desc(graduationProjects.id),
    });
    return { data };
  });
}

export async function saveGraduationProject(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    await ensureMigrations();
    const schoolId = await getActiveSchoolId();
    const { id, createdAt, updatedAt, student, supervisor, president, examiner, rapporteur, secretary, documents, evaluations, archive, workflowLogs, ...rest } = data;

    // Parse numeric/date fields
    const fields: any = { ...rest };
    const numericFields = ["studentId", "supervisorId", "presidentId", "examinerId", "rapporteurId", "secretaryId", "progressPercent", "defenseDurationMins"];
    numericFields.forEach(f => {
      if (fields[f] !== undefined && fields[f] !== null && fields[f] !== "") {
        fields[f] = parseInt(fields[f]);
      } else if (fields[f] === "") {
        fields[f] = null;
      }
    });
    if (fields.grade !== undefined && fields.grade !== null && fields.grade !== "") {
      fields.grade = parseFloat(fields.grade);
    }
    if (fields.defenseDate) fields.defenseDate = new Date(fields.defenseDate);
    if (fields.startDate) fields.startDate = new Date(fields.startDate);
    if (fields.endDate) fields.endDate = new Date(fields.endDate);

    let projectId = id;
    const prevStatus = data._prevStatus;

    if (id) {
      await db.update(graduationProjects)
        .set({ ...fields, schoolId, updatedAt: new Date() })
        .where(and(eq(graduationProjects.id, id), eq(graduationProjects.schoolId, schoolId)));
    } else {
      // Auto-generate project code
      const year = new Date().getFullYear();
      const countRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM graduation_projects WHERE school_id = ${schoolId}`) as any;
      const cnt = Array.isArray(countRes) ? countRes[0]?.cnt : (countRes?.rows?.[0]?.cnt || 0);
      const code = `PFE-${year}-${String(Number(cnt) + 1).padStart(3, "0")}`;
      const inserted = await db.insert(graduationProjects).values({
        ...fields,
        projectCode: code,
        schoolId,
      }).returning({ id: graduationProjects.id });
      projectId = inserted[0]?.id;
    }

    // Log workflow transition
    if (projectId && fields.status && fields.status !== prevStatus) {
      await db.execute(sql`
        INSERT INTO graduation_workflow_logs (project_id, from_status, to_status, changed_at)
        VALUES (${projectId}, ${prevStatus || null}, ${fields.status}, NOW())
      `);
    }

    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true, projectId };
  });
}

export async function deleteGraduationProject(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(graduationProjects).where(and(eq(graduationProjects.id, id), eq(graduationProjects.schoolId, schoolId)));
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────

export async function saveProjectDocument(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, uploadedAt, ...rest } = data;
    if (id) {
      await db.update(graduationDocuments).set({ ...rest, schoolId }).where(and(eq(graduationDocuments.id, id), eq(graduationDocuments.schoolId, schoolId)));
    } else {
      await db.insert(graduationDocuments).values({ ...rest, schoolId });
    }
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

export async function deleteProjectDocument(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(graduationDocuments).where(and(eq(graduationDocuments.id, id), eq(graduationDocuments.schoolId, schoolId)));
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// ─── Defense Rooms ────────────────────────────────────────────────────────────

export async function getDefenseRooms() {
  return protectedDbAction("Academics", "canView", async () => {
    await ensureMigrations();
    const schoolId = await getActiveSchoolId();
    const data = await db.query.graduationDefenseRooms.findMany({
      where: eq(graduationDefenseRooms.schoolId, schoolId),
      orderBy: desc(graduationDefenseRooms.id),
    });
    return { data };
  });
}

export async function saveDefenseRoom(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, createdAt, ...rest } = data;
    if (id) {
      await db.update(graduationDefenseRooms).set({ ...rest, schoolId }).where(and(eq(graduationDefenseRooms.id, id), eq(graduationDefenseRooms.schoolId, schoolId)));
    } else {
      await db.insert(graduationDefenseRooms).values({ ...rest, schoolId });
    }
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

export async function deleteDefenseRoom(id: number) {
  return protectedDbAction("Academics", "canDelete", async () => {
    const schoolId = await getActiveSchoolId();
    await db.delete(graduationDefenseRooms).where(and(eq(graduationDefenseRooms.id, id), eq(graduationDefenseRooms.schoolId, schoolId)));
    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// Check for defense room conflict
export async function checkRoomConflict(roomName: string, defenseDate: string, excludeId?: number) {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const dateObj = new Date(defenseDate);
    const windowStart = new Date(dateObj.getTime() - 90 * 60 * 1000); // -90 min
    const windowEnd = new Date(dateObj.getTime() + 90 * 60 * 1000);   // +90 min
    const conflicts = await db.execute(sql`
      SELECT id, title FROM graduation_projects
      WHERE room_name = ${roomName}
        AND school_id = ${schoolId}
        AND defense_date BETWEEN ${windowStart.toISOString()} AND ${windowEnd.toISOString()}
        ${excludeId ? sql`AND id != ${excludeId}` : sql``}
    `) as any;
    const list = Array.isArray(conflicts) ? conflicts : (conflicts?.rows || []);
    return { data: { hasConflict: list.length > 0, conflicts: list } };
  });
}

// ─── Jury Evaluation ──────────────────────────────────────────────────────────

export async function saveJuryEvaluation(data: any) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const { id, evaluatedAt, ...rest } = data;

    // Calculate average
    const scores = [rest.scienceQuality, rest.methodology, rest.presentation, rest.innovation, rest.questions].map(Number).filter(n => !isNaN(n));
    const average = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

    let mention = "Insuffisant";
    if (average >= 16) mention = "Très Bien";
    else if (average >= 14) mention = "Bien";
    else if (average >= 12) mention = "Assez Bien";
    else if (average >= 10) mention = "Passable";

    const fields = { ...rest, average, mention, schoolId };

    if (id) {
      await db.update(graduationJuryEvaluations).set(fields).where(and(eq(graduationJuryEvaluations.id, id), eq(graduationJuryEvaluations.schoolId, schoolId)));
    } else {
      await db.insert(graduationJuryEvaluations).values(fields);
    }

    // Update project grade/mention/decision
    if (rest.projectId) {
      await db.update(graduationProjects).set({
        grade: average,
        mention,
        decision: rest.decision || (average >= 10 ? "Validé" : "Refusé"),
        status: "Délibération",
        updatedAt: new Date(),
      }).where(and(eq(graduationProjects.id, rest.projectId), eq(graduationProjects.schoolId, schoolId)));
    }

    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true };
  });
}

// ─── Archive ──────────────────────────────────────────────────────────────────

export async function archiveProject(projectId: number) {
  return protectedDbAction("Academics", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const year = new Date().getFullYear();

    const countRes = await db.execute(sql`SELECT COUNT(*) as cnt FROM graduation_archives WHERE school_id = ${schoolId}`) as any;
    const cnt = Array.isArray(countRes) ? countRes[0]?.cnt : (countRes?.rows?.[0]?.cnt || 0);
    const archiveRef = `ARCH-${year}-${String(Number(cnt) + 1).padStart(4, "0")}`;
    const permanentLink = `/library/${archiveRef}`;

    await db.insert(graduationArchives).values({
      projectId,
      schoolId,
      archiveRef,
      permanentLink,
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(permanentLink)}`,
    });

    await db.update(graduationProjects).set({
      status: "Archivage",
      archiveRef,
      archiveUrl: permanentLink,
      updatedAt: new Date(),
    }).where(and(eq(graduationProjects.id, projectId), eq(graduationProjects.schoolId, schoolId)));

    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true, archiveRef, permanentLink };
  });
}

// ─── Digital Library Search ───────────────────────────────────────────────────

export async function getDigitalLibrary(search?: string, department?: string) {
  return protectedDbAction("Academics", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const data = await db.query.graduationProjects.findMany({
      where: and(
        eq(graduationProjects.schoolId, schoolId),
        eq(graduationProjects.status, "Archivage"),
        search ? or(
          ilike(graduationProjects.title, `%${search}%`),
          ilike(graduationProjects.keywords, `%${search}%`)
        ) : undefined,
        department ? eq(graduationProjects.department, department) : undefined,
      ),
      with: {
        student: true,
        supervisor: true,
        archive: true,
      },
      orderBy: desc(graduationProjects.id),
    });
    return { data };
  });
}

// ─── Student Search ───────────────────────────────────────────────────────────

export async function searchStudentsForGraduation(query: string) {
  return protectedDbAction("Academics", "canView", async () => {
    if (!query || query.trim() === "") return { data: [] };
    const schoolId = await getActiveSchoolId();
    const data = await db.query.students.findMany({
      where: and(
        eq(students.schoolId, schoolId),
        or(
          ilike(students.nomEtudiant, `%${query}%`),
          ilike(students.numAdmission, `%${query}%`)
        )
      ),
      limit: 10
    });
    return { data };
  });
}

// ─── Seed Sample Graduation & Research Projects ───────────────────────────────

export async function seedSampleGraduationData() {
  return protectedDbAction("Academics", "canEdit", async () => {
    await ensureMigrations();
    const schoolId = await getActiveSchoolId();
    if (!schoolId) return { error: "Aucun contexte d'école trouvé." };

    // 1. Seed Defense Rooms if none exist
    const existingRooms = await db.query.graduationDefenseRooms.findMany({
      where: eq(graduationDefenseRooms.schoolId, schoolId),
    });

    let roomAlKindi = "Salle des Thèses Al-Kindi (B1)";
    let roomAmphi = "Amphithéâtre A - Délibérations & Thèses";
    let roomLab = "Laboratoire Multimédia & Recherche IA";

    if (existingRooms.length === 0) {
      await db.insert(graduationDefenseRooms).values([
        {
          schoolId,
          roomName: roomAmphi,
          capacity: 90,
          location: "Bâtiment Central, 1er Étage",
          equipment: "Vidéoprojecteur Laser 4K, 4 Micros sans fil, Enregistrement audio HD, Climatisation, Visioconférence Zoom/Teams",
          isAvailable: true,
        },
        {
          schoolId,
          roomName: roomAlKindi,
          capacity: 40,
          location: "Pavillon Master & Recherche, RDC",
          equipment: "Écran interactif tactile 75\", Système audio délibération confidentielle, Climatisation, Caméra PTZ HD",
          isAvailable: true,
        },
        {
          schoolId,
          roomName: roomLab,
          capacity: 30,
          location: "Faculté d'Informatique, Aile Ouest",
          equipment: "Serveurs GPU, 2 Écrans muraux de projection, Réseau dédié 1Gbps, Pupitre orateur multimédia",
          isAvailable: true,
        },
      ]);
    } else {
      roomAmphi = existingRooms[0]?.roomName || roomAmphi;
      roomAlKindi = existingRooms[1]?.roomName || existingRooms[0]?.roomName || roomAlKindi;
      roomLab = existingRooms[2]?.roomName || roomAlKindi;
    }

    // 2. Fetch available students and employees
    const availableStudents = await db.query.students.findMany({
      where: eq(students.schoolId, schoolId),
      limit: 10,
    });
    const availableTeachers = await db.query.employees.findMany({
      where: eq(employees.schoolId, schoolId),
      limit: 10,
    });

    const sId = (idx: number) => availableStudents[idx]?.id || null;
    const tId = (idx: number) => availableTeachers[idx]?.id || null;

    const now = new Date();
    const defenseDate1 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    defenseDate1.setHours(10, 0, 0, 0);

    const defenseDate2 = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    defenseDate2.setHours(14, 30, 0, 0);

    const defenseDatePast = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    defenseDatePast.setHours(9, 30, 0, 0);

    // 3. Sample Projects to insert
    const sampleProjects = [
      {
        projectCode: "PFE-2026-001",
        title: "Système Embarqué IoT et Intelligence Artificielle pour la Gestion Hydrique Sahélienne",
        summary: "Développement d'un réseau de capteurs IoT à basse consommation avec modèle d'inférence TinyML pour la gestion hydrique automatisée des cultures maraîchères au Niger.",
        keywords: "IoT, TinyML, Irrigation Intelligente, Agriculture Sahélienne, Énergie Solaire",
        department: "Informatique",
        filiere: "Génie Logiciel & Systèmes Embarqués",
        niveau: "Master",
        language: "Français",
        academicYear: "2025-2026",
        studentId: sId(0),
        supervisorId: tId(0),
        status: "Proposition",
        progressPercent: 25,
      },
      {
        projectCode: "PFE-2026-002",
        title: "Analyse Économétrique de l'Impact de la Digitalisation Fiscale sur les Recettes Publiques",
        summary: "Évaluation empirique des effets de la facture électronique et du paiement mobile sur l'assiette fiscale et le secteur informel dans l'espace UEMOA.",
        keywords: "Fiscalité Numérique, Économétrie, Recettes Publiques, Mobile Money, UEMOA",
        department: "Économie",
        filiere: "Économie du Développement",
        niveau: "Master",
        language: "Français",
        academicYear: "2025-2026",
        studentId: sId(1),
        supervisorId: tId(1),
        status: "Encadrement",
        progressPercent: 65,
      },
      {
        projectCode: "PFE-2026-003",
        title: "Conception et Dimensionnement d'un Micro-Réseau Hybride Photovoltaïque / Biomasse",
        summary: "Modélisation technico-économique sous HOMER Pro d'une mini-centrale autonome pour l'électrification rurale de la région de Dosso.",
        keywords: "Énergies Renouvelables, Photovoltaïque, Micro-réseau, HOMER Pro, Électrification Rurale",
        department: "Physique",
        filiere: "Génie Énergétique",
        niveau: "Licence",
        language: "Français",
        academicYear: "2025-2026",
        studentId: sId(2),
        supervisorId: tId(2),
        status: "Pré-soutenance",
        progressPercent: 85,
      },
      {
        projectCode: "PFE-2026-004",
        title: "Architecture de Sécurité Zero Trust et Détection d'Intrusions par Graph Neural Networks",
        summary: "Implémentation d'un système de surveillance réseau basé sur les graphes et modèles d'attention pour la détection proactive des menaces persistantes avancées (APT).",
        keywords: "Cybersécurité, Zero Trust, Graph Neural Networks, Détection d'Intrusions, SIEM",
        department: "Informatique",
        filiere: "Cybersécurité & Réseaux",
        niveau: "Master",
        language: "Français",
        academicYear: "2025-2026",
        studentId: sId(3),
        supervisorId: tId(0),
        presidentId: tId(1),
        rapporteurId: tId(2),
        examinerId: tId(3),
        defenseDate: defenseDate1,
        roomName: roomAlKindi,
        defenseDurationMins: 60,
        status: "Soutenance",
        progressPercent: 95,
      },
      {
        projectCode: "PFE-2026-005",
        title: "Le Contrôle de Constitutionnalité en Période d'Exception : Étude Comparée en Afrique de l'Ouest",
        summary: "Analyse jurisprudentielle des cours constitutionnelles face aux états d'urgence et aux transitions politiques en zone CEDEAO.",
        keywords: "Droit Constitutionnel, État de Droit, CEDEAO, Droits Fondamentaux, Transition Politique",
        department: "Droit",
        filiere: "Droit Public Fondamental",
        niveau: "Licence",
        language: "Français",
        academicYear: "2025-2026",
        studentId: sId(4),
        supervisorId: tId(3),
        presidentId: tId(0),
        rapporteurId: tId(1),
        examinerId: tId(2),
        defenseDate: defenseDate2,
        roomName: roomAmphi,
        defenseDurationMins: 75,
        status: "Soutenance",
        progressPercent: 90,
      },
      {
        projectCode: "PFE-2026-006",
        title: "Modélisation Stochastique de la Dynamique de Transmission du Paludisme en Climat Sahélien",
        summary: "Formulation d'équations différentielles stochastiques intégrant les variations pluviométriques et simulation de scénarios d'intervention vaccinale.",
        keywords: "Biomathématiques, Équations Stochastiques, Modélisation Épidémiologique, Paludisme",
        department: "Mathématiques",
        filiere: "Mathématiques Appliquées",
        niveau: "Master",
        language: "Français",
        academicYear: "2025-2026",
        studentId: sId(5),
        supervisorId: tId(1),
        presidentId: tId(2),
        rapporteurId: tId(0),
        examinerId: tId(3),
        defenseDate: defenseDatePast,
        roomName: roomLab,
        defenseDurationMins: 60,
        status: "Délibération",
        progressPercent: 100,
        grade: 16.5,
        mention: "Très Bien",
        decision: "Validé",
      },
      {
        projectCode: "PFE-2026-007",
        title: "Profil Épidémiologique et Marqueurs Moléculaires de Résistance aux Antipaludiques au Sahel",
        summary: "Étude transversale sur 450 échantillons cliniques mettant en évidence les mutations génétiques k13 et pfcrt associées à la tolérance aux dérivés d'artémisinine.",
        keywords: "Biologie Moléculaire, Paludisme, Pharmacorésistance, Séquençage ADN, Santé Publique",
        department: "Médecine",
        filiere: "Sciences Biomédicales",
        niveau: "Doctorat",
        language: "Français",
        academicYear: "2024-2025",
        studentId: sId(6),
        supervisorId: tId(2),
        presidentId: tId(0),
        rapporteurId: tId(1),
        examinerId: tId(3),
        defenseDate: defenseDatePast,
        roomName: roomAmphi,
        defenseDurationMins: 90,
        status: "Archivage",
        progressPercent: 100,
        grade: 18.0,
        mention: "Très Bien",
        decision: "Validé avec Félicitations du Jury",
        isDistinguished: true,
        isPublished: true,
        archiveRef: "ARCH-2026-0001",
        archiveUrl: "/library/ARCH-2026-0001",
      },
    ];

    for (const proj of sampleProjects) {
      const inserted = await db.insert(graduationProjects).values({
        ...proj,
        schoolId,
      }).returning({ id: graduationProjects.id });

      const newProjId = inserted[0]?.id;
      if (!newProjId) continue;

      // Add sample documents
      await db.insert(graduationDocuments).values([
        {
          projectId: newProjId,
          schoolId,
          docType: "Proposition",
          title: "Note de Cadrage & Cahier des Charges Initial",
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          version: "v1.0",
          notes: "Validé par la commission pédagogique",
        },
        {
          projectId: newProjId,
          schoolId,
          docType: "Rapport PDF",
          title: `Mémoire Final — ${proj.title}`,
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          version: "v2.1 Final",
          notes: "Rapport complet avec annexes et références bibliographiques",
        },
        {
          projectId: newProjId,
          schoolId,
          docType: "Présentation PPT",
          title: "Support Diapositives de Soutenance",
          fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          version: "v1.0",
          notes: "Diaporama officiel pour les 20 minutes d'exposé oral",
        },
      ]);

      // If project has grade (P6 or P7), add jury evaluation
      if (proj.grade) {
        await db.insert(graduationJuryEvaluations).values({
          projectId: newProjId,
          schoolId,
          scienceQuality: proj.grade >= 17 ? 18.0 : 16.5,
          methodology: proj.grade >= 17 ? 17.5 : 16.0,
          presentation: proj.grade >= 17 ? 18.5 : 17.0,
          innovation: proj.grade >= 17 ? 18.0 : 16.0,
          questions: proj.grade >= 17 ? 18.0 : 17.0,
          average: proj.grade,
          mention: proj.mention,
          decision: proj.decision,
          juryComments: proj.grade >= 17
            ? "Travail d'une qualité scientifique exceptionnelle, rigueur méthodologique irréprochable et maîtrise parfaite du sujet par le candidat."
            : "Très bon travail de recherche, démarche rigoureuse et excellente soutenance orale.",
        });
      }

      // If archived project, add archive entry
      if (proj.status === "Archivage" && proj.archiveRef) {
        await db.insert(graduationArchives).values({
          projectId: newProjId,
          schoolId,
          archiveRef: proj.archiveRef,
          permanentLink: proj.archiveUrl,
          qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(proj.archiveUrl || "")}`,
        });
      }
    }

    revalidatePath("/dashboard/academics/research-graduation");
    return { success: true, count: sampleProjects.length };
  });
}
