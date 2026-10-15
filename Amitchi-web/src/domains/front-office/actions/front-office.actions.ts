"use server";

import { db } from "@/infrastructure/database";
import { sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { protectedDbAction } from "@/lib/protected-action";
import { getActiveSchoolId } from "@/domains/auth/services/school";

const REVALIDATE = "/dashboard/front-office";

// ─── VISITORS ────────────────────────────────────────────────────────────────

export async function getVisitors(dateFilter?: string) {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const today = dateFilter ?? new Date().toISOString().split("T")[0];
    const rows = await db.execute(sql`
      SELECT * FROM visitors
      WHERE school_id = ${schoolId} AND date = ${today}::date
      ORDER BY created_at DESC
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

export async function getAllVisitors() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT * FROM visitors WHERE school_id = ${schoolId}
      ORDER BY created_at DESC LIMIT 500
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

export async function saveVisitor(data: {
  id?: number;
  visitorName: string;
  phone?: string;
  idCardNumber?: string;
  visitorType?: string;
  purpose: string;
  meetingWith?: string;
  studentName?: string;
  timeIn?: string;
  badgeNumber?: string;
  notes?: string;
}) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const now = new Date();
    const timeIn = data.timeIn ?? now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

    if (data.id) {
      await db.execute(sql`
        UPDATE visitors SET
          visitor_name = ${data.visitorName},
          phone = ${data.phone ?? null},
          id_card_number = ${data.idCardNumber ?? null},
          visitor_type = ${data.visitorType ?? "Parent / Tuteur"},
          purpose = ${data.purpose},
          meeting_with = ${data.meetingWith ?? null},
          student_name = ${data.studentName ?? null},
          badge_number = ${data.badgeNumber ?? null},
          notes = ${data.notes ?? null}
        WHERE id = ${data.id} AND school_id = ${schoolId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO visitors
          (school_id, visitor_name, phone, id_card_number, visitor_type, purpose, meeting_with, student_name, time_in, badge_number, notes, date, status)
        VALUES
          (${schoolId}, ${data.visitorName}, ${data.phone ?? null}, ${data.idCardNumber ?? null},
           ${data.visitorType ?? "Parent / Tuteur"}, ${data.purpose}, ${data.meetingWith ?? null},
           ${data.studentName ?? null}, ${timeIn}, ${data.badgeNumber ?? null}, ${data.notes ?? null},
           CURRENT_DATE, 'En cours')
      `);
    }
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function checkoutVisitor(id: number) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    const timeOut = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    await db.execute(sql`
      UPDATE visitors SET time_out = ${timeOut}, status = 'Sorti'
      WHERE id = ${id} AND school_id = ${schoolId}
    `);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function deleteVisitor(id: number) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`DELETE FROM visitors WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

// ─── GATE PASS ────────────────────────────────────────────────────────────────

export async function getGatePasses() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT * FROM gate_passes
      WHERE school_id = ${schoolId}
      ORDER BY created_at DESC LIMIT 200
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

export async function saveGatePass(data: {
  id?: number;
  studentId?: number;
  studentName: string;
  studentClass?: string;
  reason: string;
  authorizedBy?: string;
  parentContact?: string;
  expectedReturnTime?: string;
  escort?: string;
  notes?: string;
}) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();

    // Generate pass number
    const countRes = await db.execute(sql`SELECT COUNT(*) as c FROM gate_passes WHERE school_id = ${schoolId}`).catch(() => [{ c: 0 }]);
    const num = String(Number((countRes as any[])[0]?.c ?? 0) + 1).padStart(4, "0");
    const passNumber = `GP-${new Date().getFullYear()}-${num}`;

    if (data.id) {
      await db.execute(sql`
        UPDATE gate_passes SET
          student_name = ${data.studentName},
          student_class = ${data.studentClass ?? null},
          reason = ${data.reason},
          authorized_by = ${data.authorizedBy ?? "Direction"},
          parent_contact = ${data.parentContact ?? null},
          expected_return_time = ${data.expectedReturnTime ? new Date(data.expectedReturnTime) : null},
          escort = ${data.escort ?? null},
          notes = ${data.notes ?? null}
        WHERE id = ${data.id} AND school_id = ${schoolId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO gate_passes
          (school_id, student_id, student_name, student_class, reason, authorized_by, parent_contact,
           expected_return_time, escort, notes, status, pass_number)
        VALUES
          (${schoolId}, ${data.studentId ?? null}, ${data.studentName}, ${data.studentClass ?? null},
           ${data.reason}, ${data.authorizedBy ?? "Direction"}, ${data.parentContact ?? null},
           ${data.expectedReturnTime ? new Date(data.expectedReturnTime) : null},
           ${data.escort ?? null}, ${data.notes ?? null}, 'Sorti', ${passNumber})
      `);
    }
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function returnGatePass(id: number) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`
      UPDATE gate_passes SET status = 'Retourné', actual_return_time = NOW()
      WHERE id = ${id} AND school_id = ${schoolId}
    `);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function deleteGatePass(id: number) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`DELETE FROM gate_passes WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

// ─── ADMIN MAIL REGISTRY ──────────────────────────────────────────────────────

export async function getMailRegistry() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT * FROM admin_mail_registry
      WHERE school_id = ${schoolId}
      ORDER BY created_at DESC LIMIT 300
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

export async function saveMail(data: {
  id?: number;
  mailType: string;
  referenceNumber?: string;
  subject: string;
  senderOrRecipient: string;
  mailDate?: string;
  receivedOrSentDate?: string;
  assignedTo?: string;
  category?: string;
  priority?: string;
  status?: string;
  notes?: string;
}) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();

    if (data.id) {
      await db.execute(sql`
        UPDATE admin_mail_registry SET
          mail_type = ${data.mailType},
          reference_number = ${data.referenceNumber ?? null},
          subject = ${data.subject},
          sender_or_recipient = ${data.senderOrRecipient},
          mail_date = ${data.mailDate ? new Date(data.mailDate) : sql`CURRENT_DATE`},
          assigned_to = ${data.assignedTo ?? null},
          category = ${data.category ?? "Administratif"},
          priority = ${data.priority ?? "Normal"},
          status = ${data.status ?? "Reçu"},
          notes = ${data.notes ?? null}
        WHERE id = ${data.id} AND school_id = ${schoolId}
      `);
    } else {
      // Auto-reference number
      const countRes = await db.execute(sql`SELECT COUNT(*) as c FROM admin_mail_registry WHERE school_id = ${schoolId}`).catch(() => [{ c: 0 }]);
      const num = String(Number((countRes as any[])[0]?.c ?? 0) + 1).padStart(4, "0");
      const ref = data.referenceNumber || `${data.mailType === "Entrant" ? "CE" : "CS"}-${new Date().getFullYear()}-${num}`;

      await db.execute(sql`
        INSERT INTO admin_mail_registry
          (school_id, mail_type, reference_number, subject, sender_or_recipient, mail_date,
           assigned_to, category, priority, status, notes)
        VALUES
          (${schoolId}, ${data.mailType}, ${ref}, ${data.subject}, ${data.senderOrRecipient},
           ${data.mailDate ? new Date(data.mailDate) : sql`CURRENT_DATE`},
           ${data.assignedTo ?? null}, ${data.category ?? "Administratif"},
           ${data.priority ?? "Normal"}, ${data.status ?? (data.mailType === "Entrant" ? "Reçu" : "Envoyé")},
           ${data.notes ?? null})
      `);
    }
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function deleteMail(id: number) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`DELETE FROM admin_mail_registry WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

// ─── COMPLAINTS & SUGGESTIONS ────────────────────────────────────────────────

export async function getComplaints() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const rows = await db.execute(sql`
      SELECT * FROM complaints_suggestions
      WHERE school_id = ${schoolId}
      ORDER BY created_at DESC LIMIT 300
    `).catch(() => [] as any[]);
    return { data: rows };
  });
}

