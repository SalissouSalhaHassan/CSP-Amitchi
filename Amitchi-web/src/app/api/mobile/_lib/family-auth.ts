import { db, readDb } from "@/infrastructure/database";
import { students } from "@/infrastructure/database/schema/students";
import { users } from "@/infrastructure/database/schema/auth";
import { eq, and, or, ilike } from "drizzle-orm";

export async function getParentChildrenIds(user: any): Promise<number[]> {
  const currentStudentId = user?.studentId || (user as any)?.student_id || user?.student?.id;
  const cleanUser = String(user?.utilisateur || "").trim();
  const cleanEmail = String(user?.email || "").trim();

  let primaryChild: any = null;
  if (currentStudentId) {
    primaryChild = await readDb.query.students.findFirst({
      where: eq(students.id, Number(currentStudentId)),
    });
  }

  if (primaryChild) {
    const cond = [eq(students.id, primaryChild.id)];
    if (primaryChild.cnicPere) cond.push(eq(students.cnicPere, primaryChild.cnicPere));
    if (primaryChild.mobile) cond.push(eq(students.mobile, primaryChild.mobile));
    if (primaryChild.whatsapp) cond.push(eq(students.whatsapp, primaryChild.whatsapp));

    const siblings = await readDb.query.students.findMany({
      where: and(
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
        or(...cond)
      ),
      columns: { id: true },
    });
    return siblings.map((s) => s.id);
  }

  // Fallback for parent without primary child linked in users table
  const condParent = [];
  if (cleanUser) {
    condParent.push(eq(students.mobile, cleanUser));
    condParent.push(eq(students.whatsapp, cleanUser));
    condParent.push(eq(students.cnicPere, cleanUser));
    condParent.push(eq(students.phoneFixe, cleanUser));
  }
  if (cleanEmail && cleanEmail !== cleanUser) {
    condParent.push(eq(students.mobile, cleanEmail));
    condParent.push(eq(students.whatsapp, cleanEmail));
  }

  if (condParent.length > 0) {
    const children = await readDb.query.students.findMany({
      where: and(
        user.schoolId ? eq(students.schoolId, user.schoolId) : undefined,
        or(...condParent)
      ),
      columns: { id: true },
    });
    return children.map((s) => s.id);
  }

  return [];
}

export async function verifyParentChildRelationship(user: any, studentId: number): Promise<boolean> {
  const currentStudentId = user?.studentId || (user as any)?.student_id || user?.student?.id;
  if (currentStudentId && Number(currentStudentId) === Number(studentId)) {
    return true;
  }

  // Admin, director, teacher, or staff bypass
  const roleName = String(user?.role?.roleName || "").toLowerCase();
  if (
    user?.admin ||
    user?.superAdmin ||
    roleName.includes("admin") ||
    roleName.includes("direct") ||
    roleName.includes("prof") ||
    roleName.includes("enseignant") ||
    roleName.includes("secret") ||
    roleName.includes("fondateur") ||
    roleName.includes("coordinat")
  ) {
    return true;
  }

  // Fetch target student to perform exact verification
  const targetStudent = await readDb.query.students.findFirst({
    where: eq(students.id, studentId),
  });
  if (!targetStudent) {
    return false;
  }

  // Check if student matches user's login username, admission number, or phone
  const cleanUser = String(user?.utilisateur || "").trim();
  const cleanEmail = String(user?.email || "").trim();
  const login = cleanUser.includes("@") ? cleanUser.split("@")[0] : cleanUser;
  const emailLogin = cleanEmail.includes("@") ? cleanEmail.split("@")[0] : cleanEmail;

  const numAdm = String(targetStudent.numAdmission || "").toLowerCase().trim();
  const stMobile = String(targetStudent.mobile || "").trim();
  const stWhatsapp = String(targetStudent.whatsapp || "").trim();
  const stCnic = String(targetStudent.cnicPere || "").trim();
  const stStudentCnic = String(targetStudent.cnic || "").trim();

  const cleanUserLower = cleanUser.toLowerCase();
  const cleanEmailLower = cleanEmail.toLowerCase();
  const loginLower = login.toLowerCase();
  const emailLoginLower = emailLogin.toLowerCase();

  const isDirectStudent =
    (cleanUserLower && (numAdm === cleanUserLower || loginLower === numAdm)) ||
    (cleanEmailLower && (numAdm === cleanEmailLower || emailLoginLower === numAdm)) ||
    (stMobile && (stMobile === cleanUser || stMobile === cleanEmail)) ||
    (stWhatsapp && (stWhatsapp === cleanUser || stWhatsapp === cleanEmail)) ||
    (stCnic && (stCnic === cleanUser || stCnic === cleanEmail)) ||
    (stStudentCnic && (stStudentCnic === cleanUser || stStudentCnic === cleanEmail));

  if (isDirectStudent) {
    // Auto-heal studentId link in users table if missing
    if (!currentStudentId && user.id) {
      try {
        await db.update(users).set({ studentId: targetStudent.id }).where(eq(users.id, user.id));
      } catch (_) {}
    }
    return true;
  }

  const allowedIds = await getParentChildrenIds(user);
  return allowedIds.includes(studentId);
}
