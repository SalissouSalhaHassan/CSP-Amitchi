"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import {
  updateSchoolStatus,
  updateSchoolPlan,
  impersonateSchool,
  updateSchoolCustomDomain,
  updateSchool,
  deleteSchool,
  generateAndAssignSchoolLicense,
} from "@/domains/platform/actions/platform.actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Eye,
  Power,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  ExternalLink,
  Loader2,
  Globe,
  Edit2,
  Trash2,
  Key,
  Copy,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PAGE_SIZE = 10;
const PRIMARY_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "edut.pro";

type HostMode = "localhost" | "primary-domain" | "single-deployment";
type SchoolRecord = {
  id: number;
  name: string;
  slug: string;
  customDomain?: string | null;
  logoPath?: string | null;
  plan?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
};

function planBadge(plan: string | null | undefined) {
  if (plan === "premium" || plan === "enterprise") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
        PREMIUM
      </span>
    );
  }
  if (plan === "basic") {
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">
        BASIC
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 border border-slate-100">
      GRATUIT
    </span>
  );
}

export function SchoolManagerNew({ schools: initialSchools }: { schools: SchoolRecord[] }) {
  const [schools, setSchools] = useState(initialSchools);

  // Sync state with props when server-side data reloads (e.g. after adding a new school)
  useEffect(() => {
    setSchools(initialSchools);
  }, [initialSchools]);

  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [selectedSchoolForDomain, setSelectedSchoolForDomain] = useState<SchoolRecord | null>(null);
  const [domainInput, setDomainInput] = useState("");
  const [isDomainOpen, setIsDomainOpen] = useState(false);
  const [isDomainSaving, setIsDomainSaving] = useState(false);

  // Edit School States
  const [selectedSchoolForEdit, setSelectedSchoolForEdit] = useState<SchoolRecord | null>(null);
  const [editNameInput, setEditNameInput] = useState("");
  const [editSlugInput, setEditSlugInput] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditSaving, setIsEditSaving] = useState(false);

  // Delete School States
  const [selectedSchoolForDelete, setSelectedSchoolForDelete] = useState<SchoolRecord | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleteSaving, setIsDeleteSaving] = useState(false);

  // License Generator States
  const [selectedSchoolForLicense, setSelectedSchoolForLicense] = useState<SchoolRecord | null>(null);
  const [isLicenseOpen, setIsLicenseOpen] = useState(false);
  const [licensePlan, setLicensePlan] = useState<"basic" | "pro" | "enterprise">("pro");
  const [licenseDuration, setLicenseDuration] = useState<number>(12);
  const [generatedLicenseKey, setGeneratedLicenseKey] = useState<string>("");

  const hostConfig = useMemo<{ baseDomain: string; mode: HostMode }>(() => {
    if (typeof window === "undefined") {
      return { baseDomain: PRIMARY_DOMAIN, mode: "primary-domain" };
    }

    const host = window.location.host;
    const hostname = window.location.hostname;

    if (host.includes("localhost")) {
      return { baseDomain: host, mode: "localhost" };
    }

    if (hostname === PRIMARY_DOMAIN || hostname.endsWith(`.${PRIMARY_DOMAIN}`)) {
      return { baseDomain: PRIMARY_DOMAIN, mode: "primary-domain" };
    }

    return { baseDomain: host, mode: "single-deployment" };
  }, []);

  const getSchoolUrl = (school: SchoolRecord) => {
    const protocol = typeof window !== "undefined" ? window.location.protocol : "http:";
    const customDomain = typeof school.customDomain === "string" ? school.customDomain.trim() : "";

    if (customDomain) {
      return customDomain.startsWith("http") ? customDomain : `${protocol}//${customDomain}`;
    }

    if (hostConfig.mode === "single-deployment") {
      return null;
    }

    return `${protocol}//${school.slug}.${hostConfig.baseDomain}`;
  };

  const getSchoolDomainLabel = (school: SchoolRecord) => {
    const customDomain = typeof school.customDomain === "string" ? school.customDomain.trim() : "";
    if (customDomain) return customDomain.replace(/^https?:\/\//, "");
    if (hostConfig.mode === "single-deployment") return school.slug;
    return `${school.slug}.${hostConfig.baseDomain}`;
  };

  const filteredSchools = useMemo(() => {
    return schools.filter((school) => {
      const matchesSearch =
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === "all" || school.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schools, searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  const pagedSchools = filteredSchools.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleImpersonate = (schoolId: number) => {
    startTransition(async () => {
      const res = await impersonateSchool(schoolId);
      if (res.success) {
        toast.success("Connexion réussie. Redirection...");
        window.location.href = "/dashboard";
      } else {
        toast.error("Échec de la connexion.");
      }
    });
  };

  const handleToggleStatus = (schoolId: number, currentStatus: string) => {
    const newStatus: "active" | "suspended" = currentStatus === "active" ? "suspended" : "active";
    startTransition(async () => {
      const res = await updateSchoolStatus(schoolId, newStatus);
      if (res.success) {
        setSchools((prev) =>
          prev.map((s) => (s.id === schoolId ? { ...s, status: newStatus } : s))
        );
        toast.success(`École ${newStatus === "active" ? "activée" : "suspendue"}.`);
      }
    });
  };

  const handleExportCSV = () => {
    const header = ["Nom", "Slug", "Forfait", "Statut", "Créé le"];
    const rows = filteredSchools.map((s) => [
      s.name,
      s.slug,
      s.plan || "basic",
      s.status || "active",
      s.createdAt ? new Date(s.createdAt).toLocaleDateString("fr-FR") : "",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((r) => r.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = "ecoles.csv";
    link.click();
  };

  return (
    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une école ou un domaine..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter CSV
          </button>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <div className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer select-none" />
              }
              nativeButton={false}
            >
              <Filter className="w-3.5 h-3.5 text-indigo-500" />
              Statut :{" "}
              {statusFilter === "all"
                ? "Tous"
                : statusFilter === "active"
                ? "Actifs"
                : "Suspendus"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl p-1.5 shadow-xl border-slate-100 dark:border-slate-800 dark:bg-slate-800">
              <DropdownMenuItem onClick={() => { setStatusFilter("all"); setPage(1); }} className="rounded-lg text-xs font-semibold p-2.5 cursor-pointer dark:hover:bg-slate-700">Tous</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatusFilter("active"); setPage(1); }} className="rounded-lg text-xs font-semibold p-2.5 cursor-pointer text-emerald-600 dark:hover:bg-slate-700">Actifs</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setStatusFilter("suspended"); setPage(1); }} className="rounded-lg text-xs font-semibold p-2.5 cursor-pointer text-rose-600 dark:hover:bg-slate-700">Suspendus</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">École</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Domaine</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Forfait</th>
              <th className="px-6 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Statut</th>
              <th className="px-6 py-3.5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {pagedSchools.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center">
                  <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">
                    Aucune école ne correspond à votre recherche.
                  </p>
                </td>
              </tr>
            ) : (
              pagedSchools.map((school) => {
                const schoolUrl = getSchoolUrl(school);
                const domainLabel = getSchoolDomainLabel(school);
                const initials = school.name
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((w: string) => w[0].toUpperCase())
                  .join("");

                // Pick a color based on initials hash
                const colors = [
                  "bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400",
                  "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400",
                  "bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400",
                  "bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400",
                  "bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400",
                ];
                const colorClass = colors[school.id % colors.length];

                return (
                  <tr key={school.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    {/* School name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 overflow-hidden ${!school.logoPath ? colorClass : ""}`}>
                          {school.logoPath ? (
                            <img src={school.logoPath} alt={school.name} className="w-full h-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{school.name}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                            Inscrit le {school.createdAt ? new Date(school.createdAt).toLocaleDateString("fr-FR") : "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Domain */}
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => {
                          if (schoolUrl) {
                            window.open(schoolUrl, "_blank", "noopener,noreferrer");
                          } else {
                            handleImpersonate(school.id);
                          }
                        }}
                        className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 transition-colors group/link"
                      >
                        <span className="text-sm font-semibold underline decoration-indigo-200 underline-offset-2">
                          {domainLabel}
                        </span>
                        {schoolUrl ? (
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        ) : (
                          <Eye className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </td>

                    {/* Plan */}
                    <td className="px-6 py-4">{planBadge(school.plan)}</td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full",
                            school.status === "active"
                              ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                              : "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.5)]"
                          )}
                        />
                        <span className="text-sm font-semibold text-slate-700">
                          {school.status === "active" ? "Actif" : "Suspendu"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <div className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all mx-auto cursor-pointer select-none" />
                          }
                          nativeButton={false}
                        >
                          {isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Settings className="w-4 h-4" />
                          )}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="w-64 rounded-2xl p-2 bg-white shadow-2xl border border-slate-100/80 animate-in fade-in zoom-in-95 duration-200"
                        >
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-widest">
                              Actions Principales
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleImpersonate(school.id)}
                              className="rounded-xl font-semibold gap-3 p-2.5 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer text-xs"
                            >
                              <div className="size-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                              Accès Administrateur
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchoolForEdit(school);
                                setEditNameInput(school.name);
                                setEditSlugInput(school.slug);
                                setIsEditOpen(true);
                              }}
                              className="rounded-xl font-semibold gap-3 p-2.5 focus:bg-amber-50 focus:text-amber-600 cursor-pointer text-xs"
                            >
                              <div className="size-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <Edit2 className="w-3.5 h-3.5" />
                              </div>
                              Modifier l'École
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchoolForDomain(school);
                                setDomainInput(school.customDomain || "");
                                setIsDomainOpen(true);
                              }}
                              className="rounded-xl font-semibold gap-3 p-2.5 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer text-xs"
                            >
                              <div className="size-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Globe className="w-3.5 h-3.5" />
                              </div>
                              Domaine Perso
                            </DropdownMenuItem>
                          </DropdownMenuGroup>

                          <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-widest">
                              Licence & Accès Direct
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchoolForLicense(school);
                                setLicensePlan((school.plan === "enterprise" ? "enterprise" : school.plan === "basic" ? "basic" : "pro") as any);
                                setGeneratedLicenseKey("");
                                setIsLicenseOpen(true);
                              }}
                              className="rounded-xl font-semibold gap-3 p-2.5 text-indigo-600 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer text-xs"
                            >
                              <div className="size-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Key className="w-3.5 h-3.5" />
                              </div>
                              Générer Clé de Licence & Quotas
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleImpersonate(school.id)}
                              className="rounded-xl font-semibold gap-3 p-2.5 text-blue-600 focus:bg-blue-50 focus:text-blue-600 cursor-pointer text-xs"
                            >
                              <div className="size-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Eye className="w-3.5 h-3.5" />
                              </div>
                              Accéder au Dashboard École
                            </DropdownMenuItem>
                          </DropdownMenuGroup>

                          <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-widest">
                              Sécurité & Statut
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(school.id, school.status || "active")}
                              className={cn(
                                "rounded-xl font-semibold gap-3 p-2.5 cursor-pointer text-xs",
                                school.status === "active"
                                  ? "text-rose-600 focus:bg-rose-50 focus:text-rose-600"
                                  : "text-emerald-600 focus:bg-emerald-50 focus:text-emerald-600"
                              )}
                            >
                              <div
                                className={cn(
                                  "size-6 rounded-lg flex items-center justify-center shrink-0",
                                  school.status === "active"
                                    ? "bg-rose-50 text-rose-600"
                                    : "bg-emerald-50 text-emerald-600"
                                )}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </div>
                              {school.status === "active" ? "Suspendre l'Établissement" : "Rétablir l'Établissement"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSchoolForDelete(school);
                                setIsDeleteOpen(true);
                              }}
                              className="rounded-xl font-semibold gap-3 p-2.5 text-rose-600 focus:bg-rose-50 focus:text-rose-600 cursor-pointer text-xs"
                            >
                              <div className="size-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </div>
                              Supprimer l'École
                            </DropdownMenuItem>
                          </DropdownMenuGroup>

                          <DropdownMenuSeparator className="my-1.5 bg-slate-100" />

                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-[9px] font-black uppercase text-slate-400 px-3 py-1.5 tracking-widest">
                              Changer de Forfait
                            </DropdownMenuLabel>
                            {["basic", "premium", "enterprise"].map((plan) => (
                              <DropdownMenuItem
                                key={plan}
                                disabled={school.plan === plan}
                                onClick={() => {
                                  startTransition(async () => {
                                    const res = await updateSchoolPlan(school.id, plan as "basic" | "premium" | "enterprise");
                                    if (res.success) {
                                      setSchools((prev) =>
                                        prev.map((s) => (s.id === school.id ? { ...s, plan } : s))
                                      );
                                      toast.success(`Forfait ${plan.toUpperCase()} appliqué.`);
                                    }
                                  });
                                }}
                                className="rounded-xl font-semibold gap-3 p-2 cursor-pointer text-[11px] focus:bg-slate-50 capitalize"
                              >
                                <div
                                  className={cn(
                                    "size-5 rounded-md flex items-center justify-center transition-colors shrink-0",
                                    school.plan === plan
                                      ? "bg-emerald-50 text-emerald-600"
                                      : "bg-slate-50 text-slate-400"
                                  )}
                                >
                                  {school.plan === plan ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <span className="w-3 h-3" />
                                  )}
                                </div>
                                {plan}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Lignes par page</span>
          <span className="inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200">
            {PAGE_SIZE}
            <ChevronLeft className="w-3 h-3 rotate-90 text-slate-400" />
          </span>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Affichage de {Math.min((page - 1) * PAGE_SIZE + 1, filteredSchools.length)} à{" "}
          {Math.min(page * PAGE_SIZE, filteredSchools.length)} sur {filteredSchools.length} école
          {filteredSchools.length !== 1 ? "s" : ""}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={cn(
                "w-7 h-7 rounded-lg border text-xs font-bold transition-colors",
                page === p
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              )}
            >
              {p}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Dialog for editing custom domain */}
      <Dialog open={isDomainOpen} onOpenChange={setIsDomainOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
              <Globe size={32} />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Domaine Personnalisé</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium italic">
              Configurez le nom de domaine personnalisé pour {selectedSchoolForDomain?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Nom de Domaine
              </Label>
              <Input
                id="domain"
                placeholder="Ex: portal.schoolname.edu"
                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold"
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 mt-1 leading-normal pl-1">
                Laissez vide pour supprimer le domaine personnalisé et utiliser le sous-domaine par défaut.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs text-slate-600 leading-relaxed">
              <p className="font-bold text-slate-800">⚠️ Configuration DNS requise :</p>
              <p>L'établissement doit configurer ces enregistrements chez son fournisseur de nom de domaine :</p>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>Enregistrement CNAME</strong> : pointe vers <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">cname.vercel-dns.com</code></li>
                <li><strong>Ou Enregistrement A</strong> : pointe vers l'adresse IP <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px] font-mono">76.76.21.21</code></li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14 rounded-2xl font-bold"
              onClick={() => setIsDomainOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isDomainSaving}
              className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white font-black uppercase tracking-widest transition-all"
              onClick={async () => {
                if (!selectedSchoolForDomain) return;
                setIsDomainSaving(true);
                try {
                  const res = await updateSchoolCustomDomain(
                    selectedSchoolForDomain.id,
                    domainInput.trim() === "" ? null : domainInput.trim()
                  );
                  if (res.success) {
                    setSchools((prev) =>
                      prev.map((s) =>
                        s.id === selectedSchoolForDomain.id
                          ? { ...s, customDomain: domainInput.trim() === "" ? null : domainInput.trim() }
                          : s
                      )
                    );
                    toast.success("Domaine personnalisé mis à jour avec succès !");
                    setIsDomainOpen(false);
                  } else {
                    toast.error(res.error || "Une erreur est survenue lors de la mise à jour.");
                  }
                } catch (error: any) {
                  toast.error(error.message || "Erreur de connexion.");
                } finally {
                  setIsDomainSaving(false);
                }
              }}
            >
              {isDomainSaving ? <Loader2 className="animate-spin size-5" /> : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for editing school details */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 shadow-sm">
              <Edit2 size={32} />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Modifier l'École</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium italic">
              Modifiez le nom et le slug (sous-domaine) de {selectedSchoolForEdit?.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="editName" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Nom de l'École
              </Label>
              <Input
                id="editName"
                placeholder="Ex: Groupe Scolaire..."
                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
                value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editSlug" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                Sous-domaine / Slug
              </Label>
              <Input
                id="editSlug"
                placeholder="Ex: cslome"
                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all font-bold"
                value={editSlugInput}
                onChange={(e) => setEditSlugInput(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14 rounded-2xl font-bold"
              onClick={() => setIsEditOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isEditSaving}
              className="flex-1 h-14 rounded-2xl bg-slate-900 hover:bg-amber-600 text-white font-black uppercase tracking-widest transition-all"
              onClick={async () => {
                if (!selectedSchoolForEdit) return;
                if (!editNameInput.trim() || !editSlugInput.trim()) {
                  toast.error("Veuillez remplir tous les champs.");
                  return;
                }
                setIsEditSaving(true);
                try {
                  const res = await updateSchool(selectedSchoolForEdit.id, {
                    name: editNameInput.trim(),
                    slug: editSlugInput.trim().toLowerCase(),
                  });
                  if (res.success) {
                    setSchools((prev) =>
                      prev.map((s) =>
                        s.id === selectedSchoolForEdit.id
                          ? { ...s, name: editNameInput.trim(), slug: editSlugInput.trim().toLowerCase() }
                          : s
                      )
                    );
                    toast.success("École mise à jour avec succès !");
                    setIsEditOpen(false);
                  } else {
                    toast.error(res.error || "Une erreur est survenue lors de la mise à jour.");
                  }
                } catch (error: any) {
                  toast.error(error.message || "Erreur de connexion.");
                } finally {
                  setIsEditSaving(false);
                }
              }}
            >
              {isEditSaving ? <Loader2 className="animate-spin size-5" /> : "Enregistrer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for deleting school */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
              <Trash2 size={32} />
            </div>
            <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight text-rose-600">Supprimer l'École</DialogTitle>
            <DialogDescription className="text-slate-500 font-medium italic">
              Êtes-vous sûr de vouloir supprimer {selectedSchoolForDelete?.name} ? Cette action supprimera tous les utilisateurs et données associés de manière définitive.
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-14 rounded-2xl font-bold"
              onClick={() => setIsDeleteOpen(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              disabled={isDeleteSaving}
              className="flex-1 h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase tracking-widest transition-all"
              onClick={async () => {
                if (!selectedSchoolForDelete) return;
                setIsDeleteSaving(true);
                try {
                  const res = await deleteSchool(selectedSchoolForDelete.id);
                  if (res.success) {
                    setSchools((prev) => prev.filter((s) => s.id !== selectedSchoolForDelete.id));
                    toast.success("École supprimée avec succès !");
                    setIsDeleteOpen(false);
                  } else {
                    toast.error(res.error || "Une erreur est survenue lors de la suppression.");
                  }
                } catch (error: any) {
                  toast.error(error.message || "Erreur de connexion.");
                } finally {
                  setIsDeleteSaving(false);
                }
              }}
            >
              {isDeleteSaving ? <Loader2 className="animate-spin size-5" /> : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog for Generating & Assigning License Key */}
      <Dialog open={isLicenseOpen} onOpenChange={setIsLicenseOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 shadow-sm">
              <Key className="w-8 h-8" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Générer une Clé de Licence
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-400">
              Établissement: <strong className="text-slate-700">{selectedSchoolForLicense?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Forfait & Capacités</Label>
              <select
                value={licensePlan}
                onChange={(e) => setLicensePlan(e.target.value as any)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value="basic">Forfait Basique (150 Élèves - 10 GB)</option>
                <option value="pro">Forfait Professionnel (500 Élèves - 50 GB - LMD/AI)</option>
                <option value="enterprise">Forfait Entreprise & Univ (10 000 Élèves - 500 GB)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-bold text-slate-700 mb-1.5 block">Durée de Validité</Label>
              <select
                value={licenseDuration}
                onChange={(e) => setLicenseDuration(Number(e.target.value))}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500"
              >
                <option value={1}>1 Mois</option>
                <option value={3}>3 Mois</option>
                <option value={6}>6 Mois</option>
                <option value={12}>12 Mois (1 Année Scolaire)</option>
                <option value={24}>24 Mois (2 Ans)</option>
              </select>
            </div>

            {generatedLicenseKey && (
              <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Clé Générée & Activée</p>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-xs font-mono font-bold text-indigo-900 select-all break-all">
                    {generatedLicenseKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLicenseKey);
                      toast.success("Clé copiée dans le presse-papier !");
                    }}
                    className="h-8 px-3 rounded-lg text-indigo-600 border-indigo-200 bg-white hover:bg-indigo-50 shrink-0"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    Copier
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsLicenseOpen(false)}
                className="flex-1 h-12 rounded-2xl font-bold text-slate-600 border-slate-200"
              >
                Fermer
              </Button>
              <Button
                onClick={() => {
                  if (!selectedSchoolForLicense) return;
                  startTransition(async () => {
                    const res = await generateAndAssignSchoolLicense(
                      selectedSchoolForLicense.id,
                      licensePlan,
                      licenseDuration
                    );
                    const licenseKey = res.data?.licenseKey || (res as any).licenseKey;
                    const message = res.data?.message || (res as any).message || "Licence générée et assignée avec succès.";

                    if (res.success && licenseKey) {
                      setGeneratedLicenseKey(licenseKey);
                      setSchools((prev) =>
                        prev.map((s) => (s.id === selectedSchoolForLicense.id ? { ...s, plan: licensePlan } : s))
                      );
                      toast.success(message);
                    } else {
                      toast.error(res.error || "Erreur lors de la génération de la licence.");
                    }
                  });
                }}
                disabled={isPending}
                className="flex-1 h-12 rounded-2xl font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/20"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                Générer & Activer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
