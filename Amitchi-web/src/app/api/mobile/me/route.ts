import { NextRequest, NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { and, eq, or, ilike, sql } from "drizzle-orm";

import { db, readDb } from "@/infrastructure/database";
import { rolePermissions, users } from "@/infrastructure/database/schema/auth";
import { schoolBranches } from "@/infrastructure/database/schema/settings";
import { schoolSessions } from "@/infrastructure/database/schema/academics";
import { students } from "@/infrastructure/database/schema/students";
import { getUserRoleType, type UserRoleType } from "@/domains/auth/services/rbac";

export const dynamic = "force-dynamic";

type PermissionRow = {
  moduleName?: string | null;
  canView?: boolean | null;
  canEdit?: boolean | null;
  canDelete?: boolean | null;
  fieldPermissions?: any;
};

type StudentProfile = {
  id: number;
  schoolId: number | null;
  nomEtudiant: string;
  classe: string | null;
  numAdmission: string;
  educationalLevel: string | null;
};

const fullMobilePermissions = [
  "owner.platform.view",
  "owner.schools.manage",
  "students.view",
  "students.create",
  "students.edit",
  "students.delete",
  "students.promote",
  "finance.view",
  "finance.collect",
  "hr.view",
  "hr.manage",
  "hostel.view",
  "hostel.manage",
  "exams.view",
  "exams.manage",
  "attendance.view",
  "attendance.manage",
  "academics.view",
  "academics.manage",
  "messaging.view",
  "messaging.manage",
];

function jsonError(message: string, status: number) {
  return NextResponse.json({ success: false, error: message }, { status });
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "",
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
  };
}

function mobileRoleFromWebRole(roleType: UserRoleType) {
  if (roleType === "super_admin") return "super_admin";
  if (["ministere", "dren", "dden", "inspection"].includes(roleType)) return "owner";
  if (roleType === "teacher" || roleType === "enseignant") return "teacher";
  if (roleType === "eleve") return "student";
  if (roleType === "parent") return "parent";
  if (roleType === "comptable" || roleType === "caissier" || roleType === "level_comptable" || roleType === "level_caissier") return "accountant";
  if (roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    return "director";
  }
  if (roleType === "censeur" || roleType === "surveillant") return "admin";
  return "staff";
}

function defaultPermissionsForRole(roleType: UserRoleType) {
  if (["super_admin", "ministere", "dren", "dden"].includes(roleType)) {
    return new Set(fullMobilePermissions);
  }

  if (roleType === "inspection") {
    return new Set([
      "students.view",
      "hr.view",
      "exams.view",
      "attendance.view",
      "academics.view",
      "academics.manage",
      "messaging.view",
      "messaging.manage",
    ]);
  }

  if (roleType === "directeur" || roleType === "general_director" || roleType === "level_director") {
    const perms = new Set(fullMobilePermissions.filter((permission) => !permission.startsWith("owner.")));
    perms.add("academics.saisieNotes.view");
    perms.add("academics.saisieNotes.edit");
    perms.add("academics.gestionDevoirs.view");
    perms.add("academics.gestionDevoirs.edit");
    return perms;
  }

  if (roleType === "teacher" || roleType === "enseignant") {
    return new Set([
      "students.view",
      "exams.view",
      "exams.manage",
      "attendance.view",
      "attendance.manage",
      "academics.view",
      "academics.manage",
      "academics.saisieNotes.view",
      "academics.saisieNotes.edit",
      "academics.gestionDevoirs.view",
      "academics.gestionDevoirs.edit",
      "messaging.view",
      "messaging.manage",
    ]);
  }

  if (roleType === "censeur") {
    return new Set([
      "students.view",
      "students.edit",
      "hr.view",
      "exams.view",
      "exams.manage",
      "attendance.view",
      "attendance.manage",
      "academics.view",
      "academics.manage",
      "academics.saisieNotes.view",
      "academics.saisieNotes.edit",
      "academics.gestionDevoirs.view",
      "academics.gestionDevoirs.edit",
    ]);
  }

  if (roleType === "surveillant") {
    return new Set(["students.view", "attendance.view", "attendance.manage"]);
  }

  if (roleType === "comptable" || roleType === "caissier" || roleType === "level_comptable" || roleType === "level_caissier") {
    return new Set(["students.view", "finance.view", "finance.collect"]);
  }

  if (roleType === "eleve" || roleType === "parent") {
    return new Set(["attendance.view", "academics.view", "exams.view", "messaging.view"]);
  }

  return new Set<string>();
}

function matchesModule(moduleName: string, aliases: string[]) {
  return aliases.some((alias) => moduleName === alias || moduleName.includes(alias));
}

