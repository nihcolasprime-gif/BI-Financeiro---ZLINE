import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, ComposedChart, Line 
} from 'recharts';
import { formatCurrency } from '../utils';

// Definindo o formato dos dados que o App.tsx vai passar pra cá
export interface FinancialHistoryData {
  month: string;
  agencyRevenue: number; // Receita Agência
  uizRevenue: number;    // Receita UI-Z (Setup + Mensalidade)
  totalRevenue: number;
  totalCost: number;
  netResult: number;
  accumulatedCash: number;
}

interface ChartsProps {
  data: FinancialHistoryData[];
  privacyMode: boolean;
}

export const FinancialCharts: React.FC<ChartsProps> = ({ data, privacyMode }) => {
  
  // Custom Tooltip para formatar valores no hover
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/90 text-red-50 p-4 rounded-2xl shadow-xl border border-red-500/40">
          <p className="font-bold text-xs uppercase tracking-widest mb-2 text-red-100/70">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs font-bold mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="capitalize">{entry.name}:</span>
              <span className="font-mono">{privacyMode ? '••••' : formatCurrency(entry.value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* GRÁFICO 1: COMPOSIÇÃO DE RECEITA (UI-Z vs AGÊNCIA) */}
      <div className="glass-panel p-6 rounded-[32px] border border-red-500/30 shadow-xl bg-black/35 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xs font-black text-red-100 uppercase tracking-widest">Fontes de Receita</h3>
            <p className="text-[10px] text-red-100/70 font-bold">Agência (Serviço) vs UI-Z (Recorrência)</p>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#7f1d1d" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: '#fecaca', fontWeight: 700 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                hide={privacyMode} 
                tick={{ fontSize: 10, fill: '#fecaca' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(127,29,29,0.25)', radius: 8 }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
              
              {/* Barras Empilhadas (StackId igual empilha uma na outra) */}
              <Bar 
                name="Agência" 
                dataKey="agencyRevenue" 
                stackId="a" 
                fill="#0a0a0a" // Cinza (Base)
                radius={[0, 0, 4, 4]} 
                barSize={32}
              />
              <Bar 
                name="UI-Z (SaaS)" 
                dataKey="uizRevenue" 
                stackId="a" 
                fill="#ff2400" // Indigo (Destaque Tech)
                radius={[4, 4, 0, 0]} 
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRÁFICO 2: SAÚDE FINANCEIRA (LUCRO vs CUSTOS) */}
      <div className="glass-panel p-6 rounded-[32px] border border-red-500/30 shadow-xl bg-black/35 backdrop-blur-xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-xs font-black text-red-100 uppercase tracking-widest">Saúde Financeira</h3>
            <p className="text-[10px] text-red-100/70 font-bold">Faturamento vs Custos</p>
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff2400" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#ff2400" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#7f1d1d" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 10, fill: '#fecaca', fontWeight: 700 }} 
                axisLine={false} 
                tickLine={false} 
              />
              <YAxis 
                hide={privacyMode} 
                tick={{ fontSize: 10, fill: '#fecaca' }} 
                axisLine={false} 
                tickLine={false}
                tickFormatter={(value) => `${value / 1000}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }} />
              
              {/* Área de Receita Total no Fundo */}
              <Area 
                type="monotone" 
                dataKey="totalRevenue" 
                name="Receita Total" 
                stroke="#ff2400" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRevenue)" 
              />
              
              {/* Linha de Custos (Alerta) */}
              <Line 
                type="monotone" 
                dataKey="totalCost" 
                name="Custos" 
                stroke="#ff2400" 
                strokeWidth={3} 
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
