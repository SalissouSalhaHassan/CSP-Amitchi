"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const data = [
  { name: "Jan", "Revenus (CFA)": 4000, "Écoles": 0 },
  { name: "Fév", "Revenus (CFA)": 4800, "Écoles": 0 },
  { name: "Mar", "Revenus (CFA)": 6200, "Écoles": 1 },
  { name: "Avr", "Revenus (CFA)": 8500, "Écoles": 1 },
  { name: "Mai", "Revenus (CFA)": 11000, "Écoles": 2 },
  { name: "Juin", "Revenus (CFA)": 14000, "Écoles": 3 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xl p-3">
        <p className="text-xs font-black text-slate-700 dark:text-slate-200 mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs font-semibold" style={{ color: entry.color }}>
            {entry.name}: {entry.name === "Écoles" ? entry.value : `${entry.value.toLocaleString("fr-FR")} CFA`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export function PlatformChartsNew({
  schoolsCount,
  studentsCount,
  usersCount,
  revenue,
}: {
  schoolsCount?: number;
  studentsCount?: number;
  usersCount?: number;
  revenue?: number;
}) {
  return (
    <div className="bg-white dark:bg-[#111827] rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
            CROISSANCE & REVENUS DU RÉSEAU
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Évolution mensuelle des souscriptions et revenus générés.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-indigo-600 rounded-md" />
            Revenus
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 bg-violet-400 rounded-md" />
            Écoles
          </span>
        </div>
      </div>
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#33415525"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
              dy={8}
            />
            <YAxis
              yAxisId="revenue"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              domain={[0, "dataMax + 2000"]}
              width={36}
            />
            <YAxis
              yAxisId="schools"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }}
              domain={[0, "dataMax + 2"]}
              width={24}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="Revenus (CFA)"
              stroke="#4f46e5"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#4f46e5", strokeWidth: 0 }}
              activeDot={{ r: 6, fill: "#4f46e5", strokeWidth: 0 }}
            />
            <Line
              yAxisId="schools"
              type="monotone"
              dataKey="Écoles"
              stroke="#8b5cf6"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={{ r: 3.5, fill: "#8b5cf6", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#8b5cf6", strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
