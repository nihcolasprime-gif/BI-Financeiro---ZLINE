
import React from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, ScatterChart, Scatter, Area
} from 'recharts';
import { ClientData, CostData } from '../types';
import { formatCurrency } from '../utils';

// --- INTERFACES & TYPES ---

interface BaseChartProps {
  privacyMode?: boolean;
}

interface TrendData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
}

interface ExtendedClientData extends ClientData {
  allocatedCost?: number;
  profit?: number;
  idealRevenueBasedOnContract?: number;
}

// --- COLORS ---
const COLOR_REV = '#6366f1'; 
const COLOR_COST = '#e2e8f0'; 
const COLOR_PROFIT_POS = '#10b981'; 
const COLOR_PROFIT_NEG = '#f43f5e'; 
const COLOR_ACCENT = '#8b5cf6'; 
const COLOR_DANGER_SOFT = '#fecdd3'; 

// --- HELPERS ---

const isValidData = (data: any[] | undefined) => {
  return data && Array.isArray(data) && data.length > 0;
};

const CustomTooltip = ({ active, payload, label, formatter, privacyMode }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 backdrop-blur-xl p-3 rounded-xl border border-white/60 shadow-xl text-xs ring-1 ring-slate-100/50">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1.5">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }}></div>
               <span className="text-slate-500 font-medium capitalize">{entry.name}</span>
            </div>
            <span className="font-bold text-slate-700 font-mono">
              {privacyMode ? '••••••' : (formatter ? formatter(entry.value, entry.name) : entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// --- COMPONENTS ---

export const TrendChart: React.FC<{ data: TrendData[] } & BaseChartProps> = ({ data, privacyMode }) => {
  if (!isValidData(data)) return <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs uppercase tracking-widest">Sem dados de histórico</div>;

  return (
    <div className="w-full h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 20, right: 0, bottom: 20, left: 0 }}>
          <defs>
            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLOR_REV} stopOpacity={0.2}/>
              <stop offset="95%" stopColor={COLOR_REV} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="4 4" />
          <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 600}} dy={10} />
          <YAxis yAxisId="left" orientation="left" tickFormatter={(val) => privacyMode ? '••' : `R$${val/1000}k`} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8', fontWeight: 500}} />
          <Tooltip content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} privacyMode={privacyMode} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '11px', fontWeight: 600, color: '#64748b' }} />
          <Area yAxisId="left" type="monotone" dataKey="revenue" name="Receita" fill="url(#colorRev)" stroke={COLOR_REV} strokeWidth={2} activeDot={{ r: 6, strokeWidth: 0, fill: COLOR_REV }} />
          <Bar yAxisId="left" dataKey="cost" name="Custos" fill={COLOR_COST} radius={[4, 4, 0, 0]} barSize={20} />
          <Line yAxisId="left" type="monotone" dataKey="profit" name="Lucro Líquido" stroke={COLOR_PROFIT_POS} strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2, stroke: COLOR_PROFIT_POS }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ScatterRevContent: React.FC<{ data: ExtendedClientData[] } & BaseChartProps> = ({ data, privacyMode }) => {
  if (!isValidData(data)) return <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs uppercase tracking-widest">Sem dados de dispersão</div>;

  return (
    <div className="w-full h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" />
          <XAxis type="number" dataKey="Conteudos_Entregues" name="Conteúdos" unit=" un" tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
          <YAxis type="number" dataKey="Receita_Liquida_Apos_Imposto_BRL" name="Receita" unit=" R$" tickLine={false} axisLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => privacyMode ? '••' : `R$${val/1000}k`} />
          <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip formatter={(value: any, name: string) => name === 'Receita' ? formatCurrency(value) : value} privacyMode={privacyMode} />} />
          <Scatter name="Clientes" data={data} fill={COLOR_REV}>
             {data.map((entry, index) => (
               <Cell key={entry.id || `cell-${index}`} fill={(entry.profit || 0) < 0 ? COLOR_PROFIT_NEG : COLOR_PROFIT_POS} />
             ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export const ProfitLossChart: React.FC<{ clients: ExtendedClientData[] } & BaseChartProps> = ({ clients, privacyMode }) => {
  if (!isValidData(clients)) return <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs uppercase tracking-widest">Sem dados de clientes</div>;

  const sortedData = [...clients].sort((a, b) => (b.profit || 0) - (a.profit || 0));

  return (
    <div className="w-full h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sortedData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
          <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="Cliente" width={100} tick={{fontSize: 10, fill: '#475569', fontWeight: 600}} axisLine={false} tickLine={false} />
          <Tooltip 
            cursor={{fill: '#f8fafc'}}
            content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} privacyMode={privacyMode} />}
          />
          <Bar dataKey="profit" name="Lucro/Prejuízo" barSize={12} radius={[0, 99, 99, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={entry.id || `cell-${index}`} fill={(entry.profit || 0) >= 0 ? COLOR_PROFIT_POS : COLOR_PROFIT_NEG} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

interface CostsPieChartProps extends BaseChartProps {
  costs: CostData[];
  onSliceClick?: (data: CostData) => void;
}

export const CostsPieChart: React.FC<CostsPieChartProps> = ({ costs, onSliceClick, privacyMode }) => {
  if (!isValidData(costs)) return <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs uppercase tracking-widest">Sem dados de custos</div>;

  const activeCosts = costs
    .filter(c => c.Ativo_no_Mes && c.Valor_Mensal_BRL > 0)
    .sort((a, b) => b.Valor_Mensal_BRL - a.Valor_Mensal_BRL);
  
  if (activeCosts.length === 0) return <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs uppercase tracking-widest">Sem Custos Ativos</div>;

  const COLORS = ['#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'];

  return (
    <div className="w-full h-[250px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={activeCosts}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={95}
            paddingAngle={4}
            dataKey="Valor_Mensal_BRL"
            nameKey="Tipo_Custo"
            stroke="none"
            onClick={(data) => onSliceClick && onSliceClick(data.payload)}
            cursor="pointer"
            cornerRadius={6}
          >
            {activeCosts.map((entry, index) => (
              <Cell key={entry.id || `cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} privacyMode={privacyMode} />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export const RealVsIdealChart: React.FC<{ clients: ExtendedClientData[] } & BaseChartProps> = ({ clients, privacyMode }) => {
  if (!isValidData(clients)) return <div className="h-full flex items-center justify-center text-slate-400 font-medium text-xs uppercase tracking-widest">Sem dados comparativos</div>;

  // Ensure idealRevenueBasedOnContract is defined, fallback to 0
  const sorted = [...clients].sort((a, b) => (b.idealRevenueBasedOnContract || 0) - (a.idealRevenueBasedOnContract || 0));

  return (
    <div className="w-full h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="Cliente" tick={{fontSize: 10, fill: '#94a3b8'}} axisLine={false} tickLine={false} dy={5} />
          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(v) => privacyMode ? '••' : `R$${v/1000}k`} />
          <Tooltip content={<CustomTooltip formatter={(value: number) => formatCurrency(value)} privacyMode={privacyMode} />} cursor={{fill: '#f8fafc'}} />
          <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
          <Bar dataKey="Receita_Liquida_Apos_Imposto_BRL" name="Receita Real" radius={[4,4,0,0]} barSize={16}>
            {sorted.map((entry, index) => (
              <Cell 
                key={entry.id || `cell-${index}`} 
                fill={entry.Receita_Liquida_Apos_Imposto_BRL < (entry.idealRevenueBasedOnContract || 0) ? COLOR_PROFIT_NEG : COLOR_PROFIT_POS} 
              />
            ))}
          </Bar>
          <Bar dataKey="idealRevenueBasedOnContract" name="Receita Ideal (Meta)" fill={COLOR_ACCENT} radius={[4,4,0,0]} barSize={16} fillOpacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
