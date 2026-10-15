"use client";

import React, { useState, useEffect, useMemo } from "react";
import StudentDialog from "@/domains/students/components/StudentDialog";
import RepairDataButton from "@/domains/students/components/RepairDataButton";
import ActionMenu from "@/components/common/ActionMenu";
import Link from "next/link";
import { 
  Users, UserPlus, GraduationCap, LayoutGrid, List, Search, Filter, 
  Edit, Bell, ChevronDown, ChevronLeft, ChevronRight, UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { deleteStudent } from "@/domains/students/actions/students.actions";

function Plus({ size = 24, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function UserIcon({ size = 24, className }: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function StatCard({ icon, bg, title, value, sub }: any) {
  return (
    <div className="bg-white dark:bg-[#131622]/90 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", bg)}>
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">{value}</h4>
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function StudentAvatar({ photoPath, numAdmission, nomEtudiant }: { photoPath?: string; numAdmission?: string; nomEtudiant: string }) {
  const [src, setSrc] = React.useState<string | undefined>(photoPath);

  React.useEffect(() => {
    if (photoPath?.startsWith("local:photo:") && numAdmission) {
      import("@/infrastructure/local-db/dexie").then(({ localDb }) => {
        localDb.studentPhotos.get(numAdmission).then(p => {
          if (p?.photoData) setSrc(p.photoData);
        });
      });
    } else {
      setSrc(photoPath);
    }
  }, [photoPath, numAdmission]);

  if (src) {
    return <img src={src} alt={nomEtudiant} className="w-full h-full object-cover" />;
  }

  return (
    <div className="w-full h-full flex items-center justify-center text-indigo-300">
      <UserIcon size={24} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  if (normalized === "ACTIF") {
    return <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest rounded-full">ACTIF</span>;
  }
  if (normalized === "EN ATTENTE") {
    return <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest rounded-full">EN ATTENTE</span>;
  }
  return <span className="px-3 py-1 bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-widest rounded-full">INACTIF</span>;
}

interface StudentsClientProps {
  initialStudents: any[];
  currentUser: any;
  activeSchoolId?: number | null;
  canEdit: boolean;
  canDelete: boolean;
  debugInfo?: any;
}

function normalizeEducationalLevel(level: string): string {
  return String(level || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pure helper — defined outside component to avoid hook-order issues in useEffect */
function getCompatibleEducationalLevels(level: string): string[] {
  if (!level) return [];
  if (level.includes(",")) {
    const parts = level.split(",").map((p) => p.trim()).filter(Boolean);
    const results = parts.flatMap((p) => getCompatibleEducationalLevels(p));
    return Array.from(new Set(results));
  }
  const norm = normalizeEducationalLevel(level);
  if (["primaire", "maternelle", "elementaire", "ابتدائي", "الابتدائي", "الابتدائيه"].includes(norm)) {
    return ["Primaire", "Maternelle", "primaire", "maternelle", "Elémentaire", "elementaire", "ابتدائي", "الابتدائي"];
  }
  if (["college", "moyen", "middle", "cem", "college general", "premier cycle", "إعدادي", "الإعدادية", "اعدادي", "متوسط", "المتوسط", "متوسطه", "المتوسطه"].includes(norm)) {
    return ["Collège", "College", "collège", "college", "Moyen", "moyen", "Collège Général", "college general", "Premier Cycle", "premier cycle", "إعدادي", "الإعدادية", "اعدادي", "متوسط", "المتوسط"];
  }
  if (["lycee", "secondaire", "high school", "second cycle", "ثانوي", "ثانويه", "الثانوي", "الثانويه"].includes(norm)) {
    return ["Lycée", "Lycee", "lycée", "lycee", "Secondaire", "secondaire", "Second Cycle", "second cycle", "ثانوي", "الثانوية"];
  }
  if (["university", "universite", "licence", "master", "doctorat", "superieur", "جامعه", "الجامعه", "جامعي", "عالي"].includes(norm)) {
    return ["Université", "Universite", "Licence", "Master", "université", "universite", "licence", "master", "Supérieur", "superieur", "جامعة", "جامعي", "عالي"];
  }
  return [level, level.toLowerCase(), level.toUpperCase(), level.charAt(0).toUpperCase() + level.slice(1).toLowerCase()];
}

export default function StudentsClient({ initialStudents, currentUser, activeSchoolId, canEdit, canDelete, debugInfo }: StudentsClientProps) {
  const [allStudents, setAllStudents] = useState<any[]>(initialStudents);
  const [isLocal, setIsLocal] = useState(false);
  const [unsyncedAdmissions, setUnsyncedAdmissions] = useState<Set<string>>(new Set());
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const itemsPerPage = 8;
  const schoolId = activeSchoolId ?? currentUser?.schoolId ?? null;

  // Debounce search input changes by 250ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    async function loadData() {
      // 1. If currently online and we have fresh server initialStudents, cache them and show
      if (typeof navigator !== "undefined" && navigator.onLine && schoolId && initialStudents && initialStudents.length > 0) {
        try {
          const { cacheStudents } = await import("@/infrastructure/local-db/cache");
          await cacheStudents(initialStudents, schoolId);
        } catch (e) {
          console.warn("Failed to update student local cache:", e);
        }
        setAllStudents(initialStudents);
        setIsLocal(false);
        return;
      }

      // 2. Offline OR server returned empty: Read from local IndexedDB
      try {
        const { getCachedStudents } = await import("@/infrastructure/local-db/cache");
        const cached = await getCachedStudents(schoolId);

        const { localDb } = await import("@/infrastructure/local-db/dexie");
        const outboxItems = await localDb.outbox
          .where("targetTable")
          .equals("students")
          .toArray();
        const unsynced = outboxItems.filter(item =>
          item.status !== "synced" &&
          item.status !== "cancelled" &&
          (!schoolId || Number(item.schoolId || item.payload?.schoolId) === Number(schoolId) || !item.schoolId)
        );
        setUnsyncedAdmissions(new Set(unsynced.map(item => item.payload?.numAdmission).filter(Boolean)));

        if (cached && cached.length > 0) {
          // Apply level filter on cached data
          const userLvl = currentUser?.educationalLevel;
          let filteredCached = cached;
          if (userLvl) {
            const lvlNorm = normalizeEducationalLevel(userLvl);
            const globalLevels = ["tous", "all", "tous les niveaux", "الكل", "كل", "جميع", "جميع المستويات", ""];
            if (!globalLevels.includes(lvlNorm)) {
              const compatibles = getCompatibleEducationalLevels(userLvl).map(normalizeEducationalLevel);
              filteredCached = cached.filter((s: any) => {
                if (!s.educationalLevel) return true;
                return compatibles.includes(normalizeEducationalLevel(s.educationalLevel));
              });
            }
          }
          setAllStudents(filteredCached);
          setIsLocal(!navigator.onLine || unsynced.length > 0);
        } else {
          setAllStudents(initialStudents || []);
          setIsLocal(false);
        }
      } catch (e) {
        console.warn("Failed to read cached students:", e);
        setAllStudents(initialStudents || []);
        setIsLocal(false);
      }
    }

    loadData();

    // Listen for local table mutations (add/edit in offline or online mode)
    const handleTableUpdate = (e: any) => {
      if (e?.detail?.targetTable === "students") {
        loadData();
      }
    };
    const handleOnlineStatus = () => loadData();

    window.addEventListener("edut:table-updated", handleTableUpdate);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);

    return () => {
      window.removeEventListener("edut:table-updated", handleTableUpdate);
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, [initialStudents, schoolId, currentUser?.educationalLevel]);


  // Performance Optimization: Student growth and new students count
  const currentMonth = new Date().getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const currentYear = new Date().getFullYear();
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const userLevel = currentUser?.educationalLevel;
  const isRestricted = useMemo(() => {
    // Super admins and global admins should never be restricted by educational level
    if (currentUser?.admin || currentUser?.superAdmin === true || currentUser?.superAdmin === 1 || currentUser?.role?.roleName === "Super Admin" || currentUser?.role?.roleName === "Admin") {
      return false;
    }
    if (!userLevel) return false;
    const clean = normalizeEducationalLevel(userLevel);
    return clean && !["tous", "all", "tous les niveaux", "toutes les etapes", "tous les cycles", "الكل", "كل", "جميع", "جميع المستويات", ""].includes(clean);
  }, [userLevel, currentUser]);

  const visibleStudents = useMemo(() => {
    if (!isRestricted || !userLevel) return allStudents;
    const compatible = getCompatibleEducationalLevels(userLevel).map(normalizeEducationalLevel);
    return allStudents.filter((s: any) => {
      if (!s.educationalLevel) return true; // keep general
      return compatible.includes(normalizeEducationalLevel(s.educationalLevel));
    });
  }, [allStudents, isRestricted, userLevel]);




  const nouveaux = useMemo(() => visibleStudents.filter((s: any) => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length, [visibleStudents, currentMonth, currentYear]);

  const lastMonthNouveaux = useMemo(() => visibleStudents.filter((s: any) => {
    if (!s.createdAt) return false;
    const d = new Date(s.createdAt);
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
  }).length, [visibleStudents, lastMonth, lastMonthYear]);

  const growth = lastMonthNouveaux > 0 
    ? Math.round(((nouveaux - lastMonthNouveaux) / lastMonthNouveaux) * 100)
    : nouveaux * 100;

  const [selectedClass, setSelectedClass] = useState<string>("Toutes");
  const [selectedLevel, setSelectedLevel] = useState<string>("Tous");

  const cleanString = (val?: string | null) => {
    if (!val) return "";
    return String(val)
      .replace(/\u00a0/g, " ")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const classesList = useMemo(() => {
    const set = new Set<string>();
    visibleStudents.forEach((s: any) => {
      const cl = cleanString(s.classe);
      if (cl) set.add(cl);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [visibleStudents]);

  const levelsList = useMemo(() => {
    const set = new Set<string>();
    visibleStudents.forEach((s: any) => {
      const lv = cleanString(s.educationalLevel);
      if (lv) set.add(lv);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "fr"));
  }, [visibleStudents]);

  const filteredStudents = useMemo(() => {
    const searchLower = cleanString(search).toLowerCase();
    const classNorm = cleanString(selectedClass).toLowerCase();
    const levelNorm = cleanString(selectedLevel).toLowerCase();

    return visibleStudents.filter((s: any) => {
      const nameLower = cleanString(s.nomEtudiant).toLowerCase();
      const numLower = cleanString(s.numAdmission).toLowerCase();
      const studentClassLower = cleanString(s.classe).toLowerCase();
      const studentLevelLower = cleanString(s.educationalLevel).toLowerCase();
      const studentGenderLower = cleanString(s.sexe).toLowerCase();

      // Search across name, admission number, class, educational level, gender
      const matchesSearch =
        !searchLower ||
        nameLower.includes(searchLower) ||
        numLower.includes(searchLower) ||
        studentClassLower.includes(searchLower) ||
        studentLevelLower.includes(searchLower) ||
        studentGenderLower.includes(searchLower);

      // Class filter
      const matchesClass =
        selectedClass === "Toutes" ||
        !classNorm ||
        studentClassLower === classNorm ||
        studentClassLower.includes(classNorm) ||
        classNorm.includes(studentClassLower);

      // Level filter
      const matchesLevel =
        selectedLevel === "Tous" ||
        !levelNorm ||
        studentLevelLower === levelNorm ||
        studentLevelLower.includes(levelNorm);

      return matchesSearch && matchesClass && matchesLevel;
    });
  }, [visibleStudents, search, selectedClass, selectedLevel]);

  const start = (page - 1) * itemsPerPage;
  const paginatedStudents = useMemo(() => filteredStudents.slice(start, start + itemsPerPage), [filteredStudents, start, itemsPerPage]);
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);

  const actifs = useMemo(() => visibleStudents.filter((s: any) => (s.statut || "").toUpperCase() === "ACTIF").length, [visibleStudents]);
  const classesCount = useMemo(() => new Set(visibleStudents.map((s: any) => cleanString(s.classe)).filter(Boolean)).size, [visibleStudents]);

  const stats = {
    total: visibleStudents.length,
    actifs,
    nouveaux,
    growth,
    classesCount
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0D14] text-slate-900 dark:text-slate-100 font-sans p-6 lg:p-10 space-y-8">
      {/* Header matching image */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Gestion des Étudiants</h1>
              {isLocal && (
                <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-black uppercase tracking-widest rounded-xl animate-pulse">
                  Données locales
                </span>
              )}
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-2">Consultez, gérez et suivez les informations des étudiants.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 border-r border-slate-200 dark:border-slate-800 pr-6">
            <button className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 border-2 border-[#F8FAFC] dark:border-[#0B0D14] rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              {currentUser?.avatarUrl || currentUser?.photoUrl || currentUser?.photo_url || currentUser?.photoPath || currentUser?.avatar || currentUser?.user_metadata?.avatar_url ? (
                <img
                  src={currentUser?.avatarUrl || currentUser?.photoUrl || currentUser?.photo_url || currentUser?.photoPath || currentUser?.avatar || currentUser?.user_metadata?.avatar_url}
                  alt={currentUser?.nomPrenom || currentUser?.utilisateur || "User"}
                  className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-800 object-cover shadow-sm"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm border border-indigo-500">
                  {(currentUser?.nomPrenom?.charAt(0) || currentUser?.name?.charAt(0) || currentUser?.utilisateur?.charAt(0) || "A").toUpperCase()}
                </div>
              )}
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                  {currentUser?.nomPrenom || currentUser?.name || currentUser?.utilisateur || "Admin École"}
                </p>
                <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {currentUser?.admin ? "Administrateur" : currentUser?.role?.roleName || currentUser?.role || "Administrateur"}
                </p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </div>
          {canEdit && (
            <StudentDialog 
              mode="add" 
              trigger={
                <button className="h-11 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all cursor-pointer">
                  <Plus size={18} /> Ajouter un étudiant
                </button>
              }
              onSuccess={(newStd) => {
                setAllStudents(prev => {
                  const exists = prev.some(s => s.numAdmission === newStd.numAdmission);
                  if (exists) {
                    return prev.map(s => s.numAdmission === newStd.numAdmission ? { ...s, ...newStd } : s);
                  }
                  return [newStd, ...prev];
                });
              }}
            />
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users size={20} className="text-indigo-600" />} 
          bg="bg-indigo-50" 
          title="Total Étudiants" 
          value={stats.total.toString()} 
          sub={`${stats.growth >= 0 ? '+' : ''}${stats.growth}% ce mois`} 
        />
        <StatCard 
          icon={<Users size={20} className="text-emerald-600" />} 
          bg="bg-emerald-50" 
          title="Étudiants Actifs" 
          value={stats.actifs.toString()} 
          sub={`${stats.total > 0 ? Math.round((stats.actifs / stats.total) * 100) : 0}% du total`} 
        />
        <StatCard 
          icon={<div className="w-4 h-4 rounded-full border-2 border-orange-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-orange-500 rounded-full" /></div>} 
        bg="bg-orange-50" 
          title="Nouveaux" 
          value={stats.nouveaux.toString()} 
          sub="Ce mois" 
        />
        <StatCard 
          icon={<LayoutGrid size={20} className="text-blue-600" />} 
          bg="bg-blue-50" 
          title="Classes" 
          value={stats.classesCount.toString()} 
          sub="Tous les niveaux" 
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-[450px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Rechercher un étudiant par nom, ID ou admission..." 
            className="w-full pl-12 pr-4 h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 outline-none text-sm font-medium placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Class Filter Dropdown */}
          <div className="relative min-w-[140px]">
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setPage(1); }}
              className="w-full h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 pr-8 appearance-none outline-none shadow-sm cursor-pointer hover:border-indigo-400 transition-colors"
            >
              <option value="Toutes">Toutes les classes</option>
              {classesList.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Level Filter Dropdown */}
          {levelsList.length > 1 && (
            <div className="relative min-w-[130px]">
              <select
                value={selectedLevel}
                onChange={(e) => { setSelectedLevel(e.target.value); setPage(1); }}
                className="w-full h-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs px-4 pr-8 appearance-none outline-none shadow-sm cursor-pointer hover:border-indigo-400 transition-colors"
              >
                <option value="Tous">Tous les niveaux</option>
                {levelsList.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          <RepairDataButton />
          
          <div className="flex bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-1 shadow-sm h-12">
            <button 
              onClick={() => setViewMode("grid")}
              className={cn("w-10 h-full rounded-xl flex items-center justify-center transition-all cursor-pointer", viewMode === "grid" ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode("list")}
              className={cn("w-10 h-full rounded-xl flex items-center justify-center transition-all cursor-pointer", viewMode === "list" ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200")}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Student Grid */}
      <div className={cn("grid gap-4", viewMode === "grid" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {paginatedStudents.length > 0 ? (
          paginatedStudents.map((student: any) => (
            <div key={student.id} className="bg-white dark:bg-[#131622]/90 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800">
                <StudentAvatar 
                  photoPath={student.photoPath} 
                  numAdmission={student.numAdmission} 
                  nomEtudiant={student.nomEtudiant} 
                />
              </div>
              
              <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-white truncate uppercase">{student.nomEtudiant}</h3>
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-400 mt-1 uppercase tracking-wider">ID: {student.numAdmission || student.matricule || "20 S 001"}</p>
                </div>
                
                <div className="flex flex-col gap-1 justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{student.educationalLevel || "Collège"}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{student.classe || "6ème"}</span>
                    <span className="text-[11px] font-semibold flex items-center gap-1">
                      {student.sexe?.toLowerCase() === 'féminin' ? (
                        <><span className="text-pink-500">♀</span> <span className="text-slate-500 dark:text-slate-400">Féminin</span></>
                      ) : (
                        <><span className="text-blue-500">♂</span> <span className="text-slate-500 dark:text-slate-400">Masculin</span></>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-4">
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge status={student.statut || "ACTIF"} />
                  {unsyncedAdmissions.has(student.numAdmission) && (
                    <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase tracking-widest rounded-full animate-pulse">
                      Non synchronisé
                    </span>
                  )}
                </div>
                <ActionMenu 
                  title={`Gérer ${student.nomEtudiant}`}
                  onDelete={deleteStudent.bind(null, student.id)}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  studentId={student.id}
                  onEdit={() => setEditingStudent(student)}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center bg-white dark:bg-[#131622]/90 rounded-[2rem] border border-slate-100 dark:border-slate-800 border-dashed">
            <GraduationCap size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-lg font-bold text-slate-500 dark:text-slate-400">Aucun étudiant trouvé</p>
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {filteredStudents.length > 0 && (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4 pb-10">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Affichage {start + 1} à {Math.min(start + itemsPerPage, filteredStudents.length)} sur {filteredStudents.length} étudiants
          </p>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer", page === 1 && "opacity-50 pointer-events-none")}
            >
              <ChevronLeft size={16} />
            </button>
            
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5 && page > 3) {
                pageNum = page - 2 + i;
                if (pageNum > totalPages) return null;
              }
              return (
                <button 
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-xs transition-colors cursor-pointer",
                    page === pageNum ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            
            {totalPages > 5 && page < totalPages - 2 && (
              <>
                <span className="w-8 h-8 flex items-center justify-center text-slate-400 font-bold text-xs">...</span>
                <button 
                  onClick={() => setPage(totalPages)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
                >
                  {totalPages}
                </button>
              </>
            )}

            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className={cn("w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer", page === totalPages && "opacity-50 pointer-events-none")}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-xl px-3 h-10 bg-white dark:bg-slate-900 shadow-sm">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{itemsPerPage} par page</span>
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      )}
      {editingStudent && (
        <StudentDialog
          mode="edit"
          initialData={editingStudent}
          open={!!editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={(updatedStd) => {
            setAllStudents(prev => 
              prev.map(s => (s.id === updatedStd.id || s.numAdmission === updatedStd.numAdmission) ? { ...s, ...updatedStd } : s)
            );
          }}
        />
      )}
    </div>
  );
}