export async function saveComplaint(data: {
  id?: number;
  type?: string;
  submittedBy: string;
  contact?: string;
  subject: string;
  description: string;
  category?: string;
  priority?: string;
  assignedTo?: string;
}) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();

    if (data.id) {
      await db.execute(sql`
        UPDATE complaints_suggestions SET
          type = ${data.type ?? "Réclamation"},
          submitted_by = ${data.submittedBy},
          contact = ${data.contact ?? null},
          subject = ${data.subject},
          description = ${data.description},
          category = ${data.category ?? "Pédagogique"},
          priority = ${data.priority ?? "Normale"},
          assigned_to = ${data.assignedTo ?? null}
        WHERE id = ${data.id} AND school_id = ${schoolId}
      `);
    } else {
      await db.execute(sql`
        INSERT INTO complaints_suggestions
          (school_id, type, submitted_by, contact, subject, description, category, priority, assigned_to, status)
        VALUES
          (${schoolId}, ${data.type ?? "Réclamation"}, ${data.submittedBy}, ${data.contact ?? null},
           ${data.subject}, ${data.description}, ${data.category ?? "Pédagogique"},
           ${data.priority ?? "Normale"}, ${data.assignedTo ?? null}, 'Ouverte')
      `);
    }
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function resolveComplaint(id: number, resolutionNotes: string) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`
      UPDATE complaints_suggestions SET
        status = 'Résolue',
        resolution_notes = ${resolutionNotes},
        resolved_at = NOW()
      WHERE id = ${id} AND school_id = ${schoolId}
    `);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

export async function deleteComplaint(id: number) {
  return protectedDbAction("FrontOffice", "canEdit", async () => {
    const schoolId = await getActiveSchoolId();
    await db.execute(sql`DELETE FROM complaints_suggestions WHERE id = ${id} AND school_id = ${schoolId}`);
    revalidatePath(REVALIDATE);
    return { success: true };
  });
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────

export async function getFrontOfficeKPIs() {
  return protectedDbAction("FrontOffice", "canView", async () => {
    const schoolId = await getActiveSchoolId();
    const today = new Date().toISOString().split("T")[0];

    const [visitorsToday, activeGatePasses, pendingMail, openComplaints] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as c FROM visitors WHERE school_id = ${schoolId} AND date = ${today}::date`).catch(() => [{ c: 0 }]),
      db.execute(sql`SELECT COUNT(*) as c FROM gate_passes WHERE school_id = ${schoolId} AND status = 'Sorti'`).catch(() => [{ c: 0 }]),
      db.execute(sql`SELECT COUNT(*) as c FROM admin_mail_registry WHERE school_id = ${schoolId} AND status IN ('Reçu', 'En traitement')`).catch(() => [{ c: 0 }]),
      db.execute(sql`SELECT COUNT(*) as c FROM complaints_suggestions WHERE school_id = ${schoolId} AND status IN ('Ouverte', 'En traitement')`).catch(() => [{ c: 0 }]),
    ]);

    return {
      visitorsToday: Number((visitorsToday as any[])[0]?.c ?? 0),
      activeGatePasses: Number((activeGatePasses as any[])[0]?.c ?? 0),
      pendingMail: Number((pendingMail as any[])[0]?.c ?? 0),
      openComplaints: Number((openComplaints as any[])[0]?.c ?? 0),
    };
  });
}

// Keep legacy exports for compatibility
export async function getEnquiries() { return { data: [] }; }
export async function getPostalRecords() { return { data: [] }; }
