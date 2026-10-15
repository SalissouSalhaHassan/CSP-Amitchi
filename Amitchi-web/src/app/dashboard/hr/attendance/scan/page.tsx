export const dynamic = "force-dynamic";

import { db } from "@/infrastructure/database";
import { schoolClasses } from "@/infrastructure/database/schema/academics";
import { getCurrentUser } from "@/domains/auth/services/session";
import { getUserRoleType, getTeacherEmployee, getTeacherClassIds } from "@/domains/auth/services/rbac";
import { inArray, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import ScanClient from "./scan-client";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default async function ScanPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    // Redirect to login, but keep the current URL parameters for redirecting after login
    // In NextJS we can redirect.
    redirect("/login");
  }

  const roleType = await getUserRoleType(currentUser);
  
  if (roleType !== "teacher") {
    // If not a teacher, display an admin notice
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-2xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center">
            <ShieldAlert size={32} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Accès Réservé aux Enseignants</h3>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              Vous êtes connecté en tant qu'administrateur ou gestionnaire. Les scans de codes QR de salles de classe sont réservés aux comptes Enseignants pour enregistrer leur présence.
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-2">
            <Link
              href="/dashboard/hr"
              className="h-12 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all text-xs"
            >
              Aller à la Gestion HR
            </Link>
            <Link
              href="/dashboard"
              className="h-12 w-full rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs flex items-center justify-center transition-all"
            >
              Tableau de Bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const teacher = await getTeacherEmployee(currentUser);
  if (!teacher) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 lg:p-10 rounded-[3rem] border border-slate-100 shadow-2xl max-w-md w-full flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
            <ShieldAlert size={32} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Compte Enseignant Non Lié</h3>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              Votre compte utilisateur n'est pas lié à une fiche d'employé dans le module Ressources Humaines. Veuillez contacter votre administrateur pour lier votre email.
            </p>
          </div>

          <div className="w-full pt-2">
            <Link
              href="/dashboard"
              className="h-12 w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all text-xs"
            >
              Retour au Tableau de Bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Fetch classes taught by this teacher for manual selection fallback
  const classIds = await getTeacherClassIds(teacher.id);
  let teacherClasses: any[] = [];
  
  if (classIds.length > 0) {
    teacherClasses = await db.query.schoolClasses.findMany({
      where: inArray(schoolClasses.id, classIds),
      orderBy: (schoolClasses, { asc }) => [asc(schoolClasses.className)],
    });
  }

  return (
    <ScanClient
      teacher={teacher}
      teacherClasses={teacherClasses}
    />
  );
}
