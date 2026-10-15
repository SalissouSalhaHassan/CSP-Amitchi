import crypto from "crypto";
import { sql } from "drizzle-orm";
import { readDb } from "@/infrastructure/database";

export type VerifiedDocumentStatus = "validé" | "provisoire" | "annulé" | "introuvable" | "erreur";

export interface DocumentVerificationData {
  documentNumber: string;
  type: string;
  recipientName: string;
  classOrDetails: string;
  schoolName: string;
  schoolId: string;
  dateGeneration: string;
  utilisateur: string;
  statut: VerifiedDocumentStatus;
  hash: string;
  amount?: string;
}

function normalizeReference(reference: string) {
  return decodeURIComponent(reference || "").trim();
}

function formatDate(value: unknown) {
  if (!value) return "Non renseigné";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "Non renseigné";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Africa/Niamey",
  }).format(date);
}

function formatAmount(value: unknown) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("fr-FR")} CFA`;
}

function hashDocument(data: Record<string, unknown>) {
  return `sha256-${crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex")}`;
}

function statusFromText(value: unknown): VerifiedDocumentStatus {
  const status = String(value || "").toLowerCase();
  if (status.includes("annul") || status.includes("cancel") || status.includes("void")) return "annulé";
  if (status.includes("pending") || status.includes("provisoire") || status.includes("hors ligne")) return "provisoire";
  return "validé";
}

function firstRow<T = any>(result: any): T | null {
  const rows = Array.isArray(result) ? result : result?.rows;
  return rows?.[0] || null;
}