function mapRolePermission(row: PermissionRow) {
  const moduleName = String(row.moduleName || "").toLowerCase().trim();
  const permissions = new Set<string>();

  if (matchesModule(moduleName, [
    "students", "student", "eleves", "eleve", "élève", "élèves",
    "etudiant", "etudiants", "inscription", "inscriptions", "admission"
  ])) {
    if (row.canView) permissions.add("students.view");
    if (row.canEdit) {
      permissions.add("students.create");
      permissions.add("students.edit");
      permissions.add("students.promote");
    }
    if (row.canDelete) permissions.add("students.delete");
  }

  if (matchesModule(moduleName, [
    "finance", "finances", "comptabilite", "comptabilité", "caisse",
    "paiements", "frais", "scolarite", "scolarité", "recus", "reçus"
  ])) {
    if (row.canView) permissions.add("finance.view");
    if (row.canEdit || row.canDelete) permissions.add("finance.collect");
  }

  if (matchesModule(moduleName, [
    "hr", "rh", "human resources", "ressources humaines", "personnel",
    "employes", "employés", "enseignants", "professeurs", "salaires"
  ])) {
    if (row.canView) permissions.add("hr.view");
    if (row.canEdit || row.canDelete) permissions.add("hr.manage");
  }

  if (matchesModule(moduleName, [
    "hostel", "internat", "dortoir", "dortoirs", "chambres",
    "hebergement", "hébergement", "dormitory"
  ])) {
    if (row.canView) permissions.add("hostel.view");
    if (row.canEdit || row.canDelete) permissions.add("hostel.manage");
  }

  if (matchesModule(moduleName, [
    "owner", "platform", "schools", "security", "etablissements",
    "établissements", "configuration"
  ])) {
    if (row.canView) permissions.add("owner.platform.view");
    if (row.canEdit || row.canDelete) permissions.add("owner.schools.manage");
  }

  if (matchesModule(moduleName, [
    "exam", "exams", "examen", "examens", "evaluation", "evaluations",
    "évaluation", "évaluations", "resultat", "resultats", "résultat",
    "résultats", "bulletin", "bulletins", "composition", "compositions",
    "note", "notes"
  ])) {
    if (row.canView) permissions.add("exams.view");
    if (row.canEdit || row.canDelete) permissions.add("exams.manage");
  }

  if (matchesModule(moduleName, [
    "attendance", "appel", "presence", "presences", "présence",
    "présences", "assiduite", "assiduité", "absences", "retards", "pointage"
  ])) {
    if (row.canView) permissions.add("attendance.view");
    if (row.canEdit || row.canDelete) permissions.add("attendance.manage");
  }

  if (matchesModule(moduleName, [
    "academics", "academic", "pedagogie", "pédagogie", "cours", "classes",
    "matieres", "matières", "notes", "devoirs", "homework", "cahier_textes", "planification"
  ])) {
    if (row.canView) permissions.add("academics.view");
    if (row.canEdit || row.canDelete) permissions.add("academics.manage");

    let fieldPerms: Record<string, any> | null = null;
    if (row.fieldPermissions) {
      try {
        fieldPerms = typeof row.fieldPermissions === "string"
          ? JSON.parse(row.fieldPermissions)
          : row.fieldPermissions;
      } catch (_) {}
    }

    const snConfig = fieldPerms?.saisieNotes;
    const snView = snConfig?.view !== undefined ? Boolean(snConfig.view) : Boolean(row.canView);
    const snEdit = snConfig?.edit !== undefined ? Boolean(snConfig.edit) : Boolean(row.canEdit);

    if (snView) permissions.add("academics.saisieNotes.view");
    if (snEdit) permissions.add("academics.saisieNotes.edit");

    const gdConfig = fieldPerms?.gestionDevoirs;
    const gdView = gdConfig?.view !== undefined ? Boolean(gdConfig.view) : Boolean(row.canView);
    const gdEdit = gdConfig?.edit !== undefined ? Boolean(gdConfig.edit) : Boolean(row.canEdit);

    if (gdView) permissions.add("academics.gestionDevoirs.view");
    if (gdEdit) permissions.add("academics.gestionDevoirs.edit");
  }

  if (matchesModule(moduleName, [
    "messaging", "messages", "message", "messagerie", "notification",
    "notifications", "communication", "communications", "chat", "sms",
    "discussion", "discussions", "mail", "email"
  ])) {
    if (row.canView) permissions.add("messaging.view");
    if (row.canEdit || row.canDelete) permissions.add("messaging.manage");
  }

  return permissions;
}

