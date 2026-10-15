export const dynamic = "force-dynamic";

import { getAttendanceRecords, getAttendanceStats } from "@/domains/attendance/actions/attendance.actions";
import { getClasses, getSubjectsForClass } from "@/domains/academics/actions/academics.actions";
import { getStudentsByClass } from "@/domains/students/actions/students.actions";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType, verifyClassEducationalLevelAccess } from "@/domains/auth/services/rbac";
import { getClassDisplayName } from "@/domains/academics/utils/class-name";
import AttendanceClient from "./attendance-client";
import StudentAttendancePortal from "./components/StudentAttendancePortal";

export default async function AttendancePage({ searchParams: searchParamsPromise }: { searchParams: Promise<{ classId?: string, subjectId?: string, date?: string }> }) {
  const currentUser = await getCurrentUser();
  const roleType = currentUser ? await getUserRoleType(currentUser) : null;
  const isStudent = roleType === "eleve" || Boolean(currentUser?.studentId) || Boolean((currentUser as any)?.student_id);

  if (isStudent) {
    return (
      <div className="p-4 md:p-8 bg-[#0B0D14] min-h-[calc(100vh-65px)] rounded-3xl">
        <StudentAttendancePortal currentUser={currentUser} />
      </div>
    );
  }

  const searchParams = await searchParamsPromise;
  const date = searchParams.date || new Date().toISOString().split('T')[0];
  let classId = searchParams.classId ? Number(searchParams.classId) : null;
  const subjectId = searchParams.subjectId ? Number(searchParams.subjectId) : null;

  // Verify class access if classId is provided
  if (classId) {
    const hasAccess = await verifyClassEducationalLevelAccess(currentUser, classId);
    if (!hasAccess) {
      classId = null;
    }
  }

  let classes: any[] = [];
  let stats: any = { presents: 0, absents: 0, lates: 0, excused: 0 };
  let canEdit = false;
  let students: any[] = [];
  let subjects: any[] = [];
  let initialRecords: any[] = [];

  try {
    const [classesRes, statsRes] = await Promise.all([
      getClasses(false).catch(() => ({ data: [] })),
      getAttendanceStats(date, classId, subjectId).catch(() => ({ data: { data: { presents: 0, absents: 0, lates: 0, excused: 0 } } })),
    ]);

    classes = ((classesRes as any).data?.data || (classesRes as any).data || []) as any[];
    stats = (statsRes.data?.data || statsRes.data) as any;
    canEdit = !!(currentUser?.admin || currentUser?.role?.permissions?.some((p: any) => p.moduleName === "Attendance" && p.canEdit));

    if (classId) {
      const [subjectsRes, recordsRes] = await Promise.all([
        getSubjectsForClass(classId).catch(() => ({ data: [] })),
        getAttendanceRecords(classId, date, subjectId || undefined).catch(() => ({ data: [] }))
      ]);

      subjects = ((subjectsRes as any).data?.data || (subjectsRes as any).data || []) as any[];
      initialRecords = ((recordsRes as any).data?.data || (recordsRes as any).data || []) as any[];

      const selectedClass = classes.find(c => c.id === classId);
      if (selectedClass) {
        const selectedClassName = getClassDisplayName(selectedClass, "");
        const studentsRes = await getStudentsByClass(selectedClassName).catch(() => ({ data: [] }));
        students = ((studentsRes as any).data?.data || (studentsRes as any).data || []) as any[];
      }
    }
  } catch (error) {
    console.warn("[AttendancePage] Parallel fetch failed, falling back to local client database:", error);
  }

  return (
    <AttendanceClient 
      classes={classes}
      stats={stats}
      subjects={subjects}
      initialRecords={initialRecords}
      students={students}
      classId={classId}
      subjectId={subjectId}
      date={date}
      canEdit={canEdit}
    />
  );
}
