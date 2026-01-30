import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Filter, TrendingUp, DollarSign, Activity, 
  AlertTriangle, Calendar, PieChart as PieIcon, List, 
  Briefcase, BarChart2, Target, ShieldAlert, Users, Battery,
  Calculator, Scale, History, UserCheck, TrendingDown, ArrowRight,
  Landmark, Zap, Trophy, Percent, X, MoreHorizontal, ExternalLink,
  ChevronLeft, AlertCircle, ChevronDown, Sparkles
} from 'lucide-react';
import { ALL_CLIENTS, ALL_COSTS, MONTHS, STATUSES } from './constants';
import KPICard from './components/KPICard';
import { 
  ProfitLossChart, EfficiencyChart, CostsPieChart, 
  TrendChart, ParetoChart, ScatterRevContent, RealVsIdealChart 
} from './components/Charts';
import { formatCurrency, formatPercent } from './utils';
import { ClientData, CostData } from './types';

// --- TABS DEFINITION ---
type TabType = 'executive' | 'roi' | 'annual' | 'clients' | 'costs' | 'alerts';

// --- HELPERS FOR BUSINESS LOGIC ---
const isNonOperationalCost = (costName: string) => {
  const lower = costName.toLowerCase();
  return lower.includes('estorno') || lower.includes('contador') || lower.includes('imposto');
};

const isLaborCost = (costName: string) => {
  const lower = costName.toLowerCase();
  return lower.includes('pro-labore') || lower.includes('editor') || lower.includes('fotografo') || lower.includes('social media');
};

const STANDARD_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// --- SUB-COMPONENTS ---

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center animate-fade-out-delayed">
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-500 blur-3xl opacity-20 animate-pulse rounded-full"></div>
      <div className="relative h-24 w-24 bg-gradient-to-tr from-indigo-600 to-slate-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/30 animate-scale-in">
        <span className="text-white font-black text-5xl">Z</span>
      </div>
    </div>
    <div className="mt-8 text-center animate-slide-up-fade">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Bem vindo ao Z</h1>
      <p className="text-slate-400 text-sm tracking-widest uppercase">Intelligence Dashboard</p>
    </div>
    
    <style>{`
      @keyframes scale-in {
        0% { transform: scale(0.5); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes slide-up-fade {
        0% { transform: translateY(20px); opacity: 0; }
        100% { transform: translateY(0); opacity: 1; }
      }
      @keyframes fade-out-delayed {
        0%, 80% { opacity: 1; pointer-events: all; }
        100% { opacity: 0; pointer-events: none; }
      }
      .animate-scale-in { animation: scale-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      .animate-slide-up-fade { animation: slide-up-fade 0.8s 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      .animate-fade-out-delayed { animation: fade-out-delayed 2.5s ease-in-out forwards; }
    `}</style>
  </div>
);

const TabButton = ({ id, label, icon: Icon, activeTab, onClick }: { id: TabType, label: string, icon: any, activeTab: TabType, onClick: (id: TabType) => void }) => {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`
        relative flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 whitespace-nowrap
        ${isActive 
          ? 'bg-slate-800 text-white shadow-lg shadow-indigo-500/20 scale-105 ring-1 ring-white/20' 
          : 'bg-white/60 text-slate-500 hover:bg-white hover:text-indigo-600 hover:shadow-md'}
      `}
    >
      <Icon size={16} className={isActive ? 'text-indigo-300' : ''} />
      {label}
      {isActive && (
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-400 rounded-full"></span>
      )}
    </button>
  );
};

