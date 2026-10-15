"use server";

import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";
import crypto from "crypto";

const REVALIDATE = "/dashboard/alumni";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function generateCertNumber(year: number, id: number) {
  return `CERT-${year}-${String(id).padStart(5, "0")}`;
}

function generateVerificationCode() {
  return crypto.randomBytes(24).toString("hex");
}

// ─── ALUMNI CRUD ──────────────────────────────────────────────────────────────

export async function getAlumni(filters?: {
  year?: number;
  level?: string;
  search?: string;
}) {
  return protectedDbAction("Alumni", "canView", async () => {
    const schoolId = (await getActiveSchoolId()) || 9;
    const rows = await db.execute(sql`
      SELECT a.*,
        (SELECT COUNT(*) FROM digital_certificates dc WHERE dc.alumni_id = a.id AND dc.is_valid = TRUE) as cert_count
      FROM alumni a
      WHERE (a.school_id = ${schoolId} OR a.school_id IS NULL)
        ${filters?.year ? sql`AND a.graduation_year = ${filters.year}` : sql``}
        ${filters?.level ? sql`AND a.level_completed ILIKE ${`%${filters.level}%`}` : sql``}
        ${filters?.search ? sql`AND (a.full_name ILIKE ${`%${filters.search}%`} OR a.email ILIKE ${`%${filters.search}%`} OR a.phone ILIKE ${`%${filters.search}%`})` : sql``}
      ORDER BY a.graduation_year DESC, a.full_name ASC
      LIMIT 500
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

export async function saveAlumnus(data: {
  id?: number;
  studentId?: number;
  fullName: string;
  gender?: string;
  dateOfBirth?: string;
  nationality?: string;
  phone?: string;
  email?: string;
  address?: string;
  graduationYear: number;
  levelCompleted: string;
  seriesOrTrack?: string;
  finalGrade?: string;
  mention?: string;
  examCenter?: string;
  examRegistrationNumber?: string;
  currentSituation?: string;
  currentEmployer?: string;
  higherEducationInstitution?: string;
  higherEducationField?: string;
  notes?: string;
}) {
  return protectedDbAction("Alumni", "canEdit", async () => {
    const schoolId = (await getActiveSchoolId()) || 9;
    const gradYear = Number(data.graduationYear) || new Date().getFullYear();
    const dob = data.dateOfBirth && !isNaN(new Date(data.dateOfBirth).getTime()) 
      ? new Date(data.dateOfBirth).toISOString().split("T")[0] 
      : null;

    if (data.id) {
      await db.execute(sql`
        UPDATE alumni SET
          full_name = ${data.fullName},
          gender = ${data.gender ?? "M"},
          date_of_birth = ${dob ? sql`${dob}::date` : null},
          nationality = ${data.nationality ?? "Nigérienne"},
          phone = ${data.phone ?? null},
          email = ${data.email ?? null},
          address = ${data.address ?? null},
          graduation_year = ${gradYear},
          level_completed = ${data.levelCompleted},
          series_or_track = ${data.seriesOrTrack ?? null},
          final_grade = ${data.finalGrade ?? null},
          mention = ${data.mention ?? null},
          exam_center = ${data.examCenter ?? null},
          exam_registration_number = ${data.examRegistrationNumber ?? null},
          current_situation = ${data.currentSituation ?? "Inconnu"},
          current_employer = ${data.currentEmployer ?? null},
          higher_education_institution = ${data.higherEducationInstitution ?? null},
          higher_education_field = ${data.higherEducationField ?? null},
          notes = ${data.notes ?? null},
          updated_at = NOW()
        WHERE id = ${data.id} AND (school_id = ${schoolId} OR school_id IS NULL)
      `);
      revalidatePath(REVALIDATE);
      return { success: true, id: data.id };
    } else {
      const res = await db.execute(sql`
        INSERT INTO alumni
          (school_id, student_id, full_name, gender, date_of_birth, nationality, phone, email, address,
           graduation_year, level_completed, series_or_track, final_grade, mention, exam_center,
           exam_registration_number, current_situation, current_employer,
           higher_education_institution, higher_education_field, notes)
        VALUES
          (${schoolId}, ${data.studentId ?? null}, ${data.fullName}, ${data.gender ?? "M"},
           ${dob ? sql`${dob}::date` : null}, ${data.nationality ?? "Nigérienne"},
           ${data.phone ?? null}, ${data.email ?? null}, ${data.address ?? null},
           ${gradYear}, ${data.levelCompleted}, ${data.seriesOrTrack ?? null},
           ${data.finalGrade ?? null}, ${data.mention ?? null}, ${data.examCenter ?? null},
           ${data.examRegistrationNumber ?? null}, ${data.currentSituation ?? "Inconnu"},
           ${data.currentEmployer ?? null}, ${data.higherEducationInstitution ?? null},
           ${data.higherEducationField ?? null}, ${data.notes ?? null})
        RETURNING id
      `);
      const newId = (res as any[])[0]?.id;
      revalidatePath(REVALIDATE);
      return { success: true, id: newId };
    }
  });
}

export async function deleteAlumnus(id: number) {
  return protectedDbAction("Alumni", "canEdit", async () => {
    const schoolId = (await getActiveSchoolId()) || 9;
    await db.execute(sql`DELETE FROM alumni WHERE id = ${id} AND (school_id = ${schoolId} OR school_id IS NULL)`);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

// ─── DIGITAL CERTIFICATES ─────────────────────────────────────────────────────

export async function getCertificates(alumniId?: number) {
  return protectedDbAction("Alumni", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT dc.*, a.phone as alumni_phone, a.email as alumni_email
      FROM digital_certificates dc
      LEFT JOIN alumni a ON a.id = dc.alumni_id
      WHERE dc.school_id = ${schoolId}
        ${alumniId ? sql`AND dc.alumni_id = ${alumniId}` : sql``}
      ORDER BY dc.created_at DESC
      LIMIT 300
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

export async function issueCertificate(data: {
  alumniId: number;
  certificateType?: string;
  schoolName?: string;
  directorName?: string;
  issuedBy?: string;
  notes?: string;
}) {
  return protectedDbAction("Alumni", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();

    // Fetch alumni data
    const alumniRows = await db.execute(sql`
      SELECT * FROM alumni WHERE id = ${data.alumniId} AND school_id = ${schoolId}
    `);
    const alumnus = (alumniRows as any[])[0];
    if (!alumnus) return { error: "Diplômé introuvable" };

    // Generate unique cert number + verification code
    const countRes = await db.execute(sql`SELECT COUNT(*) as c FROM digital_certificates WHERE school_id = ${schoolId}`);
    const idx = Number((countRes as any[])[0]?.c ?? 0) + 1;
    const certNumber = generateCertNumber(alumnus.graduation_year, idx);
    const verificationCode = generateVerificationCode();

    await db.execute(sql`
      INSERT INTO digital_certificates
        (school_id, alumni_id, certificate_type, certificate_number, verification_code,
         full_name, date_of_birth, graduation_year, level_completed, series_or_track,
         final_grade, mention, exam_registration_number,
         school_name, director_name, issued_by, issued_date, is_valid, notes)
      VALUES
        (${schoolId}, ${data.alumniId},
         ${data.certificateType ?? "Attestation de Réussite"},
         ${certNumber}, ${verificationCode},
         ${alumnus.full_name}, ${alumnus.date_of_birth},
         ${alumnus.graduation_year}, ${alumnus.level_completed},
         ${alumnus.series_or_track ?? null}, ${alumnus.final_grade ?? null},
         ${alumnus.mention ?? null}, ${alumnus.exam_registration_number ?? null},
         ${data.schoolName ?? "École Edut"},
         ${data.directorName ?? "M. Directeur"},
         ${data.issuedBy ?? "Administration"},
         CURRENT_DATE, TRUE, ${data.notes ?? null})
    `);

    revalidatePath(REVALIDATE);
    return { success: true, certNumber, verificationCode };
  });
}

export async function revokeCertificate(id: number, reason: string) {
  return protectedDbAction("Alumni", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`
      UPDATE digital_certificates SET
        is_valid = FALSE,
        revoked_reason = ${reason},
        revoked_at = NOW()
      WHERE id = ${id} AND school_id = ${schoolId}
    `);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function deleteCertificate(id: number) {
  return protectedDbAction("Alumni", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`DELETE FROM digital_certificates WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

// ─── PUBLIC VERIFICATION ──────────────────────────────────────────────────────

export async function verifyCertificate(code: string) {
  // Public action — no auth required
  const rows = await db.execute(sql`
    SELECT dc.*, s.name as school_display_name
    FROM digital_certificates dc
    LEFT JOIN schools s ON s.id = dc.school_id
    WHERE dc.verification_code = ${code.trim()}
    LIMIT 1
  `).catch(() => [] as any[]);

  const cert = (rows as any[])[0];
  if (!cert) {
    // Log failed attempt
    await db.execute(sql`
      INSERT INTO certificate_verification_logs (verification_code, result)
      VALUES (${code.trim()}, 'NOT_FOUND')
    `).catch(() => {});
    return { valid: false, message: "Certificat introuvable ou code invalide" };
  }

  // Log successful verification
  await db.execute(sql`
    INSERT INTO certificate_verification_logs (certificate_id, verification_code, result)
    VALUES (${cert.id}, ${code.trim()}, ${cert.is_valid ? "VALID" : "REVOKED"})
  `).catch(() => {});

  return {
    valid: cert.is_valid,
    revoked: !cert.is_valid,
    revokedReason: cert.revoked_reason ?? null,
    certificate: cert,
  };
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getAlumniKPIs() {
  return protectedDbAction("Alumni", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const [total, certsIssued, thisYear, withContact] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as c FROM alumni WHERE school_id = ${schoolId}`).catch(() => [{ c: 0 }]),
      db.execute(sql`SELECT COUNT(*) as c FROM digital_certificates WHERE school_id = ${schoolId} AND is_valid = TRUE`).catch(() => [{ c: 0 }]),
      db.execute(sql`SELECT COUNT(*) as c FROM alumni WHERE school_id = ${schoolId} AND graduation_year = ${new Date().getFullYear()}`).catch(() => [{ c: 0 }]),
      db.execute(sql`SELECT COUNT(*) as c FROM alumni WHERE school_id = ${schoolId} AND (email IS NOT NULL OR phone IS NOT NULL)`).catch(() => [{ c: 0 }]),
    ]);

    return {
      totalAlumni: Number((total as any[])[0]?.c ?? 0),
      certificatesIssued: Number((certsIssued as any[])[0]?.c ?? 0),
      graduatedThisYear: Number((thisYear as any[])[0]?.c ?? 0),
      withContact: Number((withContact as any[])[0]?.c ?? 0),
    };
  });
}

export async function getAlumniStats() {
  return protectedDbAction("Alumni", "canView", async () => {
    const schoolId = await getActiveSchoolId();

    const [byYear, byLevel, byMention] = await Promise.all([
      db.execute(sql`
        SELECT graduation_year, COUNT(*) as count
        FROM alumni WHERE school_id = ${schoolId}
        GROUP BY graduation_year ORDER BY graduation_year DESC LIMIT 10
      `).catch(() => [] as any[]),
      db.execute(sql`
        SELECT level_completed, COUNT(*) as count
        FROM alumni WHERE school_id = ${schoolId}
        GROUP BY level_completed ORDER BY count DESC
      `).catch(() => [] as any[]),
      db.execute(sql`
        SELECT mention, COUNT(*) as count
        FROM alumni WHERE school_id = ${schoolId} AND mention IS NOT NULL
        GROUP BY mention ORDER BY count DESC
      `).catch(() => [] as any[]),
    ]);

    return { byYear, byLevel, byMention };
  });
}
