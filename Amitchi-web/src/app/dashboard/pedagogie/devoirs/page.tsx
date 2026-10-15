export const dynamic = "force-dynamic";

import { getCurrentUser } from "@/domains/auth/services/session";
import { getClasses, getSubjects } from "@/domains/academics/actions/academics.actions";
import { getEmployees } from "@/domains/hr/actions/employees.actions";
import { getStudents } from "@/domains/students/actions/students.actions";
import { getAssignments } from "@/domains/lms/actions/lms.actions";
import { db } from "@/infrastructure/database";
import DevoirsClient from "./DevoirsClient";
import { getPedagogieRole } from "@/domains/pedagogie/permissions";
import { getUserRoleType, checkEducationalLevelAccess, hasAllEducationalLevels } from "@/domains/auth/services/rbac";
import StudentHomeworkPortal from "@/app/dashboard/academics/homework/components/StudentHomeworkPortal";
import { X } from "lucide-react";

export const metadata = {
  title: "Devoirs & Corrections | Pédagogie | Edut",
  description: "Gestion des devoirs, dépôts des réponses, correction et notation des élèves",
};

export default async function DevoirsPage() {
  const currentUser = await getCurrentUser();
  const roleType = currentUser ? await getUserRoleType(currentUser) : null;
  const isStudent = roleType === "eleve" || Boolean(currentUser?.studentId) || Boolean((currentUser as any)?.student_id);

  if (isStudent) {
    return (
      <div className="p-4 md:p-8 bg-[#0B0D14] min-h-[calc(100vh-65px)] rounded-3xl">
        <StudentHomeworkPortal currentUser={currentUser} />
      </div>
    );
  }

  const role = getPedagogieRole(currentUser);
  if (role === "guest" || role === "consultation") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-5 bg-[#F8FAFC] dark:bg-[#0A0C10]">
        <div className="bg-white dark:bg-[#131622] rounded-3xl p-8 border border-slate-200 dark:border-slate-800 max-w-md text-center space-y-4 shadow-sm text-slate-900 dark:text-white">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 dark:text-rose-400 mx-auto">
            <X size={24} />
          </div>
          <h2 className="text-lg font-black text-slate-800 dark:text-white">Accès non autorisé</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            Vous ne disposez pas des permissions nécessaires pour accéder aux Devoirs & Corrections.
          </p>
        </div>
      </div>
    );
  }

  const [classesRes, subjectsRes, employeesRes, studentsRes, assignmentsRes] = await Promise.all([
    getClasses(false),
    getSubjects(),
    getEmployees(),
    getStudents(),
    getAssignments(),
  ]);

  const classes = (classesRes as any).data?.data || (classesRes as any).data || classesRes || [];
  const subjects = (subjectsRes as any).data?.data || (subjectsRes as any).data || subjectsRes || [];
  const employees = (employeesRes as any).data?.data || (employeesRes as any).data || employeesRes || [];
  const students = (studentsRes as any).data?.data || (studentsRes as any).data || studentsRes || [];
  const assignments = (assignmentsRes as any).data || [];

  // Fetch all submissions with relations for easier tabular display
  let submissions = await db.query.lmsSubmissions.findMany({
    with: {
      student: true,
      assignment: {
        with: {
          class: {
            with: { section: true }
          },
          subject: true,
        }
      }
    },
    orderBy: (t, { desc }) => [desc(t.submittedAt)]
  });

  if (currentUser?.educationalLevel && !hasAllEducationalLevels(currentUser.educationalLevel)) {
    submissions = submissions.filter(sub => 
      checkEducationalLevelAccess(currentUser, (sub.assignment?.class as any)?.section?.educationalLevel || sub.student?.educationalLevel)
    );
  }

  return (
    <DevoirsClient
      currentUser={currentUser}
      initialAssignments={assignments}
      initialSubmissions={submissions}
      classes={classes}
      subjects={subjects}
      employees={employees}
      students={students}
    />
  );
}