const ClientDetailModal = ({ client, onClose }: { client: any | null, onClose: () => void }) => {
  if (!client) return null;
  const c = client;
  const unitGap = c.revPerContent - c.idealPriceUnit;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-md h-full bg-white/95 backdrop-blur-xl border-l border-white/50 shadow-2xl p-8 overflow-y-auto animate-slide-in-right transform transition-transform duration-300">
         <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
           <X size={20} />
         </button>
         
         <div className="mt-8">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-lg shadow-blue-500/30">
              {c.Cliente.charAt(0)}
           </div>
           <h2 className="text-3xl font-bold text-slate-800 tracking-tight">{c.Cliente}</h2>
           <p className="text-slate-500 text-sm flex items-center gap-2 mt-1 font-medium">
             <span className={`w-2 h-2 rounded-full ${c.Status_Cliente === 'Ativo' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
             {c.Status_Cliente} {c.Status_Detalhe && `• ${c.Status_Detalhe}`}
           </p>
         </div>

         <div className="mt-8 space-y-6">
           <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Financeiro Mês</h3>
             <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-xs text-slate-500 mb-1">Receita Bruta</p>
                 <p className="font-bold text-slate-800 text-lg">{formatCurrency(c.Receita_Mensal_BRL)}</p>
               </div>
               <div>
                 <p className="text-xs text-slate-500 mb-1">Receita Líquida</p>
                 <p className="font-bold text-slate-800 text-lg">{formatCurrency(c.Receita_Liquida_Apos_Imposto_BRL)}</p>
               </div>
               <div className="col-span-2 pt-3 border-t border-slate-200 mt-1">
                 <p className="text-xs text-slate-500 mb-1">Lucro Operacional Estimado</p>
                 <p className={`font-bold text-xl ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                   {formatCurrency(c.profit)}
                 </p>
               </div>
             </div>
           </div>

           <div className="p-5 bg-slate-50/80 rounded-2xl border border-slate-100 shadow-sm">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Operação</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 font-medium">Contratados</span>
                  <span className="font-bold text-slate-800">{c.Conteudos_Contratados} un</span>
                </div>
                <div className="relative pt-1">
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(c.Conteudos_Entregues / c.Conteudos_Contratados) * 100}%` }}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-medium">
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-1 rounded">{c.Conteudos_Entregues} Entregues</span>
                  <span className="text-slate-500 bg-slate-100 px-2 py-1 rounded">{c.Conteudos_Nao_Entregues} Pendentes</span>
                </div>
             </div>
           </div>

           <div className="p-5 bg-indigo-50/60 rounded-2xl border border-indigo-100 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Precificação Unitária (20% Margem)</h3>
              
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Custo Op. / un:</span>
                  <span className="font-semibold text-slate-700">{formatCurrency(c.costPerContent)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Preço Ideal (Target):</span>
                  <span className="font-bold text-indigo-600">{formatCurrency(c.idealPriceUnit)}</span>
                </div>
                <div className="h-px bg-indigo-200 my-2"></div>
                <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">Preço Real / un</span>
                   <span className="font-bold text-xl text-slate-800">{formatCurrency(c.revPerContent)}</span>
                </div>
              </div>

              {unitGap < 0 ? (
                <div className="text-xs text-rose-700 flex items-start gap-3 bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                  <div>
                    <span className="font-bold block text-sm mb-1">Prejuízo de {formatCurrency(Math.abs(unitGap))} por item.</span>
                    <span className="opacity-90">Abaixo da margem ideal. Sugerido reajuste de contrato ou redução de escopo.</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-emerald-700 flex items-start gap-3 bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                  <UserCheck size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                  <div>
                    <span className="font-bold block text-sm mb-1">Lucro de {formatCurrency(unitGap)} acima da meta.</span>
                    <span className="opacity-90">Contrato saudável com margem superior a 20%. Excelente performance.</span>
                  </div>
                </div>
              )}
           </div>
         </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  // --- State ---
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[1]); // Default to "Janeiro/2026"
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedClient, setSelectedClient] = useState<string>('Todos');
  
  // Modal State
  const [selectedDetailClient, setSelectedDetailClient] = useState<any | null>(null);

  // Cost Detail State
  const [selectedCostItem, setSelectedCostItem] = useState<CostData | null>(null);

  // --- SPLASH SCREEN EFFECT ---
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200); // 2.2s allows animation to complete
    return () => clearTimeout(timer);
  }, []);

  // --- DERIVED STATE FOR FILTERS ---
  const [currentMonthName, currentYear] = selectedMonth.split('/');
  const availableYears = useMemo(() => Array.from(new Set(MONTHS.map(m => m.split('/')[1]))).sort(), []);
  const uniqueClients = ['Todos', ...Array.from(new Set(ALL_CLIENTS.map(c => c.Cliente)))];

  // --- 1. PROCESSED DATA FOR SELECTED MONTH ---
  const monthlyMetrics = useMemo(() => {
    const clients = ALL_CLIENTS.filter(c => c.Mes_Referencia === selectedMonth);
    const costs = ALL_COSTS.filter(c => c.Mes_Referencia === selectedMonth && c.Ativo_no_Mes);

    const opCosts = costs.filter(c => !isNonOperationalCost(c.Tipo_Custo));
    const nonOpCosts = costs.filter(c => isNonOperationalCost(c.Tipo_Custo));
    const laborCosts = costs.filter(c => isLaborCost(c.Tipo_Custo));

    const totalOpCost = opCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);
    const totalNonOpCost = nonOpCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);
    const totalLaborCost = laborCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);
    const totalCost = totalOpCost + totalNonOpCost;

    const totalDelivered = clients.reduce((sum, c) => sum + c.Conteudos_Entregues, 0);
    const costPerContent = totalDelivered > 0 ? totalOpCost / totalDelivered : 0;

    return { 
      clients, costs, opCosts, nonOpCosts, 
      totalOpCost, totalNonOpCost, totalLaborCost, totalCost, 
      totalDelivered, costPerContent 
    };
  }, [selectedMonth]);

  // --- 2. VIEW DATA (Filtered) ---
  const viewData = useMemo(() => {
    let filteredClients = monthlyMetrics.clients.filter(client => {
      const matchStatus = selectedStatus === 'Todos' || client.Status_Cliente === selectedStatus;
      const matchClientName = selectedClient === 'Todos' || client.Cliente === selectedClient;
      return matchStatus && matchClientName;
    });

    const TARGET_MARGIN = 0.20; 
    const idealPricePerContent = monthlyMetrics.costPerContent > 0 
      ? monthlyMetrics.costPerContent / (1 - TARGET_MARGIN) 
      : 0;

    const enriched = filteredClients.map(client => {
      const allocatedOpCost = client.Conteudos_Entregues * monthlyMetrics.costPerContent;
      const profit = client.Receita_Liquida_Apos_Imposto_BRL - allocatedOpCost; 
      const margin = client.Receita_Liquida_Apos_Imposto_BRL !== 0 
        ? profit / client.Receita_Liquida_Apos_Imposto_BRL 
        : 0;
      const revPerContent = client.Conteudos_Entregues > 0
        ? client.Receita_Liquida_Apos_Imposto_BRL / client.Conteudos_Entregues
        : 0;
      const idealRevenueBasedOnContract = idealPricePerContent * client.Conteudos_Contratados;
      const priceGap = client.Receita_Liquida_Apos_Imposto_BRL - idealRevenueBasedOnContract;

      return { 
        ...client, allocatedOpCost, profit, margin, revPerContent,
        idealRevenueBasedOnContract, priceGap,
        idealPriceUnit: idealPricePerContent,
        costPerContent: monthlyMetrics.costPerContent
      };
    });

    const grossRevenue = enriched.reduce((sum, c) => sum + c.Receita_Mensal_BRL, 0);
    const netRevenue = enriched.reduce((sum, c) => sum + c.Receita_Liquida_Apos_Imposto_BRL, 0);
    
    let displayedCost = 0;
    let displayedProfit = 0;
    let isSingleClientView = selectedClient !== 'Todos';

    if (isSingleClientView) {
      displayedCost = enriched.reduce((sum, c) => sum + c.allocatedOpCost, 0);
      displayedProfit = netRevenue - displayedCost;
    } else {
      displayedCost = monthlyMetrics.totalCost; 
      displayedProfit = netRevenue - displayedCost;
    }

    const margin = netRevenue !== 0 ? displayedProfit / netRevenue : 0;
    const roi = displayedCost > 0 ? (displayedProfit / displayedCost) : 0;
    const ler = monthlyMetrics.totalLaborCost > 0 ? netRevenue / monthlyMetrics.totalLaborCost : 0;
    const avgRevPerContent = monthlyMetrics.totalDelivered > 0 
      ? (monthlyMetrics.clients.reduce((s,c) => s + c.Receita_Liquida_Apos_Imposto_BRL, 0) / monthlyMetrics.totalDelivered)
      : 0;

    return {
      clients: enriched, grossRevenue, netRevenue, displayedCost, displayedProfit,
      margin, roi, ler, avgRevPerContent, idealPricePerContent, isSingleClientView
    };
  }, [monthlyMetrics, selectedStatus, selectedClient]);

  // --- 3. ANNUAL / LTV DATA ---
  const annualData = useMemo(() => {
    const trend = MONTHS.map(month => {
      const mClients = ALL_CLIENTS.filter(c => c.Mes_Referencia === month);
      const mCosts = ALL_COSTS.filter(c => c.Mes_Referencia === month && c.Ativo_no_Mes);
      
      // Cost Logic for monthly calc
      const opCosts = mCosts.filter(c => !isNonOperationalCost(c.Tipo_Custo));
      const nonOpCosts = mCosts.filter(c => isNonOperationalCost(c.Tipo_Custo));
      const totalOpCost = opCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);
      const totalCost = mCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);

      const revenue = mClients.reduce((sum, c) => sum + c.Receita_Liquida_Apos_Imposto_BRL, 0);
      const profit = revenue - totalCost;
      const margin = revenue !== 0 ? profit / revenue : 0;

      return { month, revenue, cost: totalCost, profit, margin };
    });

    const clientMap = new Map();
    ALL_CLIENTS.forEach(c => {
      if (!clientMap.has(c.Cliente)) {
        clientMap.set(c.Cliente, { Cliente: c.Cliente, TotalRevenue: 0, TotalDelivered: 0 });
      }
      const entry = clientMap.get(c.Cliente);
      entry.TotalRevenue += c.Receita_Liquida_Apos_Imposto_BRL;
      entry.TotalDelivered += c.Conteudos_Entregues;
    });

    const ltvData = Array.from(clientMap.values()).map(c => ({
      ...c,
      RevPerContent: c.TotalDelivered > 0 ? c.TotalRevenue / c.TotalDelivered : 0
    })).sort((a,b) => b.TotalRevenue - a.TotalRevenue);

    const totalAnnualRevenue = trend.reduce((s, m) => s + m.revenue, 0);
    const totalAnnualCost = trend.reduce((s, m) => s + m.cost, 0);
    const totalAnnualProfit = trend.reduce((s, m) => s + m.profit, 0);

    return { trend, ltvData, totalAnnualRevenue, totalAnnualCost, totalAnnualProfit };
  }, []);

  // --- 4. ADVANCED & GLOBAL ALERTS LOGIC (UPDATED) ---
  const detailedAlerts = useMemo(() => {
    const alerts: any[] = [];
    
    // 1. GLOBAL MONTH ALERTS (Negative Margin)
    annualData.trend.forEach(m => {
        if (m.margin < 0) {
            alerts.push({
                type: 'critical',
                title: 'Margem Negativa no Mês',
                subject: m.month,
                value: formatPercent(m.margin),
                desc: 'A operação teve mais custos do que receita neste período.',
                icon: AlertCircle
            });
        }
    });

    // 2. GLOBAL CLIENT ALERTS (Scan ALL clients across ALL months for specific losses)
    // First, map cost per content for each month to be accurate
    const costMap = new Map();
    MONTHS.forEach(month => {
       const mCosts = ALL_COSTS.filter(c => c.Mes_Referencia === month && c.Ativo_no_Mes && !isNonOperationalCost(c.Tipo_Custo));
       const mClients = ALL_CLIENTS.filter(c => c.Mes_Referencia === month);
       
       const totalOpCost = mCosts.reduce((s, c) => s + c.Valor_Mensal_BRL, 0);
       const totalDelivered = mClients.reduce((s, c) => s + c.Conteudos_Entregues, 0);
       const unitCost = totalDelivered > 0 ? totalOpCost / totalDelivered : 0;
       costMap.set(month, unitCost);
    });

    // Iterate ALL clients to find negative margin instances
    ALL_CLIENTS.forEach(c => {
       const unitCost = costMap.get(c.Mes_Referencia) || 0;
       const allocatedCost = c.Conteudos_Entregues * unitCost;
       const profit = c.Receita_Liquida_Apos_Imposto_BRL - allocatedCost;
       
       if (profit < 0) {
          alerts.push({
            type: 'warning',
            title: 'Cliente com Prejuízo',
            subject: c.Cliente,
            value: formatCurrency(profit),
            desc: `Registrado em ${c.Mes_Referencia}. Receita inferior ao custo operacional de entrega (${c.Conteudos_Entregues} un).`,
            icon: TrendingDown,
            isHistorical: c.Mes_Referencia !== selectedMonth // Flag if it's from history
          });
       }
    });

    // Sort: Critical first, then by value magnitude
    return alerts.sort((a,b) => {
        if(a.type === 'critical' && b.type !== 'critical') return -1;
        if(a.type !== 'critical' && b.type === 'critical') return 1;
        return 0;
    });
  }, [annualData, selectedMonth]); // Dependent on annualData calc and current selectedMonth for context

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen text-slate-800 selection:bg-indigo-100 flex flex-col">
      <ClientDetailModal 
        client={selectedDetailClient} 
        onClose={() => setSelectedDetailClient(null)} 
      />
      
      {/* HEADER GLASS */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-xl border-b border-white/50 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Row: Branding & Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            
            {/* Brand */}
            <div className="flex items-center gap-4 self-start md:self-auto">
              <div className="h-10 w-10 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-slate-900/20 transform hover:scale-105 transition-transform cursor-pointer">
                Z
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">BI Financeiro</h1>
                <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">Dashboard Executivo v2.0</p>
              </div>
            </div>

            {/* Filters - Responsive Grid/Flex */}
            {activeTab !== 'annual' && activeTab !== 'alerts' && (
              <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 bg-white/60 p-1.5 rounded-2xl border border-white/60 shadow-inner w-full md:w-auto">
                {/* Month Selector */}
                <div className="relative group flex-1 md:flex-none">
                  <select 
                    value={currentMonthName}
                    onChange={(e) => setSelectedMonth(`${e.target.value}/${currentYear}`)}
                    className="w-full md:w-auto appearance-none bg-transparent text-sm font-semibold text-slate-700 border-none focus:ring-0 cursor-pointer outline-none pl-3 pr-8 py-1.5 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    {STANDARD_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                
                <div className="hidden md:block h-4 w-px bg-slate-300"></div>

                {/* Year Selector */}
                <div className="relative group flex-1 md:flex-none">
                  <select 
                    value={currentYear}
                    onChange={(e) => setSelectedMonth(`${currentMonthName}/${e.target.value}`)}
                    className="w-full md:w-auto appearance-none bg-transparent text-sm font-semibold text-slate-700 border-none focus:ring-0 cursor-pointer outline-none pl-3 pr-8 py-1.5 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="hidden md:block h-4 w-px bg-slate-300"></div>

                {/* Client Selector */}
                <div className="relative group flex-auto md:flex-none min-w-[120px]">
                  <select 
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full md:w-auto appearance-none bg-transparent text-sm font-bold text-slate-900 border-none focus:ring-0 cursor-pointer outline-none pl-3 pr-8 py-1.5 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-900 pointer-events-none" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Row: Tabs */}
          <div className="flex overflow-x-auto space-x-2 pb-4 pt-1 no-scrollbar mask-gradient-right">
            <TabButton id="executive" label="Visão Mensal" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="roi" label="ROI & Mercado" icon={Target} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="annual" label="Visão Anual" icon={History} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="clients" label="Clientes" icon={Users} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="costs" label="Custos" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="alerts" label="Alertas" icon={ShieldAlert} activeTab={activeTab} onClick={setActiveTab} />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      {/* Added pt-spacing to account for variable header height and key for animation triggering */}
      <main 
        key={activeTab}
        className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-[180px] md:mt-[160px] space-y-8 pb-20 animate-fade-in w-full"
      >
        
        {/* --- TAB 1: EXECUTIVE --- */}
        {activeTab === 'executive' && (
          <div className="space-y-8">
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard title="Receita Bruta" value={viewData.grossRevenue} colorCondition="always-neutral" icon={<DollarSign className="text-slate-900" />} />
              <KPICard title="Receita Líquida" value={viewData.netRevenue} icon={<Activity className="text-emerald-500" />} />
              <KPICard title="Custo Operacional" value={viewData.displayedCost} colorCondition="always-neutral" icon={<TrendingDown className="text-slate-500" />} />
              <KPICard title="Resultado Líquido" value={viewData.displayedProfit} colorCondition="positive-green" icon={<Trophy className="text-yellow-500" />} />
            </div>

            {/* CHARTS ROW 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-sm">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Performance Financeira</h3>
                    <div className="text-xs px-2 py-1 bg-slate-100 rounded text-slate-500">Lucro vs Prejuízo</div>
                 </div>
                 <div className="w-full">
                   <ProfitLossChart clients={viewData.clients} />
                 </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4">Eficiência de Entrega</h3>
                 <div className="flex-1 w-full">
                   <EfficiencyChart clients={viewData.clients} />
                 </div>
              </div>
            </div>

            {/* INTERACTIVE TABLE */}
            <div className="glass-panel rounded-3xl shadow-sm overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Scale size={20} /></div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Análise de Contratos</h3>
                      <p className="text-xs text-slate-500">Gap Mensal considera margem de 20%</p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/50">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                        <th className="px-6 py-4 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Contrato</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Receita Real</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider bg-indigo-50/50 border-x border-indigo-100">Gap Mensal</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewData.clients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                             Nenhum dado encontrado para {selectedMonth}.
                          </td>
                        </tr>
                      ) : (
                        [...viewData.clients].sort((a,b) => a.priceGap - b.priceGap).map(c => {
                           const isUnderPriced = c.priceGap < 0;
                           const gapPercent = c.idealRevenueBasedOnContract > 0 ? Math.abs(c.priceGap / c.idealRevenueBasedOnContract) : 0;
                           let statusBadge = <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">Saudável</span>;
                           
                           if (isUnderPriced) {
                              if (gapPercent > 0.3) statusBadge = <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">Crítico</span>;
                              else if (gapPercent > 0.1) statusBadge = <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">Atenção</span>;
                           }
  
                           return (
                            <tr 
                              key={c.id} 
                              onClick={() => setSelectedDetailClient(c)}
                              className="group hover:bg-slate-50/80 cursor-pointer transition-colors"
                            >
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.Cliente}</div>
                                {c.Status_Cliente === 'Inativo' && <div className="text-[10px] text-rose-500">Inativo</div>}
                              </td>
                              <td className="px-6 py-4 text-center text-sm text-slate-600">{c.Conteudos_Contratados}</td>
                              <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">{formatCurrency(c.Receita_Liquida_Apos_Imposto_BRL)}</td>
                              <td className="px-6 py-4 text-right text-sm bg-indigo-50/30 border-x border-indigo-50 group-hover:bg-indigo-100/50 transition-colors">
                                <span className={`font-bold ${c.priceGap < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  {c.priceGap > 0 ? '+' : ''}{formatCurrency(c.priceGap)}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">{statusBadge}</td>
                              <td className="px-6 py-4 text-right text-slate-300 group-hover:text-indigo-500">
                                 <MoreHorizontal size={16} />
                              </td>
                            </tr>
                           );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: ROI --- */}
        {activeTab === 'roi' && (
           <div className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-10 rounded-3xl shadow-sm text-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                   <div className="relative z-10">
                     <h3 className="text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                       <Target size={18} /> ROI Agência
                     </h3>
                     <div className={`text-6xl font-black mb-4 ${viewData.roi >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                       {formatPercent(viewData.roi)}
                     </div>
                     <p className="text-slate-500 max-w-sm mx-auto">
                       Eficiência sobre capital investido.
                     </p>
                   </div>
                </div>

                <div className="glass-panel p-10 rounded-3xl shadow-sm text-center">
                   <h3 className="text-slate-400 font-bold uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                     <Users size={18} /> Eficiência (LER)
                   </h3>
                   <div className={`text-6xl font-black mb-4 ${viewData.ler >= 3 ? 'text-emerald-500' : 'text-amber-500'}`}>
                     {viewData.ler.toFixed(2)}x
                   </div>
                   <p className="text-slate-500">
                     Faturamento por real gasto em equipe.
                   </p>
                </div>
             </div>
             
             {/* Benchmark Table (Styled Modern) */}
             <div className="glass-panel rounded-3xl overflow-hidden p-8">
                <h3 className="text-xl font-bold text-slate-800 mb-6">Benchmarks de Mercado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { label: 'Margem Líquida', value: viewData.margin, target: 0.20, format: formatPercent },
                      { label: 'Eficiência LER', value: viewData.ler, target: 3.0, format: (v: number) => v.toFixed(2) + 'x' },
                      { label: 'Custo Operacional', value: monthlyMetrics.totalOpCost / (viewData.netRevenue || 1), target: 0.50, format: formatPercent, reverse: true }
                    ].map((item, idx) => {
                      const isGood = item.reverse ? item.value <= item.target : item.value >= item.target;
                      return (
                        <div key={idx} className="bg-white/50 rounded-2xl p-6 border border-white/60 text-center">
                           <div className="text-sm text-slate-500 uppercase tracking-wide mb-2">{item.label}</div>
                           <div className={`text-3xl font-bold mb-2 ${isGood ? 'text-emerald-600' : 'text-rose-500'}`}>{item.format(item.value)}</div>
                           <div className="text-xs text-slate-400 bg-slate-100 inline-block px-2 py-1 rounded">Meta: {item.reverse ? '<' : '>'}{item.format(item.target)}</div>
                        </div>
                      )
                    })}
                </div>
             </div>
           </div>
        )}

        {/* --- TAB 3: ANNUAL --- */}
        {activeTab === 'annual' && (
          <div className="space-y-6">
             <div className="glass-panel p-8 rounded-3xl shadow-sm">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Performance Anual Acumulada</h2>
                <div className="w-full">
                  <TrendChart data={annualData.trend} />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <KPICard title="Total Acumulado (Liq)" value={annualData.totalAnnualRevenue} icon={<History className="text-indigo-500" />} />
               <KPICard title="Custos Totais" value={annualData.totalAnnualCost} colorCondition="always-neutral" />
               <KPICard title="Lucro Acumulado" value={annualData.totalAnnualProfit} colorCondition="positive-green" />
             </div>
          </div>
        )}

        {/* --- TAB 4: CLIENTS --- */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
             <div className="glass-panel p-8 rounded-3xl shadow-sm mb-6">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Projeção Real vs Ideal</h3>
                      <p className="text-sm text-slate-500">Comparativo entre a receita atual e a meta de 20% de margem</p>
                    </div>
                 </div>
                 <div className="w-full h-[400px]">
                   <RealVsIdealChart clients={viewData.clients} />
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="glass-panel p-6 rounded-3xl shadow-sm">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Pareto de Receita (LTV)</h3>
                 <div className="w-full">
                   <ParetoChart data={annualData.ltvData.map(c => ({...c, Receita_Liquida_Apos_Imposto_BRL: c.TotalRevenue}))} />
                 </div>
               </div>
               <div className="glass-panel p-6 rounded-3xl shadow-sm">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-6">Eficiência de Receita</h3>
                 <div className="w-full">
                   <ScatterRevContent data={annualData.ltvData.map(c => ({...c, Receita_Liquida_Apos_Imposto_BRL: c.TotalRevenue, Conteudos_Entregues: c.TotalDelivered, profit: 1}))} />
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* --- TAB 5: COSTS --- */}
        {activeTab === 'costs' && (
          <div className="space-y-6">
            <div className="glass-panel p-8 rounded-3xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
               <div className="w-full">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-4 text-center">Distribuição</h3>
                 <div className="h-[300px]">
                    <CostsPieChart 
                      costs={monthlyMetrics.costs} 
                      onSliceClick={(data) => setSelectedCostItem(data)}
                    />
                 </div>
                 <div className="text-center text-xs text-slate-400 mt-2">Clique em uma fatia para ver detalhes</div>
               </div>
               
               {selectedCostItem ? (
                 // --- DETAIL VIEW ---
                 <div className="space-y-4 animate-slide-in-right">
                   <div className="flex items-center gap-2 mb-2">
                     <button 
                       onClick={() => setSelectedCostItem(null)}
                       className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
                     >
                       <ChevronLeft size={20} />
                     </button>
                     <span className="text-xs uppercase tracking-widest font-bold text-indigo-600">Detalhe do Custo</span>
                   </div>

                   <div className="bg-white/60 p-6 rounded-2xl border border-indigo-100 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-4 opacity-10">
                       <PieIcon size={100} />
                     </div>
                     <span className="text-xs font-bold text-slate-400 uppercase">Item Selecionado</span>
                     <div className="text-2xl font-bold text-slate-800 mb-1">{selectedCostItem.Tipo_Custo}</div>
                     <div className="text-3xl font-black text-indigo-600">{formatCurrency(selectedCostItem.Valor_Mensal_BRL)}</div>
                   </div>

                   <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Scale size={14} /> Contexto de Custos
                       </h4>
                       
                       {/* Comparison Bars */}
                       <div className="space-y-4">
                          {/* Row 1: Operational */}
                          <div>
                              <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-slate-700">Operacional</span>
                                  <span className="text-slate-500">{formatCurrency(monthlyMetrics.totalOpCost)}</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                   {/* If selected is Op, show it here */}
                                   {!isNonOperationalCost(selectedCostItem.Tipo_Custo) && (
                                      <div className="bg-indigo-500 h-full animate-pulse" style={{ width: `${Math.min((selectedCostItem.Valor_Mensal_BRL / monthlyMetrics.totalOpCost) * 100, 100)}%` }}></div>
                                   )}
                              </div>
                          </div>

                          {/* Row 2: Non-Operational */}
                          <div>
                              <div className="flex justify-between text-xs mb-1">
                                  <span className="font-semibold text-slate-700">Não Operacional</span>
                                  <span className="text-slate-500">{formatCurrency(monthlyMetrics.totalNonOpCost)}</span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                   {isNonOperationalCost(selectedCostItem.Tipo_Custo) && (
                                      <div className="bg-amber-500 h-full animate-pulse" style={{ width: `${Math.min((selectedCostItem.Valor_Mensal_BRL / monthlyMetrics.totalNonOpCost) * 100, 100)}%` }}></div>
                                   )}
                              </div>
                          </div>
                       </div>
                       
                       <div className="mt-4 pt-3 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
                          <span>Total Geral:</span>
                          <span className="font-bold text-slate-700">{formatCurrency(monthlyMetrics.totalCost)}</span>
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                         <div className="flex items-center gap-2 mb-1 text-slate-500 text-xs font-bold uppercase">
                           <Calendar size={14} /> Projeção Anual
                         </div>
                         <div className="text-lg font-bold text-slate-700">
                           {formatCurrency(selectedCostItem.Valor_Mensal_BRL * 12)}
                         </div>
                      </div>
                      
                      {/* Risk Analysis Text Contextualized */}
                      <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 col-span-2">
                        <div className="flex items-center gap-2 mb-1 text-amber-600 text-xs font-bold uppercase">
                           <ShieldAlert size={14} /> Análise de Risco
                        </div>
                        <p className="text-sm text-amber-800 leading-snug">
                         {isNonOperationalCost(selectedCostItem.Tipo_Custo) 
                           ? `Este custo não contribui diretamente para a entrega. Se for recorrente e representar mais de 10% do total não operacional, considere renegociar.` 
                           : `Custo essencial para a operação. Reduções aqui podem impactar a qualidade da entrega. Monitore a eficiência do uso.`}
                        </p>
                         <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-amber-200">
                           {selectedCostItem.Valor_Mensal_BRL > (monthlyMetrics.totalCost * 0.15) 
                              ? 'ALERTA: Representa >15% do custo total da empresa.' 
                              : 'Impacto financeiro global moderado.'}
                         </p>
                      </div>
                   </div>
                 </div>
               ) : (
                 // --- SUMMARY VIEW (Default) ---
                 <div className="space-y-4 animate-fade-in">
                   <div className="bg-white/60 p-6 rounded-2xl border border-white/50 shadow-sm">
                     <span className="text-xs font-bold text-slate-400 uppercase">Custo Operacional Total</span>
                     <div className="text-3xl font-bold text-slate-800">{formatCurrency(monthlyMetrics.totalOpCost)}</div>
                     <div className="text-xs text-slate-500 mt-2">Base para cálculo de custo/hora</div>
                   </div>
                   <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100">
                     <span className="text-xs font-bold text-amber-500 uppercase">Extraordinários / Adm</span>
                     <div className="text-3xl font-bold text-amber-700">{formatCurrency(monthlyMetrics.totalNonOpCost)}</div>
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* --- TAB 6: ALERTS (Redesigned) --- */}
        {activeTab === 'alerts' && (
           <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">Central de Alertas e Riscos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {detailedAlerts.length === 0 ? (
                   <div className="col-span-full p-12 bg-emerald-50 rounded-3xl border border-emerald-100 text-center">
                      <div className="inline-flex p-4 bg-emerald-100 rounded-full text-emerald-600 mb-4">
                        <Trophy size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-emerald-800">Tudo Certo!</h3>
                      <p className="text-emerald-600">Nenhum risco crítico identificado nos períodos analisados.</p>
                   </div>
                 ) : (
                   detailedAlerts.map((alert, idx) => (
                     <div key={idx} className={`relative p-6 rounded-3xl border shadow-sm overflow-hidden group hover:-translate-y-1 transition-transform duration-300 ${
                       alert.type === 'critical' ? 'bg-rose-50 border-rose-100' : 'bg-amber-50 border-amber-100'
                     }`}>
                        <div className={`absolute top-0 right-0 p-6 opacity-10 transform group-hover:scale-110 transition-transform ${
                          alert.type === 'critical' ? 'text-rose-600' : 'text-amber-600'
                        }`}>
                          <alert.icon size={80} />
                        </div>
                        
                        <div className="relative z-10">
                          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase mb-4 ${
                            alert.type === 'critical' ? 'bg-rose-200 text-rose-800' : 'bg-amber-200 text-amber-800'
                          }`}>
                            {alert.type === 'critical' ? 'Crítico' : 'Atenção'}
                            {alert.isHistorical && <span className="ml-2 opacity-75">• Histórico</span>}
                          </div>
                          
                          <h3 className={`text-lg font-bold mb-1 ${
                            alert.type === 'critical' ? 'text-rose-900' : 'text-amber-900'
                          }`}>
                            {alert.title}
                          </h3>
                          <div className="text-2xl font-black mb-2 text-slate-800">{alert.subject}</div>
                          
                          <div className={`text-3xl font-black mb-4 ${
                            alert.type === 'critical' ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            {alert.value}
                          </div>
                          
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {alert.desc}
                          </p>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        )}

      </main>
    </div>
  );
};

export default App;