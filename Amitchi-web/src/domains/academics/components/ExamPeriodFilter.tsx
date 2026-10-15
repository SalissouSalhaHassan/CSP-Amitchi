"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";

export default function ExamPeriodFilter({ periods, currentPeriod }: { periods: any[], currentPeriod?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    
    if (val) {
      params.set("period", val);
    } else {
      params.delete("period");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm">
      <Filter size={18} className="text-slate-400" />
      <select 
        value={currentPeriod || ""}
        onChange={handlePeriodChange}
        className="bg-transparent text-sm font-bold text-slate-700 outline-none w-40 cursor-pointer"
      >
        <option value="">Toutes les périodes</option>
        {periods.map(p => (
          <option key={p.id} value={p.name}>{p.name}</option>
        ))}
      </select>
    </div>
  );
}
