"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const data = [
  { name: "Jan", revenue: 4000, schools: 2 },
  { name: "Fév", revenue: 3000, schools: 3 },
  { name: "Mar", revenue: 5000, schools: 5 },
  { name: "Avr", revenue: 8000, schools: 8 },
  { name: "Mai", revenue: 12000, schools: 12 },
  { name: "Juin", revenue: 15000, schools: 15 },
];

export function PlatformCharts() {
  return (
    <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
      <CardHeader className="p-8 pb-0">
        <CardTitle className="text-xl font-black text-slate-900">Croissance de la Plateforme</CardTitle>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Revenus et Écoles (Derniers 6 mois)</p>
      </CardHeader>
      <CardContent className="p-8 h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }}
            />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '16px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              labelStyle={{ fontWeight: 900, marginBottom: '4px' }}
            />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#6366f1" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorRevenue)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
