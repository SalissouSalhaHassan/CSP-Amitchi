"use client";

import { useState, useTransition, useMemo } from "react";
import { 
  updateSchoolStatus, 
  updateSchoolPlan, 
  impersonateSchool 
} from "@/domains/platform/actions/platform.actions";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Eye, 
  Power, 
  ChevronDown,
  Loader2,
  Check,
  Search,
  Filter,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

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

export function SchoolManager({ schools: initialSchools }: { schools: SchoolRecord[] }) {
  const [schools, setSchools] = useState(initialSchools);
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
    const protocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
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
    return schools.filter(school => {
      const matchesSearch = school.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           school.slug.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || school.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [schools, searchQuery, statusFilter]);

  const handleImpersonate = (schoolId: number) => {
    startTransition(async () => {
      const res = await impersonateSchool(schoolId);
      if (res.success) {
        toast.success("Connexion en tant qu'administrateur réussie. Redirection...");
        window.location.href = "/dashboard";
      } else {
        toast.error("Échec de la connexion d'emprunt d'identité.");
      }
    });
  };

  const handleToggleStatus = (schoolId: number, currentStatus: string) => {
    const newStatus: "active" | "suspended" = currentStatus === "active" ? "suspended" : "active";
    startTransition(async () => {
      const res = await updateSchoolStatus(schoolId, newStatus);
      if (res.success) {
        setSchools(prev => prev.map(s => s.id === schoolId ? { ...s, status: newStatus } : s));
        toast.success(`L'école a été ${newStatus === 'active' ? 'activée' : 'suspendue'} avec succès.`);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <Input 
            placeholder="Rechercher une école ou un domaine..." 
            className="pl-11 h-12 rounded-2xl border-none bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger 
              render={
                <div className="h-12 px-6 rounded-2xl bg-white shadow-sm flex items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all border-none cursor-pointer" />
              }
              nativeButton={false}
            >
              <Filter size={16} className="text-indigo-600" />
              Statut: {statusFilter === 'all' ? 'Tous' : statusFilter === 'active' ? 'Actifs' : 'Suspendus'}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl border-slate-100">
              <DropdownMenuItem onClick={() => setStatusFilter("all")} className="rounded-xl font-bold p-3 cursor-pointer">Tous les établissements</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("active")} className="rounded-xl font-bold p-3 cursor-pointer text-emerald-600">Établissements Actifs</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("suspended")} className="rounded-xl font-bold p-3 cursor-pointer text-rose-600">Établissements Suspendus</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="border-slate-50 hover:bg-transparent">
            <TableHead className="px-8 py-5 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">École</TableHead>
            <TableHead className="px-8 py-5 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">Domaine</TableHead>
            <TableHead className="px-8 py-5 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">Forfait</TableHead>
            <TableHead className="px-8 py-5 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest">Statut</TableHead>
            <TableHead className="px-8 py-5 text-left font-black text-[10px] uppercase text-slate-400 tracking-widest text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSchools.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-20 text-center">
                <p className="text-slate-400 font-bold">Aucune école ne correspond à votre recherche.</p>
              </TableCell>
            </TableRow>
          ) : (
            filteredSchools.map((school) => (
              <TableRow key={school.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors">
                <TableCell className="px-8 py-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 overflow-hidden shadow-sm">
                      {school.logoPath ? (
                        <img src={school.logoPath} alt={school.name} className="w-full h-full object-cover" />
                      ) : (
                        school.name.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-base">{school.name}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Inscrit le {school.createdAt ? new Date(school.createdAt).toLocaleDateString('fr-FR') : "—"}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="px-8 py-5 font-bold text-indigo-600 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      const schoolUrl = getSchoolUrl(school);
                      if (schoolUrl) {
                        window.open(schoolUrl, "_blank", "noopener,noreferrer");
                      } else {
                        handleImpersonate(school.id);
                      }
                    }}
                    className="hover:underline flex items-center gap-2 group/link"
                  >
                    <span className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100/50 group-hover/link:bg-indigo-600 group-hover/link:text-white transition-colors">
                      {getSchoolDomainLabel(school)}
                    </span>
                    <ExternalLink size={14} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
                  </button>
                </TableCell>
                <TableCell className="px-8 py-5">
                  <Badge variant="outline" className={cn(
                    "font-black text-[10px] uppercase tracking-tighter px-3 py-1 rounded-lg",
                    school.plan === 'enterprise' ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                    school.plan === 'premium' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500"
                  )}>
                    {school.plan}
                  </Badge>
                </TableCell>
                <TableCell className="px-8 py-5">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${school.status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{school.status === 'active' ? 'Actif' : 'Suspendu'}</span>
                  </div>
                </TableCell>
                <TableCell className="px-8 py-5 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger 
                      render={
                        <div className="w-10 h-10 rounded-2xl hover:bg-slate-100 flex items-center justify-center text-slate-400 ml-auto transition-all hover:text-indigo-600 cursor-pointer" />
                      }
                      nativeButton={false}
                    >
                      <Settings size={20} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 rounded-3xl p-3 shadow-2xl border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest">Options de Gestion</DropdownMenuLabel>
                        <DropdownMenuItem 
                          onClick={() => handleImpersonate(school.id)}
                          className="rounded-2xl font-bold gap-4 p-4 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer"
                        >
                          <div className="size-8 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <Eye size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span>Accès Administrateur</span>
                            <span className="text-[10px] text-slate-400 font-medium">Se connecter à cette école</span>
                          </div>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(school.id, school.status || "active")}
                          className={cn(
                            "rounded-2xl font-bold gap-4 p-4 cursor-pointer",
                            school.status === 'active' ? "text-rose-600 focus:bg-rose-50 focus:text-rose-600" : "text-emerald-600 focus:bg-emerald-50 focus:text-emerald-600"
                          )}
                        >
                          <div className={cn(
                            "size-8 rounded-xl flex items-center justify-center",
                            school.status === 'active' ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                          )}>
                            <Power size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span>{school.status === 'active' ? 'Suspendre l\'accès' : 'Rétablir l\'accès'}</span>
                            <span className="text-[10px] opacity-60 font-medium">Changer le statut de l'école</span>
                          </div>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator className="my-2 bg-slate-50" />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="text-[10px] font-black uppercase text-slate-400 px-3 py-2 tracking-widest">Changer de Forfait</DropdownMenuLabel>
                        {['basic', 'premium', 'enterprise'].map((plan) => (
                          <DropdownMenuItem 
                            key={plan}
                            disabled={school.plan === plan}
                            onClick={() => {
                              startTransition(async () => {
                                const res = await updateSchoolPlan(school.id, plan as "basic" | "premium" | "enterprise");
                                if (res.success) {
                                  setSchools(prev => prev.map(s => s.id === school.id ? { ...s, plan } : s));
                                  toast.success(`Passage au forfait ${plan.toUpperCase()} réussi`);
                                }
                              });
                            }}
                            className="rounded-2xl font-bold gap-4 p-4 cursor-pointer focus:bg-slate-50"
                          >
                            <div className={cn(
                              "size-8 rounded-xl flex items-center justify-center transition-colors",
                              school.plan === plan ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                            )}>
                              {school.plan === plan ? <Check size={18} /> : <div className="size-4" />}
                            </div>
                            <span className="uppercase tracking-widest text-xs">{plan}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
