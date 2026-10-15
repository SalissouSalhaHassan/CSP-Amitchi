"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { School, CreditCard, BookOpen, LayoutGrid, Shield, Bell, Database, FileText } from "lucide-react";

interface SettingsTabsContainerProps {
  initialTab: string;
  generalContent: React.ReactNode;
  financeContent: React.ReactNode;
  academicContent: React.ReactNode;
  curriculumContent: React.ReactNode;
  securityContent: React.ReactNode;
  notificationsContent: React.ReactNode;
  systemContent: React.ReactNode;
  headersContent: React.ReactNode;
}

function SettingsTabsInner(props: SettingsTabsContainerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentTabFromUrl = searchParams.get("tab") || props.initialTab || "general";
  const [activeTab, setActiveTab] = useState(currentTabFromUrl);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [searchParams, activeTab]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    // Smooth URL update without triggering full server re-render or session interrupt
    try {
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("tab", newTab);
        window.history.replaceState(null, "", url.toString());
      }
    } catch {
      // Fallback
    }
  };

  const tabsConfig = [
    { v: 'general', l: 'Général', i: <School size={18} /> },
    { v: 'finance', l: 'Finances', i: <CreditCard size={18} /> },
    { v: 'academic', l: 'Académique', i: <BookOpen size={18} /> },
    { v: 'curriculum', l: 'Matières de Base', i: <LayoutGrid size={18} /> },
    { v: 'security', l: 'Sécurité', i: <Shield size={18} /> },
    { v: 'notifications', l: 'Alertes', i: <Bell size={18} /> },
    { v: 'system', l: 'Système', i: <Database size={18} /> },
    { v: 'headers', l: 'En-têtes', i: <FileText size={18} /> },
  ];

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10">
      <div className="lg:col-span-3">
        <TabsList className="flex flex-col h-fit bg-white dark:bg-[#12131C] p-4 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm gap-2">
          {tabsConfig.map((t) => (
            <TabsTrigger 
              key={t.v} 
              value={t.v} 
              className="w-full justify-start rounded-2xl h-14 px-6 font-black text-[10px] uppercase tracking-widest gap-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 data-[state=active]:bg-primary/5 dark:data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-all border border-transparent data-[state=active]:border-primary/10 dark:data-[state=active]:border-primary/20"
            >
              {t.i} {t.l}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="lg:col-span-9">
        <TabsContent value="general" className="m-0 space-y-8 animate-in slide-in-from-right-4 duration-500">
          {props.generalContent}
        </TabsContent>

        <TabsContent value="finance" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {props.financeContent}
        </TabsContent>

        <TabsContent value="academic" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {props.academicContent}
        </TabsContent>

        <TabsContent value="curriculum" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {props.curriculumContent}
        </TabsContent>

        <TabsContent value="security" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {props.securityContent}
        </TabsContent>

        <TabsContent value="notifications" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {props.notificationsContent}
        </TabsContent>

        <TabsContent value="system" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {props.systemContent}
        </TabsContent>

        <TabsContent value="headers" className="m-0 animate-in slide-in-from-right-4 duration-500">
          {props.headersContent}
        </TabsContent>
      </div>
    </Tabs>
  );
}

export function SettingsTabsContainer(props: SettingsTabsContainerProps) {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">Chargement des paramètres...</div>}>
      <SettingsTabsInner {...props} />
    </Suspense>
  );
}
