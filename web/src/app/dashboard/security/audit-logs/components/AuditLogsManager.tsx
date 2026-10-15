"use client";

import { useState, useMemo } from "react";
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
  Clock, 
  Globe, 
  Info, 
  Search, 
  Filter, 
  Database,
  User as UserIcon,
  ChevronRight,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function AuditLogsManager({ logs }: { logs: any[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<any>(null);

  const handleExportCSV = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
      csvContent += "Journal d'Audit - Edut Pro\n";
      csvContent += `Date d'exportation: ${new Date().toLocaleDateString("fr-FR")}\n\n`;
      csvContent += "Date,Utilisateur,Email,Action,Table,IP\n";

      filteredLogs.forEach(log => {
        const dateStr = format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss");
        const userStr = log.user?.nomPrenom || "System";
        const emailStr = log.user?.utilisateur || "system";
        const actionStr = log.action || "";
        const tableStr = log.tableName || "";
        const ipStr = log.ipAddress || "";
        
        const line = `"${dateStr}","${userStr.replace(/"/g, '""')}","${emailStr.replace(/"/g, '""')}","${actionStr}","${tableStr}","${ipStr}"`;
        csvContent += line + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Journal_Audit_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = 
        log.user?.nomPrenom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.user?.utilisateur?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.tableName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = actionFilter === "all" || log.action === actionFilter;
      return matchesSearch && matchesAction;
    });
  }, [logs, searchQuery, actionFilter]);

  const renderDataDiff = (oldData: string, newData: string) => {
    try {
      const oldObj = oldData ? JSON.parse(oldData) : {};
      const newObj = newData ? JSON.parse(newData) : {};
      const allKeys = Array.from(new Set([...Object.keys(oldObj), ...Object.keys(newObj)]));

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 font-black text-[10px] uppercase tracking-widest text-slate-400 px-4">
            <div>Ancienne Valeur</div>
            <div>Nouvelle Valeur</div>
          </div>
          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
            {allKeys.map(key => {
              const isDifferent = JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key]);
              if (!isDifferent && actionFilter !== 'all') return null;

              return (
                <div key={key} className={cn(
                  "grid grid-cols-2 gap-4 p-4 rounded-2xl border transition-colors",
                  isDifferent ? "bg-amber-50/50 border-amber-100" : "bg-slate-50 border-slate-100"
                )}>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{key}</p>
                    <p className="text-xs font-bold text-slate-600 break-all">{JSON.stringify(oldObj[key]) || '-'}</p>
                  </div>
                  <div className="space-y-1 border-l border-slate-200 pl-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase">{key}</p>
                    <p className={cn("text-xs font-black break-all", isDifferent ? "text-amber-600" : "text-slate-900")}>
                      {JSON.stringify(newObj[key]) || '-'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    } catch (e) {
      return <pre className="p-4 bg-slate-50 rounded-2xl text-xs overflow-auto">{newData}</pre>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
          <Input 
            placeholder="Rechercher par utilisateur ou table..." 
            className="pl-11 h-12 rounded-2xl border-none bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20 font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger 
              render={
                <div className="flex-1 md:flex-none h-12 px-6 rounded-2xl bg-white shadow-sm flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all border-none cursor-pointer" />
              }
              nativeButton={false}
            >
              <Filter size={16} className="text-indigo-600" />
              Action: {actionFilter === 'all' ? 'Toutes' : actionFilter}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl p-2 shadow-2xl border-slate-100">
              <DropdownMenuItem onClick={() => setActionFilter("all")} className="rounded-xl font-bold p-3 cursor-pointer">Toutes les actions</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionFilter("INSERT")} className="rounded-xl font-bold p-3 cursor-pointer text-emerald-600">Insertions (Créations)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionFilter("UPDATE")} className="rounded-xl font-bold p-3 cursor-pointer text-amber-600">Modifications</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setActionFilter("DELETE")} className="rounded-xl font-bold p-3 cursor-pointer text-rose-600">Suppressions</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div 
            role="button"
            tabIndex={0}
            onClick={handleExportCSV}
            className="h-12 px-6 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 cursor-pointer"
          >
            <Download size={16} />
            Exporter
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow className="border-slate-100 hover:bg-transparent">
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">Utilisateur</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">Opération</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">Table / Entité</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8">IP & Horodatage</TableHead>
              <TableHead className="font-black text-[10px] uppercase tracking-widest text-slate-400 py-6 px-8 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-20 text-center">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                      <Database size={32} />
                    </div>
                    <p className="text-slate-400 font-bold">Aucun log ne correspond à vos critères.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log: any) => (
                <TableRow key={log.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors group">
                  <TableCell className="py-6 px-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-sm group-hover:scale-110 transition-transform">
                        {log.user?.nomPrenom?.charAt(0) || log.user?.utilisateur?.charAt(0) || <UserIcon size={20} />}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-base">{log.user?.nomPrenom || log.user?.utilisateur || 'Système'}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">@{log.user?.utilisateur || 'system'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 px-8">
                    <Badge className={cn(
                      "font-black text-[10px] uppercase px-4 py-1.5 rounded-xl border-none shadow-sm",
                      log.action === 'INSERT' ? "bg-emerald-50 text-emerald-600" :
                      log.action === 'UPDATE' ? "bg-amber-50 text-amber-600" :
                      log.action === 'DELETE' ? "bg-rose-50 text-rose-600" :
                      "bg-slate-50 text-slate-600"
                    )}>
                      {log.action === 'INSERT' ? 'CRÉATION' : log.action === 'UPDATE' ? 'MODIFICATION' : log.action === 'DELETE' ? 'SUPPRESSION' : log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 px-8 font-black text-slate-700">
                    <div className="flex items-center gap-2">
                      <Database className="size-4 text-indigo-400" />
                      <span className="bg-slate-100 px-3 py-1 rounded-lg text-xs">{log.tableName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 px-8">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
                        <Clock className="size-3.5 text-indigo-500" />
                        {format(new Date(log.timestamp), "d MMM yyyy, HH:mm", { locale: fr })}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                        <Globe className="size-3.5" />
                        {log.ipAddress}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 px-8 text-right">
                    <div 
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedLog(log)}
                      className="h-10 px-5 rounded-2xl bg-slate-50 hover:bg-indigo-600 text-slate-600 hover:text-white font-black text-[10px] uppercase tracking-widest transition-all inline-flex items-center gap-3 group/btn shadow-sm cursor-pointer"
                    >
                      <Info className="size-4" />
                      Détails
                      <ChevronRight className="size-4 group-hover/btn:translate-x-1 transition-transform" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl rounded-[3rem] p-10 border-none shadow-2xl">
          <DialogHeader className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className={cn(
                "p-4 rounded-3xl shadow-sm",
                selectedLog?.action === 'INSERT' ? "bg-emerald-50 text-emerald-600" :
                selectedLog?.action === 'UPDATE' ? "bg-amber-50 text-amber-600" :
                selectedLog?.action === 'DELETE' ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-600"
              )}>
                <Database size={32} />
              </div>
              <div>
                <DialogTitle className="text-3xl font-black text-slate-900 tracking-tight">Détails de l'Opération</DialogTitle>
                <p className="text-slate-500 font-medium italic">Analyse des changements effectués sur la table <span className="text-indigo-600 font-black">{selectedLog?.tableName}</span></p>
              </div>
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 rounded-[2rem] bg-slate-50 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilisateur</p>
                  <p className="font-black text-slate-900">{selectedLog.user?.nomPrenom || 'Système'}</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-slate-50 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Heure</p>
                  <p className="font-black text-slate-900">{format(new Date(selectedLog.timestamp), "d MMMM yyyy, HH:mm", { locale: fr })}</p>
                </div>
                <div className="p-6 rounded-[2rem] bg-slate-50 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adresse IP</p>
                  <p className="font-black text-slate-900">{selectedLog.ipAddress}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-3">
                  <Info className="text-indigo-600" />
                  Comparaison des données
                </h3>
                {renderDataDiff(selectedLog.oldData, selectedLog.newData)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
