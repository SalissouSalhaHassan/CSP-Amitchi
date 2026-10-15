import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, or } from "drizzle-orm";
import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { schools } from "@/infrastructure/database/schema/auth";
import { hostelExitPermissions } from "@/infrastructure/database/schema/hostel";
import { notifications } from "@/infrastructure/database/schema/messaging";
import { getMobileUser, mobileJsonError } from "../../_lib/auth";
import { decodeStudentToken } from "@/shared/utils/student-token";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { user, response } = await getMobileUser(request);
  if (response || !user) return response || mobileJsonError("Non autorisé", 401);

  try {
    const body = await request.json();
    const { qrPayload, action, note } = body;

    if (!qrPayload) {
      return mobileJsonError("Code QR manquant", 400);
    }

    // 1. Decode token
    const decoded = decodeStudentToken(qrPayload);
    let studentId = decoded?.studentId;

    let student = null;
    if (studentId) {
      student = await readDb.query.students.findFirst({
        where: eq(students.id, studentId),
      });
    }

    // Fallback: If not found by ID, try searching by matricule (numAdmission)
    if (!student && qrPayload.trim()) {
      student = await readDb.query.students.findFirst({
        where: eq(students.numAdmission, qrPayload.trim()),
      });
      if (student) {
        studentId = student.id;
      }
    }

    if (!student) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: "Élève introuvable ou code QR invalide",
        alertLevel: "red",
      }, { status: 404 });
    }

    // 2. Multi-tenant school isolation check (unless superadmin)
    if (user.schoolId && student.schoolId && user.schoolId !== student.schoolId) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: "Attention : Cet élève appartient à un autre établissement !",
        alertLevel: "red",
        student: {
          nom: student.nomEtudiant,
          classe: student.classe,
          matricule: student.numAdmission,
        }
      }, { status: 403 });
    }

    // 3. Fetch School Details
    let schoolInfo = null;
    if (student.schoolId) {
      const sch = await readDb.query.schools.findFirst({
        where: eq(schools.id, student.schoolId),
      });
      if (sch) {
        schoolInfo = {
          name: sch.name,
          logo: sch.logoPath,
        };
      }
    }

    // 4. Check Hostel Exit Permissions (Sortie Internat)
    let activeExitPermission = null;
    try {
      const perms = await readDb.query.hostelExitPermissions.findMany({
        where: and(
          eq(hostelExitPermissions.studentId, student.id),
          eq(hostelExitPermissions.status, "Approuvé")
        ),
        orderBy: [desc(hostelExitPermissions.createdAt)],
        limit: 1,
      });
      if (perms.length > 0) {
        activeExitPermission = perms[0];
      }
    } catch {
      // Ignore if table schema not linked
    }

    // 5. Evaluate Gate Decision Status
    const isStatusActive = (student.statut || "Actif").toLowerCase() === "actif";
    let alertLevel: "green" | "yellow" | "red" = isStatusActive ? "green" : "red";
    let decisionReason = isStatusActive ? "Élève en règle • Accès autorisé" : `Statut élève : ${student.statut}`;

    if (student.categorie?.toLowerCase().includes("interne") && !activeExitPermission && action === "exit") {
      alertLevel = "yellow";
      decisionReason = "Élève interne sans bon de sortie validé !";
    }

    // 6. Handle Action logging (Entry / Exit)
    let actionLogged = null;
    let whatsappAlert = null;
    if (action === "entry" || action === "exit") {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      actionLogged = {
        action,
        timestamp: now.toISOString(),
        recordedBy: user.utilisateur || "Agent de sécurité",
        note: note || "",
      };

      const parentPhone = student.whatsapp || student.mobile || student.phoneFixe;
      const notifTitle = action === "entry" ? "Arrivée à l'école" : "Départ de l'école";
      const notifContent = `L'élève ${student.nomEtudiant} (Classe: ${student.classe || "N/A"}) a franchi le portail (${action === "entry" ? "Entrée" : "Sortie"}) à ${timeStr}.`;

      // 6a. Push notification to in-app notification center
      try {
        await db.insert(notifications).values({
          title: notifTitle,
          content: notifContent,
          type: "info",
          category: "Sécurité",
          isRead: false,
        });
      } catch {
        // notification non-blocking
      }

      // 6b. Generate Instant WhatsApp payload & link
      if (parentPhone) {
        let cleanPhone = parentPhone.replace(/\D/g, "");
        if (cleanPhone.length === 8) cleanPhone = `227${cleanPhone}`;
        const isEntry = action === "entry";
        const waText = `*SÉCURITÉ CAMPUS - CONTRÔLE D'ACCÈS* 🛡️\n\nBonjour Cher Parent (${student.nomPere || "Parent d'élève"}),\nNous vous informons que votre enfant *${student.nomEtudiant}* (${student.classe || ""}) a franchi le portail de l'établissement (*${isEntry ? "Entrée" : "Sortie"}*) à ${timeStr}.\n\n_Application Edut Mobile • Sécurité certifiée_`;
        whatsappAlert = {
          phone: cleanPhone,
          message: waText,
          link: `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waText)}`,
        };
      }
    }

    return NextResponse.json({
      success: true,
      valid: true,
      alertLevel,
      decisionReason,
      actionLogged,
      whatsappAlert,
      student: {
        id: student.id,
        nom: student.nomEtudiant,
        nomArabe: student.nomArabe,
        matricule: student.numAdmission,
        classe: student.classe,
        section: student.section,
        educationalLevel: student.educationalLevel,
        photoUrl: student.photoPath,
        groupeSanguin: student.groupeSanguin || "Non renseigné",
        statut: student.statut || "Actif",
        categorie: student.categorie || "Externe",
        parentNom: student.nomPere || "Tuteur légal",
        parentPhone: student.mobile || student.whatsapp || student.phoneFixe,
        whatsapp: student.whatsapp,
        emergencyPhone: student.mobile,
      },
      school: schoolInfo,
      hostelPermission: activeExitPermission ? {
        id: activeExitPermission.id,
        reason: activeExitPermission.reason,
        exitTime: activeExitPermission.exitTime,
        returnTime: activeExitPermission.returnTime,
        status: activeExitPermission.status,
      } : null,
    });

  } catch (error: any) {
    console.error("Gate scan error:", error);
    return mobileJsonError(error.message || "Erreur lors du scan du pass", 500);
  }
}
