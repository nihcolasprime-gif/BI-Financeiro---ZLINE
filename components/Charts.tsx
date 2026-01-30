import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  ComposedChart,
  ScatterChart,
  Scatter,
  Area
} from 'recharts';
import { ClientData, CostData } from '../types';
import { formatCurrency } from '../utils';

interface ExtendedClientData extends ClientData {
  allocatedCost?: number;
  profit?: number;
}

// --- MODERN PALETTE (Vibrant & Deep) ---
const COLOR_REV = '#3b82f6'; // Blue 500
const COLOR_COST = '#cbd5e1'; // Slate 300
const COLOR_PROFIT_POS = '#10b981'; // Emerald 500
const COLOR_PROFIT_NEG = '#f43f5e'; // Rose 500
const COLOR_ACCENT = '#8b5cf6'; // Violet 500
const COLOR_WARNING = '#fbbf24'; // Amber 400
const COLOR_DANGER_SOFT = '#fda4af'; // Rose 300 (for backgrounds/secondary)

// Helper to check data validity
const isValidData = (data: any[]) => {
  return data && Array.isArray(data) && data.length > 0;
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-md p-4 rounded-xl border border-white/50 shadow-xl text-xs">
        <p className="font-bold text-slate-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
            <span className="text-slate-500 capitalize">{entry.name}:</span>
            <span className="font-semibold text-slate-700">
              {formatter ? formatter(entry.value, entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// 1. Trend Chart (Revenue vs Cost vs Profit)
export const TrendChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!isValidData(data)) return <div className="h-full flex items-center justify-center text-slate-400">Sem dados</div>;

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_REV} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={COLOR_REV} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="3 3" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
          <YAxis yAxisId="left" orientation="left" tickFormatter={(val) => `R$${val/1000}k`} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
          <Tooltip content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />} />
          <Legend iconType="circle" />
          <Area yAxisId="left" type="monotone" dataKey="revenue" name="Receita" fill="url(#colorRev)" stroke={COLOR_REV} strokeWidth={2} />
          <Bar yAxisId="left" dataKey="cost" name="Custos" fill={COLOR_COST} radius={[4, 4, 0, 0]} barSize={20} />
          <Line yAxisId="left" type="monotone" dataKey="profit" name="Lucro Líquido" stroke={COLOR_PROFIT_POS} strokeWidth={3} dot={{ r: 4, fill: COLOR_PROFIT_POS, strokeWidth: 2, stroke: '#fff' }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// 2. Pareto Chart
export const ParetoChart: React.FC<{ data: any[] }> = ({ data }) => {
  if (!isValidData(data)) return <div className="h-full flex items-center justify-center text-slate-400">Sem dados</div>;

  const sortedData = [...data].sort((a,b) => (b.Receita_Liquida_Apos_Imposto_BRL || 0) - (a.Receita_Liquida_Apos_Imposto_BRL || 0));
  const total = sortedData.reduce((s, c) => s + (c.Receita_Liquida_Apos_Imposto_BRL || 0), 0);
  let acc = 0;
  const chartData = sortedData.map(c => {
    const val = c.Receita_Liquida_Apos_Imposto_BRL || 0;
    acc += val;
    return { ...c, Receita_Liquida_Apos_Imposto_BRL: val, cumulativePercentage: total > 0 ? (acc / total) * 100 : 0 };
  });

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="Cliente" axisLine={false} tickLine={false} fontSize={10} tick={{fill: '#64748b'}} interval={0} />
          <YAxis yAxisId="left" orientation="left" tickFormatter={(val) => `R$${val/1000}k`} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(val) => `${Math.round(val)}%`} domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#cbd5e1'}} />
          <Tooltip content={<CustomTooltip formatter={(value: number, name: string) => name === 'Acumulado %' ? `${value.toFixed(1)}%` : formatCurrency(value)} />} />
          <Bar yAxisId="left" dataKey="Receita_Liquida_Apos_Imposto_BRL" name="Receita" fill={COLOR_REV} radius={[6, 6, 0, 0]} barSize={28}>
            {chartData.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={`rgba(59, 130, 246, ${1 - (index * 0.1)})`} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="cumulativePercentage" name="Acumulado %" stroke={COLOR_ACCENT} strokeWidth={3} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// 3. Scatter Chart
export const ScatterRevContent: React.FC<{ data: any[] }> = ({ data }) => {
  if (!isValidData(data)) return <div className="h-full flex items-center justify-center text-slate-400">Sem dados</div>;

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis type="number" dataKey="Conteudos_Entregues" name="Conteúdos" unit=" un" tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
          <YAxis type="number" dataKey="Receita_Liquida_Apos_Imposto_BRL" name="Receita" unit=" R$" tickLine={false} axisLine={false} tick={{fill: '#64748b'}} tickFormatter={(val) => `R$${val/1000}k`} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip formatter={(value: any, name: string) => name === 'Receita' ? formatCurrency(value) : value} />} />
          <Scatter name="Clientes" data={data} fill={COLOR_REV}>
             {data.map((entry, index) => (
               <Cell key={`cell-${index}`} fill={(entry.profit || 0) < 0 ? COLOR_PROFIT_NEG : COLOR_PROFIT_POS} />
             ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

// 4. Profit/Loss Chart
export const ProfitLossChart: React.FC<{ clients: ExtendedClientData[] }> = ({ clients }) => {
  if (!isValidData(clients)) return <div className="h-full flex items-center justify-center text-slate-400">Sem dados</div>;

  const sortedData = [...clients].sort((a, b) => (b.profit || 0) - (a.profit || 0));

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="Cliente" width={100} tick={{fontSize: 12, fill: '#475569', fontWeight: 600}} axisLine={false} tickLine={false} />
          <Tooltip 
            cursor={{fill: '#f1f5f9', opacity: 0.5}}
            content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />}
          />
          <Bar dataKey="profit" name="Lucro/Prejuízo" barSize={18} radius={[0, 99, 99, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={(entry.profit || 0) >= 0 ? COLOR_PROFIT_POS : COLOR_PROFIT_NEG} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 5. Efficiency Chart
export const EfficiencyChart: React.FC<{ clients: ClientData[] }> = ({ clients }) => {
  if (!isValidData(clients)) return <div className="h-full flex items-center justify-center text-slate-400">Sem dados</div>;

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={clients} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="Cliente" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {/* Delivered: Blue normally, but if low compared to contracted? Kept blue for delivered. */}
          <Bar dataKey="Conteudos_Entregues" name="Entregues" stackId="a" fill={COLOR_REV} radius={[0,0,4,4]} />
          {/* Not Delivered: Highlighted in Soft Red to indicate missed target */}
          <Bar dataKey="Conteudos_Nao_Entregues" name="Não Entregues" stackId="a" fill={COLOR_DANGER_SOFT} radius={[4,4,0,0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// 6. Costs Pie Chart
interface CostsPieChartProps {
  costs: CostData[];
  onSliceClick?: (data: CostData) => void;
}

export const CostsPieChart: React.FC<CostsPieChartProps> = ({ costs, onSliceClick }) => {
  if (!isValidData(costs)) return <div className="h-full flex items-center justify-center text-slate-400">Sem dados</div>;

  const activeCosts = costs
    .filter(c => c.Ativo_no_Mes && c.Valor_Mensal_BRL > 0)
    .sort((a, b) => b.Valor_Mensal_BRL - a.Valor_Mensal_BRL);
  
  if (activeCosts.length === 0) return <div className="h-full flex items-center justify-center text-slate-400">Custos Zerados</div>;

  const COLORS = ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0'];

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={activeCosts}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="Valor_Mensal_BRL"
            nameKey="Tipo_Custo"
            stroke="none"
            onClick={(data) => onSliceClick && onSliceClick(data.payload)}
            cursor="pointer"
          >
            {activeCosts.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

// 7. Real vs Ideal Revenue Chart (Bar Comparison)
export const RealVsIdealChart: React.FC<{ clients: any[] }> = ({ clients }) => {
  if (!isValidData(clients)) return <div className="h-full flex items-center justify-center text-slate-400">Sem dados</div>;

  // Sort by Ideal Revenue for better visualization
  const sorted = [...clients].sort((a, b) => b.idealRevenueBasedOnContract - a.idealRevenueBasedOnContract);

  return (
    <div className="w-full h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="Cliente" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(v) => `R$${v/1000}k`} />
          <Tooltip content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} />} />
          <Legend />
          {/* Real Revenue: Red if below Ideal (Target), Green/Blue if above */}
          <Bar dataKey="Receita_Liquida_Apos_Imposto_BRL" name="Receita Real" radius={[4,4,0,0]} barSize={12}>
            {sorted.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.Receita_Liquida_Apos_Imposto_BRL < entry.idealRevenueBasedOnContract ? COLOR_PROFIT_NEG : COLOR_PROFIT_POS} 
              />
            ))}
          </Bar>
          {/* Ideal Revenue: Reference color */}
          <Bar dataKey="idealRevenueBasedOnContract" name="Receita Ideal (20% Margem)" fill={COLOR_ACCENT} radius={[4,4,0,0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
