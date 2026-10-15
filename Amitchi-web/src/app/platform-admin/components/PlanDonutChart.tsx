"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

type PlanItem = {
  name: string;
  value: number;
  color: string;
  percent: number;
};

interface PlanDonutChartProps {
  data?: PlanItem[];
  totalSchools?: number;
  premium?: number;
  basic?: number;
  gratuit?: number;
  total?: number;
}

export function PlanDonutChart({
  data: rawData,
  totalSchools,
  premium = 0,
  basic = 0,
  gratuit = 0,
  total,
}: PlanDonutChartProps) {
  const effectiveTotal = total ?? totalSchools ?? (premium + basic + gratuit || 1);

  const data: PlanItem[] = rawData || [
    {
      name: "Entreprise & Pro",
      value: premium,
      color: "#4f46e5",
      percent: Math.round((premium / effectiveTotal) * 100),
    },
    {
      name: "Basique",
      value: basic,
      color: "#06b6d4",
      percent: Math.round((basic / effectiveTotal) * 100),
    },
    {
      name: "Gratuit",
      value: gratuit,
      color: "#94a3b8",
      percent: Math.round((gratuit / effectiveTotal) * 100),
    },
  ];

  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Donut */}
      <div className="relative w-[180px] h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data.filter((d) => d.value > 0) : [{ name: "Vide", value: 1, color: "#334155", percent: 100 }]}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={82}
              paddingAngle={hasData ? 3 : 0}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {(hasData ? data.filter((d) => d.value > 0) : [{ color: "#334155" }]).map(
                (entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                )
              )}
            </Pie>
            {hasData && (
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  color: "#fff",
                  boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
                  padding: "8px 12px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}
                formatter={(value: any, name: any) => [`${value} école(s)`, name]}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{effectiveTotal}</span>
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-0.5">Écoles</span>
        </div>
      </div>
    </div>
  );
}