export async function verifyOfficialDocument(reference: string): Promise<DocumentVerificationData | null> {
  const cleanId = normalizeReference(reference);
  if (!cleanId) return null;

  try {
    const feePayment = firstRow(await readDb.execute(sql`
      SELECT
        fp.reference,
        fp.amount,
        fp.date_paid,
        fp.recorded_by,
        fp.month_concerned,
        s.id AS school_id,
        s.name AS school_name,
        st.nom_etudiant,
        st.classe,
        ss.session_name
      FROM fee_payments fp
      LEFT JOIN student_fees sf ON sf.id = fp.fee_id AND sf.school_id = fp.school_id
      LEFT JOIN students st ON st.id = sf.student_id AND st.school_id = fp.school_id
      LEFT JOIN schools s ON s.id = fp.school_id
      LEFT JOIN school_sessions ss ON ss.id = sf.session_id
      WHERE fp.reference = ${cleanId}
      LIMIT 1
    `));

    if (feePayment) {
      return {
        documentNumber: cleanId,
        type: "Reçu de paiement de scolarité",
        recipientName: feePayment.nom_etudiant || "Bénéficiaire non renseigné",
        classOrDetails: `${feePayment.classe || "Classe non renseignée"} - ${feePayment.month_concerned || feePayment.session_name || "Paiement scolaire"}`,
        schoolName: feePayment.school_name || "Établissement non renseigné",
        schoolId: String(feePayment.school_id || "N/A"),
        dateGeneration: formatDate(feePayment.date_paid),
        utilisateur: feePayment.recorded_by || "Service financier",
        statut: "validé",
        hash: hashDocument({ source: "fee_payments", reference: cleanId, id: feePayment.reference, amount: feePayment.amount }),
        amount: formatAmount(feePayment.amount),
      };
    }

    const cogesPayment = firstRow(await readDb.execute(sql`
      SELECT
        cp.receipt_number,
        cp.amount,
        cp.date_paid,
        cp.status,
        cp.recorded_by,
        cp.received_from,
        cp.classe,
        cp.session,
        cp.purpose,
        s.id AS school_id,
        s.name AS school_name
      FROM coges_payments cp
      LEFT JOIN schools s ON s.id = cp.school_id
      WHERE cp.receipt_number = ${cleanId}
      LIMIT 1
    `));

    if (cogesPayment) {
      return {
        documentNumber: cleanId,
        type: "Reçu COGES",
        recipientName: cogesPayment.received_from || "Bénéficiaire non renseigné",
        classOrDetails: `${cogesPayment.classe || "Classe non renseignée"} - ${cogesPayment.purpose || cogesPayment.session || "Paiement COGES"}`,
        schoolName: cogesPayment.school_name || "Établissement non renseigné",
        schoolId: String(cogesPayment.school_id || "N/A"),
        dateGeneration: formatDate(cogesPayment.date_paid),
        utilisateur: cogesPayment.recorded_by || "Service COGES",
        statut: statusFromText(cogesPayment.status),
        hash: hashDocument({ source: "coges_payments", reference: cleanId, amount: cogesPayment.amount, status: cogesPayment.status }),
        amount: formatAmount(cogesPayment.amount),
      };
    }

    const posSale = firstRow(await readDb.execute(sql`
      SELECT
        ps.receipt_number,
        ps.total_amount,
        ps.payment_method,
        ps.status,
        ps.created_at,
        s.id AS school_id,
        s.name AS school_name
      FROM pos_sales ps
      LEFT JOIN schools s ON s.id = ps.school_id
      WHERE ps.receipt_number = ${cleanId}
      LIMIT 1
    `));

    if (posSale) {
      return {
        documentNumber: cleanId,
        type: "Reçu de vente POS",
        recipientName: "Client / Bénéficiaire",
        classOrDetails: `Paiement: ${posSale.payment_method || "Non renseigné"}`,
        schoolName: posSale.school_name || "Établissement non renseigné",
        schoolId: String(posSale.school_id || "N/A"),
        dateGeneration: formatDate(posSale.created_at),
        utilisateur: "Point de vente",
        statut: statusFromText(posSale.status),
        hash: hashDocument({ source: "pos_sales", reference: cleanId, amount: posSale.total_amount, status: posSale.status }),
        amount: formatAmount(posSale.total_amount),
      };
    }

    const graduationArchive = firstRow(await readDb.execute(sql`
      SELECT
        ga.archive_ref,
        ga.archived_at,
        gp.title,
        gp.department,
        gp.filiere,
        gp.academic_year,
        gp.status,
        gp.decision,
        st.nom_etudiant,
        s.id AS school_id,
        s.name AS school_name
      FROM graduation_archives ga
      LEFT JOIN graduation_projects gp ON gp.id = ga.project_id AND gp.school_id = ga.school_id
      LEFT JOIN students st ON st.id = gp.student_id AND st.school_id = ga.school_id
      LEFT JOIN schools s ON s.id = ga.school_id
      WHERE ga.archive_ref = ${cleanId} OR gp.archive_ref = ${cleanId}
      LIMIT 1
    `));

    if (graduationArchive) {
      return {
        documentNumber: cleanId,
        type: "Archive numérique de soutenance",
        recipientName: graduationArchive.nom_etudiant || "Étudiant non renseigné",
        classOrDetails: `${graduationArchive.title || "Projet non renseigné"} - ${graduationArchive.department || graduationArchive.filiere || graduationArchive.academic_year || "Détails non renseignés"}`,
        schoolName: graduationArchive.school_name || "Établissement non renseigné",
        schoolId: String(graduationArchive.school_id || "N/A"),
        dateGeneration: formatDate(graduationArchive.archived_at),
        utilisateur: "Service académique",
        statut: statusFromText(graduationArchive.decision || graduationArchive.status),
        hash: hashDocument({ source: "graduation_archives", reference: cleanId, title: graduationArchive.title, status: graduationArchive.status }),
      };
    }

    const lmsCertificate = firstRow(await readDb.execute(sql`
      SELECT
        lc.certificate_code,
        lc.issue_date,
        st.nom_etudiant,
        st.classe,
        c.title AS course_title,
        s.id AS school_id,
        s.name AS school_name
      FROM lms_certificates lc
      LEFT JOIN students st ON st.id = lc.student_id
      LEFT JOIN lms_courses c ON c.id = lc.course_id
      LEFT JOIN school_classes sc ON sc.id = c.class_id
      LEFT JOIN schools s ON s.id = COALESCE(st.school_id, sc.school_id)
      WHERE lc.certificate_code = ${cleanId}
      LIMIT 1
    `));

    if (lmsCertificate) {
      return {
        documentNumber: cleanId,
        type: "Certificat LMS",
        recipientName: lmsCertificate.nom_etudiant || "Apprenant non renseigné",
        classOrDetails: `${lmsCertificate.classe || "Classe non renseignée"} - ${lmsCertificate.course_title || "Cours non renseigné"}`,
        schoolName: lmsCertificate.school_name || "Établissement non renseigné",
        schoolId: String(lmsCertificate.school_id || "N/A"),
        dateGeneration: formatDate(lmsCertificate.issue_date),
        utilisateur: "Plateforme LMS",
        statut: "validé",
        hash: hashDocument({ source: "lms_certificates", reference: cleanId, student: lmsCertificate.nom_etudiant, course: lmsCertificate.course_title }),
      };
    }

    const digitalDiploma = firstRow(await readDb.execute(sql`
      SELECT
        dc.*,
        s.name AS school_name
      FROM digital_certificates dc
      LEFT JOIN schools s ON s.id = dc.school_id
      WHERE dc.verification_code = ${cleanId} OR dc.certificate_number = ${cleanId}
      LIMIT 1
    `).catch(() => null));

    if (digitalDiploma) {
      return {
        documentNumber: digitalDiploma.certificate_number,
        type: digitalDiploma.certificate_type || "Attestation de Réussite",
        recipientName: digitalDiploma.full_name || "Diplômé non renseigné",
        classOrDetails: `Promotion ${digitalDiploma.graduation_year} - ${digitalDiploma.level_completed || "Niveau validé"}${digitalDiploma.series_or_track ? ` (Série ${digitalDiploma.series_or_track})` : ""}${digitalDiploma.mention ? ` - Mention ${digitalDiploma.mention}` : ""}`,
        schoolName: digitalDiploma.school_name || digitalDiploma.school_name_override || "Établissement Edut",
        schoolId: String(digitalDiploma.school_id || "N/A"),
        dateGeneration: formatDate(digitalDiploma.issued_date || digitalDiploma.created_at),
        utilisateur: digitalDiploma.director_name || digitalDiploma.issued_by || "Direction de l'établissement",
        statut: digitalDiploma.is_valid ? "validé" : "annulé",
        hash: hashDocument({ source: "digital_certificates", reference: cleanId, name: digitalDiploma.full_name, year: digitalDiploma.graduation_year }),
      };
    }

    return null;
  } catch (error) {
    console.error("verifyOfficialDocument error:", error);
    return {
      documentNumber: cleanId,
      type: "Vérification indisponible",
      recipientName: "Non disponible",
      classOrDetails: "La base officielle n'a pas pu être consultée.",
      schoolName: "Base centrale",
      schoolId: "N/A",
      dateGeneration: formatDate(new Date()),
      utilisateur: "Système de vérification",
      statut: "erreur",
      hash: hashDocument({ source: "verification_error", reference: cleanId }),
    };
  }
}