function normalizeStudentProfile(row: unknown): StudentProfile | null {
  if (!row || typeof row !== "object") return null;
  const value = row as Record<string, unknown>;

  const id = Number(value.id);
  const nomEtudiant = String(value.nomEtudiant || "");
  const numAdmission = String(value.numAdmission || "");

  if (!Number.isInteger(id) || !nomEtudiant || !numAdmission) {
    return null;
  }

  return {
    id,
    schoolId: value.schoolId === null || value.schoolId === undefined
      ? null
      : Number(value.schoolId),
    nomEtudiant,
    classe: value.classe === null || value.classe === undefined
      ? null
      : String(value.classe),
    numAdmission,
    educationalLevel: value.educationalLevel === null || value.educationalLevel === undefined
      ? null
      : String(value.educationalLevel),
  };
}

async function resolveLinkedStudent(
  user: {
    id?: number;
    studentId: number | null;
    schoolId: number | null;
    utilisateur: string;
    nomPrenom: string | null;
  },
  roleType: UserRoleType
): Promise<StudentProfile | null> {
  if (roleType !== "eleve" && roleType !== "parent") return null;

  const baseColumns = {
    id: true,
    schoolId: true,
    nomEtudiant: true,
    classe: true,
    numAdmission: true,
    educationalLevel: true,
  };

  if (user.studentId) {
    const row = await readDb.query.students.findFirst({
      where: and(
        eq(students.id, user.studentId),
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined
      ),
      columns: baseColumns,
    });
    if (row) return normalizeStudentProfile(row);
  }

  const cleanUser = user.utilisateur.trim();
  const login = cleanUser.includes("@")
    ? cleanUser.split("@")[0]
    : cleanUser;

  if (roleType === "eleve" && login) {
    const row = await readDb.query.students.findFirst({
      where: and(
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
        or(
          eq(students.numAdmission, cleanUser),
          eq(students.numAdmission, cleanUser.toUpperCase()),
          eq(students.numAdmission, cleanUser.toLowerCase()),
          eq(students.numAdmission, login),
          eq(students.numAdmission, login.toUpperCase()),
          eq(students.numAdmission, login.toLowerCase()),
          ilike(students.numAdmission, cleanUser),
          ilike(students.numAdmission, login),
          eq(students.nomEtudiant, cleanUser),
          user.nomPrenom ? eq(students.nomEtudiant, user.nomPrenom) : undefined
        )
      ),
      columns: baseColumns,
    });

    const profile = normalizeStudentProfile(row);
    if (profile) {
      // Auto-heal user's studentId link
      if (!user.studentId && user.id) {
        try {
          await db.update(users).set({ studentId: profile.id }).where(eq(users.id, user.id));
        } catch (_) {}
      }
      return profile;
    }
  }

  if (roleType === "parent") {
    const values = [login, cleanUser, user.nomPrenom || ""]
      .map((value) => value.trim())
      .filter(Boolean);

    for (const value of values) {
      const match = await readDb.query.students.findFirst({
        where: and(
          user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
          or(
            eq(students.mobile, value),
            eq(students.whatsapp, value),
            eq(students.nomPere, value),
            ilike(students.nomPere, `%${value}%`)
          )
        ),
        columns: baseColumns,
      });
      const normalizedMatch = normalizeStudentProfile(match);
      if (normalizedMatch) {
        if (!user.studentId && user.id) {
          try {
            await db.update(users).set({ studentId: normalizedMatch.id }).where(eq(users.id, user.id));
          } catch (_) {}
        }
        return normalizedMatch;
      }
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) {
    return jsonError("Token mobile manquant.", 401);
  }

  const { url, anonKey } = getSupabaseEnv();
  if (!url || !anonKey) {
    return jsonError("Configuration Supabase indisponible.", 500);
  }

  const supabase = createSupabaseClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  let authUser: { id: string; email?: string } | null = null;
  const { data, error } = await supabase.auth.getUser(token);
  if (data?.user) {
    authUser = data.user;
  } else {
    // Offline / Cross-instance token fallback
    const payload = parseJwtPayload(token);
    const now = Math.floor(Date.now() / 1000);
    const maxOfflineGraceSeconds = 30 * 24 * 60 * 60;
    const isWithinGrace = payload?.exp ? (now - payload.exp) < maxOfflineGraceSeconds : false;
    const configuredRefMatch = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    const configuredRef = configuredRefMatch?.[1];

    const isEdutIssuer = Boolean(
      payload && (
        payload.iss === "edut_server" ||
        payload.iss?.includes("supabase") ||
        (configuredRef && (payload.iss?.includes(configuredRef) || payload.ref === configuredRef)) ||
        payload.iss?.includes("gkarotahjtyvmhjqejts") ||
        payload.iss?.includes("ntlncvstzmfqbqystpwi") ||
        payload.ref === "gkarotahjtyvmhjqejts" ||
        payload.ref === "ntlncvstzmfqbqystpwi" ||
        payload.aud === "authenticated"
      )
    );

    if (payload && (payload.sub || payload.email || payload.id) && (isEdutIssuer || isWithinGrace)) {
      authUser = {
        id: payload.sub || `edut_${payload.id}`,
        email: payload.email,
      };
    } else if (token.startsWith("edut_session_")) {
      authUser = {
        id: token,
      };
    } else {
      return jsonError("Session mobile invalide.", 401);
    }
  }

  const email = authUser.email?.toLowerCase().trim() || "";
  const username = email.includes("@") ? email.split("@")[0] : email;

  const dbUser = await readDb.query.users.findFirst({
    where: or(
      eq(users.supabaseId, authUser.id),
      email ? eq(users.utilisateur, email) : undefined,
      username ? eq(users.utilisateur, username) : undefined
    ),
    with: {
      role: {
        with: {
          permissions: true,
        },
      },
      school: true,
      employee: true,
    },
  });

  if (!dbUser) {
    return jsonError("Compte non relié à un profil Edut.", 403);
  }

  if (authUser.id && dbUser.supabaseId !== authUser.id) {
    await db.update(users)
      .set({ supabaseId: authUser.id })
      .where(eq(users.id, dbUser.id));
  }

  const roleType = await getUserRoleType(dbUser);
  const mobileRole = mobileRoleFromWebRole(roleType);
  const defaultPerms = defaultPermissionsForRole(roleType);
  const permissions = new Set<string>(defaultPerms);

  const configuredPermissions = dbUser.role?.permissions?.length
    ? dbUser.role.permissions
    : dbUser.roleId
      ? await readDb.query.rolePermissions.findMany({
          where: eq(rolePermissions.roleId, dbUser.roleId),
        })
      : [];

  if (configuredPermissions.length > 0) {
    for (const row of configuredPermissions) {
      for (const permission of mapRolePermission(row)) {
        permissions.add(permission);
      }
    }
  }

  const branch = dbUser.schoolId
    ? await readDb.query.schoolBranches.findFirst({
        where: eq(schoolBranches.schoolId, dbUser.schoolId),
        columns: {
          id: true,
          branchName: true,
          region: true,
          dren: true,
          department: true,
          dden: true,
          inspection: true,
          commune: true,
          schoolCode: true,
        },
        orderBy: [schoolBranches.createdAt],
      })
    : null;

  const linkedStudent = await resolveLinkedStudent(dbUser, roleType);

  // ── Unified Active Academic Session Resolution ─────────────────────────────
  let activeSession: any = null;
  const targetSchoolId = dbUser.schoolId || 1;
  const activeSessionRow = await readDb.query.schoolSessions.findFirst({
    where: eq(schoolSessions.schoolId, targetSchoolId),
    orderBy: [
      sql`CASE WHEN is_active = TRUE OR LOWER(TRIM(status)) = 'actif' THEN 0 ELSE 1 END`,
      sql`id DESC`
    ]
  });

  if (activeSessionRow) {
    activeSession = {
      id: activeSessionRow.id,
      sessionName: activeSessionRow.sessionName,
      isActive: Boolean(activeSessionRow.isActive || activeSessionRow.status?.toLowerCase() === "actif"),
      status: activeSessionRow.status || (activeSessionRow.isActive ? "Actif" : "Inactif"),
      schoolId: activeSessionRow.schoolId,
    };
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return NextResponse.json({
    success: true,
    profile: {
      userId: String(dbUser.id),
      activeSession,
      supabaseId: authUser.id || dbUser.supabaseId || "00000000-0000-0000-0000-000000000000",
      email: dbUser.utilisateur || email,
      name: dbUser.nomPrenom,
      role: mobileRole,
      roleType,
      roleName: dbUser.role?.roleName || null,
      schoolId: dbUser.schoolId ? String(dbUser.schoolId) : null,
      employeeId: dbUser.employeeId ? String(dbUser.employeeId) : dbUser.employee?.id ? String(dbUser.employee.id) : null,
      educationalLevel: dbUser.educationalLevel,
      permissions: Array.from(permissions).sort(),
      scope: {
        schoolId: dbUser.schoolId,
        schoolName: dbUser.school?.name || null,
        emplacement: dbUser.emplacement || null,
        region: branch?.region || branch?.dren || null,
        dren: branch?.dren || null,
        department: branch?.department || branch?.dden || null,
        dden: branch?.dden || null,
        inspection: branch?.inspection || null,
        commune: branch?.commune || null,
        branchName: branch?.branchName || null,
        schoolCode: branch?.schoolCode || null,
      },
      student: linkedStudent
        ? {
            id: String(linkedStudent.id),
            schoolId: linkedStudent.schoolId ? String(linkedStudent.schoolId) : null,
            name: linkedStudent.nomEtudiant,
            className: linkedStudent.classe,
            admissionNo: linkedStudent.numAdmission,
            educationalLevel: linkedStudent.educationalLevel,
          }
        : null,
    },
  });
}
