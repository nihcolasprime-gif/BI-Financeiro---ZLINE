import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Filter, TrendingUp, DollarSign, Activity, 
  AlertTriangle, Calendar, PieChart as PieIcon, List, 
  Briefcase, BarChart2, Target, ShieldAlert, Users, Battery,
  Calculator, Scale, History, UserCheck, TrendingDown, ArrowRight,
  Landmark, Zap, Trophy, Percent, X, MoreHorizontal, ExternalLink,
  ChevronLeft, AlertCircle, ChevronDown, Sparkles, Lock, Settings, FileText,
  Eye, EyeOff
} from 'lucide-react';
import { ALL_CLIENTS as INITIAL_CLIENTS, ALL_COSTS as INITIAL_COSTS, MONTHS, STATUSES } from './constants';
import KPICard from './components/KPICard';
import { ConfigurationsPanel } from './components/ConfigurationsPanel';
import { 
  ProfitLossChart, EfficiencyChart, CostsPieChart, 
  TrendChart, ParetoChart, ScatterRevContent, RealVsIdealChart 
} from './components/Charts';
import { formatCurrency, formatPercent } from './utils';
import { ClientData, CostData } from './types';

// --- TABS DEFINITION ---
type TabType = 'executive' | 'roi' | 'annual' | 'clients' | 'costs' | 'alerts' | 'settings';

// --- HELPERS ---
const isNonOperationalCost = (costName: string, costType?: string) => {
  if (costType === 'Extra' || costType === 'Imposto') return true;
  if (costType === 'Fixo') return false;
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

const AVAILABLE_YEARS = Array.from({ length: 12 }, (_, i) => (2024 + i).toString());

// --- SUB-COMPONENTS ---

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-fade-out-delayed">
    <div className="relative">
      <div className="absolute inset-0 bg-indigo-500 blur-[80px] opacity-20 animate-pulse rounded-full"></div>
      <div className="relative h-28 w-28 bg-gradient-to-tr from-indigo-600 to-slate-900 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/40 animate-scale-in border border-indigo-400/20">
        <span className="text-white font-black text-6xl tracking-tighter">Z</span>
      </div>
    </div>
    <div className="mt-8 text-center animate-slide-up-fade">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Bem vindo ao Z</h1>
      <p className="text-slate-500 text-xs tracking-[0.2em] uppercase font-bold">Business Intelligence v2.0</p>
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
        relative flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-2xl transition-all duration-300 whitespace-nowrap
        ${isActive 
          ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10 scale-100 ring-1 ring-white/10' 
          : 'bg-white/40 text-slate-500 hover:bg-white/80 hover:text-indigo-600 hover:shadow-md border border-transparent hover:border-white/60'}
      `}
    >
      <Icon size={18} className={isActive ? 'text-indigo-300' : 'opacity-70'} />
      {label}
    </button>
  );
};

const MaskedValue = ({ value, privacyMode, format, className }: { value: any, privacyMode: boolean, format?: (v: any) => string, className?: string }) => {
  if (privacyMode) return <span className={`blur-[5px] select-none bg-slate-200/50 rounded-sm px-1 text-transparent ${className}`}>####</span>;
  return <span className={className}>{format ? format(value) : value}</span>;
};

const ClientDetailModal = ({ client, onClose, privacyMode }: { client: any | null, onClose: () => void, privacyMode: boolean }) => {
  if (!client) return null;
  const c = client;
  const unitGap = c.revPerContent - c.idealPriceUnit;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-md h-full bg-white/95 backdrop-blur-2xl border-l border-white/60 shadow-2xl p-8 overflow-y-auto animate-slide-in-right">
         <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
           <X size={20} />
         </button>
         
         <div className="mt-8">
           <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-3xl font-black mb-4 shadow-lg shadow-indigo-500/30">
              {c.Cliente.charAt(0)}
           </div>
           <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{c.Cliente}</h2>
           <div className="flex items-center gap-2 mt-2">
             <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${c.Status_Cliente === 'Ativo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                {c.Status_Cliente}
             </span>
             {c.Status_Detalhe && <span className="text-xs text-slate-500 font-medium">• {c.Status_Detalhe}</span>}
           </div>
         </div>

         <div className="mt-10 space-y-6">
           <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-sm">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Financeiro Mês</h3>
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <p className="text-sm font-medium text-slate-500">Receita Bruta</p>
                 <p className="font-bold text-slate-800 text-lg font-mono">
                    <MaskedValue value={c.Receita_Mensal_BRL} privacyMode={privacyMode} format={formatCurrency} />
                 </p>
               </div>
               <div className="flex justify-between items-center">
                 <p className="text-sm font-medium text-slate-500">Receita Líquida</p>
                 <p className="font-bold text-slate-800 text-lg font-mono">
                    <MaskedValue value={c.Receita_Liquida_Apos_Imposto_BRL} privacyMode={privacyMode} format={formatCurrency} />
                 </p>
               </div>
               <div className="pt-3 border-t border-slate-200 mt-1 flex justify-between items-center">
                 <p className="text-sm font-bold text-slate-600">Lucro Operacional</p>
                 <p className={`font-black text-xl font-mono ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                   <MaskedValue value={c.profit} privacyMode={privacyMode} format={formatCurrency} />
                 </p>
               </div>
             </div>
           </div>

           <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200/60 shadow-sm">
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Operação</h3>
             <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600 font-medium">Contratados</span>
                  <span className="font-bold text-slate-900 text-lg">{c.Conteudos_Contratados} <span className="text-sm text-slate-400 font-normal">un</span></span>
                </div>
                <div className="relative pt-2 pb-1">
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-700 ease-out" style={{ width: `${Math.min((c.Conteudos_Entregues / c.Conteudos_Contratados) * 100, 100)}%` }}></div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-emerald-700 bg-emerald-100/50 px-2 py-1 rounded">{c.Conteudos_Entregues} Entregues</span>
                  <span className="text-slate-600 bg-slate-200/50 px-2 py-1 rounded">{c.Conteudos_Nao_Entregues} Pendentes</span>
                </div>
             </div>
           </div>

           <div className="p-6 bg-indigo-50/40 rounded-2xl border border-indigo-100/60 shadow-sm">
              <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">Unit Economics</h3>
              
              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Custo Op. / un:</span>
                  <span className="font-semibold text-slate-700 font-mono">
                    <MaskedValue value={c.costPerContent} privacyMode={privacyMode} format={formatCurrency} />
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Preço Ideal (Target):</span>
                  <span className="font-bold text-indigo-600 font-mono">
                    <MaskedValue value={c.idealPriceUnit} privacyMode={privacyMode} format={formatCurrency} />
                  </span>
                </div>
                <div className="h-px bg-indigo-200/50 my-2"></div>
                <div className="flex justify-between items-center">
                   <span className="text-sm text-slate-600">Preço Real / un</span>
                   <span className="font-black text-xl text-slate-800 font-mono">
                      <MaskedValue value={c.revPerContent} privacyMode={privacyMode} format={formatCurrency} />
                   </span>
                </div>
              </div>

              {unitGap < 0 ? (
                <div className="text-xs text-rose-700 flex items-start gap-3 bg-white p-4 rounded-xl border border-rose-100 shadow-sm">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                  <div>
                    <span className="font-bold block text-sm mb-1">Prejuízo de <MaskedValue value={Math.abs(unitGap)} privacyMode={privacyMode} format={formatCurrency} /> por item.</span>
                    <span className="opacity-80 leading-relaxed">Abaixo da margem ideal. Sugerido reajuste de contrato.</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-emerald-700 flex items-start gap-3 bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
                  <UserCheck size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                  <div>
                    <span className="font-bold block text-sm mb-1">Lucro de <MaskedValue value={unitGap} privacyMode={privacyMode} format={formatCurrency} /> acima da meta.</span>
                    <span className="opacity-80 leading-relaxed">Contrato saudável. Excelente performance.</span>
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
  const [isPrivacyMode, setIsPrivacyMode] = useState(true); 
  
  const [allClients, setAllClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [allCosts, setAllCosts] = useState<CostData[]>(INITIAL_COSTS);

  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[1]); 
  const [selectedStatus, setSelectedStatus] = useState<string>('Todos');
  const [selectedClient, setSelectedClient] = useState<string>('Todos');
  
  const [selectedDetailClient, setSelectedDetailClient] = useState<any | null>(null);
  const [selectedCostItem, setSelectedCostItem] = useState<CostData | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2200); 
    return () => clearTimeout(timer);
  }, []);

  const [currentMonthName, currentYear] = selectedMonth.split('/');
  const availableYears = AVAILABLE_YEARS;
  const uniqueClients = ['Todos', ...Array.from(new Set(allClients.map(c => c.Cliente)))];

  const monthlyMetrics = useMemo(() => {
    const clients = allClients.filter(c => c.Mes_Referencia === selectedMonth);
    const costs = allCosts.filter(c => c.Mes_Referencia === selectedMonth && c.Ativo_no_Mes);

    const opCosts = costs.filter(c => !isNonOperationalCost(c.Tipo_Custo, c.Tipo_Custo));
    const nonOpCosts = costs.filter(c => isNonOperationalCost(c.Tipo_Custo, c.Tipo_Custo));
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
  }, [selectedMonth, allClients, allCosts]);

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

  const annualData = useMemo(() => {
    const dataMonths = Array.from(new Set(allClients.map(c => c.Mes_Referencia)));
    if (!dataMonths.includes(selectedMonth)) dataMonths.push(selectedMonth);
    
    const sortedMonths = dataMonths.sort((a,b) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        if (ya !== yb) return parseInt(ya) - parseInt(yb);
        return STANDARD_MONTHS.indexOf(ma) - STANDARD_MONTHS.indexOf(mb);
    });

    const trend = sortedMonths.map(month => {
      const mClients = allClients.filter(c => c.Mes_Referencia === month);
      const mCosts = allCosts.filter(c => c.Mes_Referencia === month && c.Ativo_no_Mes);
      
      const totalCost = mCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);
      const revenue = mClients.reduce((sum, c) => sum + c.Receita_Liquida_Apos_Imposto_BRL, 0);
      const profit = revenue - totalCost;
      const margin = revenue !== 0 ? profit / revenue : 0;

      return { month, revenue, cost: totalCost, profit, margin };
    });

    const clientMap = new Map();
    allClients.forEach(c => {
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
  }, [allClients, allCosts, selectedMonth]);

  const detailedAlerts = useMemo(() => {
    const alerts: any[] = [];
    
    annualData.trend.forEach(m => {
        if (m.margin < 0 && m.revenue > 0) {
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

    const costMap = new Map();
    annualData.trend.forEach(trend => {
       const mCosts = allCosts.filter(c => c.Mes_Referencia === trend.month && c.Ativo_no_Mes && !isNonOperationalCost(c.Tipo_Custo, c.Tipo_Custo));
       const mClients = allClients.filter(c => c.Mes_Referencia === trend.month);
       
       const totalOpCost = mCosts.reduce((s, c) => s + c.Valor_Mensal_BRL, 0);
       const totalDelivered = mClients.reduce((s, c) => s + c.Conteudos_Entregues, 0);
       const unitCost = totalDelivered > 0 ? totalOpCost / totalDelivered : 0;
       costMap.set(trend.month, unitCost);
    });

    allClients.forEach(c => {
       const unitCost = costMap.get(c.Mes_Referencia) || 0;
       const allocatedCost = c.Conteudos_Entregues * unitCost;
       const profit = c.Receita_Liquida_Apos_Imposto_BRL - allocatedCost;
       
       if (profit < 0 && c.Conteudos_Entregues > 0) {
          alerts.push({
            type: 'warning',
            title: 'Cliente com Prejuízo',
            subject: c.Cliente,
            value: formatCurrency(profit),
            desc: `Registrado em ${c.Mes_Referencia}. Receita inferior ao custo operacional de entrega (${c.Conteudos_Entregues} un).`,
            icon: TrendingDown,
            isHistorical: c.Mes_Referencia !== selectedMonth
          });
       }
    });

    return alerts.sort((a,b) => {
        if(a.type === 'critical' && b.type !== 'critical') return -1;
        if(a.type !== 'critical' && b.type === 'critical') return 1;
        return 0;
    });
  }, [annualData, selectedMonth, allClients, allCosts]);

  const handleApplyChanges = (newClients: ClientData[], newCosts: CostData[]) => {
      setAllClients(newClients);
      setAllCosts(newCosts);
  };

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="min-h-screen text-slate-800 selection:bg-indigo-100 flex flex-col">
      <ClientDetailModal 
        client={selectedDetailClient} 
        onClose={() => setSelectedDetailClient(null)} 
        privacyMode={isPrivacyMode}
      />
      
      {/* HEADER GLASS */}
      <header className="fixed top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Top Row: Branding & Filters */}
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            
            {/* Brand & Privacy Toggle */}
            <div className="flex items-center gap-4 self-start md:self-auto">
              <div className="h-11 w-11 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-xl shadow-slate-900/20 transform hover:scale-105 transition-transform cursor-pointer border border-white/20">
                Z
              </div>
              <div>
                <div className="flex items-center gap-3">
                   <h1 className="text-xl font-extrabold text-slate-900 leading-none tracking-tight">BI Financeiro</h1>
                   <button 
                     onClick={() => setIsPrivacyMode(!isPrivacyMode)}
                     className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 transition-colors"
                     title={isPrivacyMode ? "Mostrar valores" : "Esconder valores"}
                   >
                     {isPrivacyMode ? <EyeOff size={18} strokeWidth={2.5} /> : <Eye size={18} strokeWidth={2.5} />}
                   </button>
                </div>
                <p className="text-xs text-slate-500 font-semibold tracking-wide mt-0.5">Dashboard Executivo v2.0</p>
              </div>
            </div>

            {/* Global Filters - Pilled & Floated */}
            <div className="flex flex-wrap md:flex-nowrap items-center justify-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white/60 shadow-inner w-full md:w-auto backdrop-blur-md">
                {/* Month Selector */}
                <div className="relative group flex-1 md:flex-none">
                  <select 
                    value={currentMonthName}
                    onChange={(e) => setSelectedMonth(`${e.target.value}/${currentYear}`)}
                    className="w-full md:w-auto appearance-none bg-transparent text-sm font-bold text-slate-700 border-none focus:ring-0 cursor-pointer outline-none pl-3 pr-8 py-2 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    {STANDARD_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                
                <div className="hidden md:block h-5 w-px bg-slate-200"></div>

                {/* Year Selector */}
                <div className="relative group flex-1 md:flex-none">
                  <select 
                    value={currentYear}
                    onChange={(e) => setSelectedMonth(`${currentMonthName}/${e.target.value}`)}
                    className="w-full md:w-auto appearance-none bg-transparent text-sm font-bold text-slate-700 border-none focus:ring-0 cursor-pointer outline-none pl-3 pr-8 py-2 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>

                <div className="hidden md:block h-5 w-px bg-slate-200"></div>

                {/* Client Selector */}
                <div className="relative group flex-auto md:flex-none min-w-[140px]">
                  <select 
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className="w-full md:w-auto appearance-none bg-transparent text-sm font-bold text-indigo-900 border-none focus:ring-0 cursor-pointer outline-none pl-3 pr-8 py-2 rounded-xl hover:bg-white/80 transition-colors"
                  >
                    {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                </div>

                <div className="hidden md:block h-5 w-px bg-slate-200"></div>

                {/* Config Shortcut */}
                <button 
                  onClick={() => setActiveTab('settings')}
                  className={`p-2 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
                  title="Ir para Configurações"
                >
                   <Settings size={18} />
                </button>
            </div>
          </div>

          {/* Bottom Row: Tabs */}
          <div className="flex overflow-x-auto space-x-2 pb-5 pt-2 no-scrollbar mask-gradient-right">
            <TabButton id="executive" label="Visão Mensal" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="roi" label="ROI & Mercado" icon={Target} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="annual" label="Visão Anual" icon={History} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="clients" label="Clientes" icon={Users} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="costs" label="Custos" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="alerts" label="Alertas" icon={ShieldAlert} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="settings" label="Configurações" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main 
        key={activeTab}
        className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-[185px] md:mt-[170px] space-y-8 pb-24 animate-fade-in w-full"
      >
        
        {/* --- TAB 1: EXECUTIVE --- */}
        {activeTab === 'executive' && (
          <div className="space-y-8">
            {/* KPI GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard title="Receita Bruta" value={viewData.grossRevenue} colorCondition="always-neutral" icon={<DollarSign className="text-slate-900" />} privacyMode={isPrivacyMode} />
              <KPICard title="Receita Líquida" value={viewData.netRevenue} icon={<Activity className="text-emerald-500" />} privacyMode={isPrivacyMode} />
              <KPICard title="Custo Operacional" value={viewData.displayedCost} colorCondition="always-neutral" icon={<TrendingDown className="text-slate-500" />} privacyMode={isPrivacyMode} />
              <KPICard title="Resultado Líquido" value={viewData.displayedProfit} colorCondition="positive-green" icon={<Trophy className="text-yellow-500" />} privacyMode={isPrivacyMode} />
            </div>

            {/* CHARTS ROW 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-panel p-6 rounded-[32px]">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">Performance Financeira</h3>
                    <div className="text-[10px] font-bold px-2.5 py-1 bg-slate-100/80 rounded-full text-slate-500 border border-slate-200">Lucro vs Prejuízo</div>
                 </div>
                 <div className="w-full">
                   <ProfitLossChart clients={viewData.clients} privacyMode={isPrivacyMode} />
                 </div>
              </div>

              <div className="glass-panel p-6 rounded-[32px] flex flex-col">
                 <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-4">Eficiência de Entrega</h3>
                 <div className="flex-1 w-full">
                   <EfficiencyChart clients={viewData.clients} privacyMode={isPrivacyMode} />
                 </div>
              </div>
            </div>

            {/* INTERACTIVE TABLE */}
            <div className="glass-panel rounded-[32px] overflow-hidden border border-white/60 shadow-xl shadow-slate-200/40">
                <div className="px-8 py-6 bg-white/40 backdrop-blur-md border-b border-white/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shadow-sm"><Scale size={20} /></div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Análise de Contratos</h3>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">Gap Mensal considera margem de 20%</p>
                    </div>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-200/60 backdrop-blur-sm sticky top-0 z-10">
                      <tr>
                        <th className="px-8 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cliente</th>
                        <th className="px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contrato</th>
                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Receita Real</th>
                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-indigo-50/30">Gap Mensal</th>
                        <th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white/30">
                      {viewData.clients.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium">
                             Nenhum dado encontrado para {selectedMonth}. Vá em <strong>Configurações</strong> para adicionar.
                          </td>
                        </tr>
                      ) : (
                        [...viewData.clients].sort((a,b) => a.priceGap - b.priceGap).map(c => {
                           const isUnderPriced = c.priceGap < 0;
                           const gapPercent = c.idealRevenueBasedOnContract > 0 ? Math.abs(c.priceGap / c.idealRevenueBasedOnContract) : 0;
                           let statusBadge = <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100/60 text-emerald-700 border border-emerald-100">Saudável</span>;
                           
                           if (isUnderPriced) {
                              if (gapPercent > 0.3) statusBadge = <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100/60 text-rose-700 border border-rose-100">Crítico</span>;
                              else if (gapPercent > 0.1) statusBadge = <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100/60 text-amber-700 border border-amber-100">Atenção</span>;
                           }
  
                           return (
                            <tr 
                              key={c.id} 
                              onClick={() => setSelectedDetailClient(c)}
                              className="group hover:bg-indigo-50/10 cursor-pointer transition-colors"
                            >
                              <td className="px-8 py-5">
                                <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{c.Cliente}</div>
                                {c.Status_Cliente === 'Inativo' && <div className="text-[10px] text-rose-500 font-bold mt-0.5">Inativo</div>}
                              </td>
                              <td className="px-6 py-5 text-center text-sm font-semibold text-slate-600">{c.Conteudos_Contratados}</td>
                              <td className="px-6 py-5 text-right text-sm font-bold text-slate-700 font-mono">
                                <MaskedValue value={c.Receita_Liquida_Apos_Imposto_BRL} privacyMode={isPrivacyMode} format={formatCurrency} />
                              </td>
                              <td className="px-6 py-5 text-right text-sm bg-indigo-50/20 group-hover:bg-indigo-50/40 transition-colors">
                                <span className={`font-bold font-mono ${c.priceGap < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                  {c.priceGap > 0 ? '+' : ''}
                                  <MaskedValue value={c.priceGap} privacyMode={isPrivacyMode} format={formatCurrency} />
                                </span>
                              </td>
                              <td className="px-6 py-5 text-right">{statusBadge}</td>
                              <td className="px-6 py-5 text-right text-slate-300 group-hover:text-indigo-400">
                                 <MoreHorizontal size={18} />
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
                <div className="glass-panel p-10 rounded-[32px] text-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                   <div className="relative z-10">
                     <h3 className="text-slate-400 font-bold uppercase tracking-widest mb-6 flex items-center justify-center gap-2 text-xs">
                       <Target size={16} /> ROI Agência
                     </h3>
                     <div className={`text-7xl font-black mb-4 tracking-tight ${viewData.roi >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                       <MaskedValue value={viewData.roi} privacyMode={isPrivacyMode} format={formatPercent} />
                     </div>
                     <p className="text-slate-500 max-w-sm mx-auto text-sm font-medium">
                       Eficiência sobre capital investido.
                     </p>
                   </div>
                </div>

                <div className="glass-panel p-10 rounded-[32px] text-center">
                   <h3 className="text-slate-400 font-bold uppercase tracking-widest mb-6 flex items-center justify-center gap-2 text-xs">
                     <Users size={16} /> Eficiência (LER)
                   </h3>
                   <div className={`text-7xl font-black mb-4 tracking-tight ${viewData.ler >= 3 ? 'text-emerald-500' : 'text-amber-500'}`}>
                     <MaskedValue value={viewData.ler} privacyMode={isPrivacyMode} format={(v) => v.toFixed(2) + 'x'} />
                   </div>
                   <p className="text-slate-500 text-sm font-medium">
                     Faturamento por real gasto em equipe.
                   </p>
                </div>
             </div>
             
             {/* Benchmark Table */}
             <div className="glass-panel rounded-[32px] overflow-hidden p-10">
                <h3 className="text-xl font-bold text-slate-800 mb-8">Benchmarks de Mercado</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { label: 'Margem Líquida', value: viewData.margin, target: 0.20, format: formatPercent },
                      { label: 'Eficiência LER', value: viewData.ler, target: 3.0, format: (v: number) => v.toFixed(2) + 'x' },
                      { label: 'Custo Operacional', value: monthlyMetrics.totalOpCost / (viewData.netRevenue || 1), target: 0.50, format: formatPercent, reverse: true }
                    ].map((item, idx) => {
                      const isGood = item.reverse ? item.value <= item.target : item.value >= item.target;
                      return (
                        <div key={idx} className="bg-white/50 rounded-3xl p-8 border border-white/60 text-center shadow-sm">
                           <div className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-3">{item.label}</div>
                           <div className={`text-4xl font-black mb-4 ${isGood ? 'text-emerald-600' : 'text-rose-500'}`}>
                             <MaskedValue value={item.value} privacyMode={isPrivacyMode} format={item.format} />
                           </div>
                           <div className="text-[10px] font-bold text-slate-500 bg-slate-100/80 inline-block px-3 py-1.5 rounded-full border border-slate-200">
                             Meta: {item.reverse ? '<' : '>'}{item.format(item.target)}
                           </div>
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
             <div className="glass-panel p-8 rounded-[32px] shadow-lg shadow-slate-200/50">
                <h2 className="text-2xl font-bold text-slate-900 mb-8">Performance Anual Acumulada</h2>
                <div className="w-full">
                  <TrendChart data={annualData.trend} privacyMode={isPrivacyMode} />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <KPICard title="Total Acumulado (Liq)" value={annualData.totalAnnualRevenue} icon={<History className="text-indigo-500" />} privacyMode={isPrivacyMode} />
               <KPICard title="Custos Totais" value={annualData.totalAnnualCost} colorCondition="always-neutral" privacyMode={isPrivacyMode} />
               <KPICard title="Lucro Acumulado" value={annualData.totalAnnualProfit} colorCondition="positive-green" privacyMode={isPrivacyMode} />
             </div>
          </div>
        )}

        {/* --- TAB 4: CLIENTS --- */}
        {activeTab === 'clients' && (
          <div className="space-y-6">
             <div className="glass-panel p-8 rounded-[32px] mb-6">
                 <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-slate-800">Projeção Real vs Ideal</h3>
                      <p className="text-sm text-slate-500 mt-1">Comparativo entre a receita atual e a meta de 20% de margem</p>
                    </div>
                 </div>
                 <div className="w-full h-[400px]">
                   <RealVsIdealChart clients={viewData.clients} privacyMode={isPrivacyMode} />
                 </div>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
               <div className="glass-panel p-8 rounded-[32px]">
                 <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-6">Pareto de Receita (LTV)</h3>
                 <div className="w-full">
                   <ParetoChart data={annualData.ltvData.map(c => ({...c, Receita_Liquida_Apos_Imposto_BRL: c.TotalRevenue}))} privacyMode={isPrivacyMode} />
                 </div>
               </div>
               <div className="glass-panel p-8 rounded-[32px]">
                 <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-6">Eficiência de Receita</h3>
                 <div className="w-full">
                   <ScatterRevContent data={annualData.ltvData.map(c => ({...c, Receita_Liquida_Apos_Imposto_BRL: c.TotalRevenue, Conteudos_Entregues: c.TotalDelivered, profit: 1}))} privacyMode={isPrivacyMode} />
                 </div>
               </div>
             </div>
          </div>
        )}

        {/* --- TAB 5: COSTS --- */}
        {activeTab === 'costs' && (
          <div className="space-y-6">
            <div className="glass-panel p-8 rounded-[32px] grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
               <div className="w-full">
                 <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest mb-6 text-center">Distribuição</h3>
                 <div className="h-[300px]">
                    <CostsPieChart 
                      costs={monthlyMetrics.costs} 
                      onSliceClick={(data) => setSelectedCostItem(data)}
                      privacyMode={isPrivacyMode}
                    />
                 </div>
                 <div className="text-center text-xs text-slate-400 font-medium mt-4">Clique em uma fatia para ver detalhes</div>
               </div>
               
               {selectedCostItem ? (
                 // --- DETAIL VIEW ---
                 <div className="space-y-5 animate-slide-in-right">
                   <div className="flex items-center gap-3 mb-2">
                     <button 
                       onClick={() => setSelectedCostItem(null)}
                       className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                     >
                       <ChevronLeft size={22} />
                     </button>
                     <span className="text-xs uppercase tracking-widest font-extrabold text-indigo-600">Detalhe do Custo</span>
                   </div>

                   <div className="bg-white/50 backdrop-blur-md p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
                       <PieIcon size={120} />
                     </div>
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item Selecionado</span>
                     <div className="text-2xl font-bold text-slate-800 mb-1">{selectedCostItem.Tipo_Custo}</div>
                     <div className="text-4xl font-black text-indigo-600 font-mono">
                        <MaskedValue value={selectedCostItem.Valor_Mensal_BRL} privacyMode={isPrivacyMode} format={formatCurrency} />
                     </div>
                   </div>

                   <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-200">
                       <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-5 flex items-center gap-2">
                          <Scale size={14} /> Contexto de Custos
                       </h4>
                       
                       <div className="space-y-5">
                          <div>
                              <div className="flex justify-between text-xs mb-1.5">
                                  <span className="font-bold text-slate-600">Operacional</span>
                                  <span className="text-slate-500 font-mono">
                                     <MaskedValue value={monthlyMetrics.totalOpCost} privacyMode={isPrivacyMode} format={formatCurrency} />
                                  </span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                   {!isNonOperationalCost(selectedCostItem.Tipo_Custo, selectedCostItem.Tipo_Custo) && (
                                      <div className="bg-indigo-500 h-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min((selectedCostItem.Valor_Mensal_BRL / monthlyMetrics.totalOpCost) * 100, 100)}%` }}></div>
                                   )}
                              </div>
                          </div>

                          <div>
                              <div className="flex justify-between text-xs mb-1.5">
                                  <span className="font-bold text-slate-600">Não Operacional</span>
                                  <span className="text-slate-500 font-mono">
                                     <MaskedValue value={monthlyMetrics.totalNonOpCost} privacyMode={isPrivacyMode} format={formatCurrency} />
                                  </span>
                              </div>
                              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                                   {isNonOperationalCost(selectedCostItem.Tipo_Custo, selectedCostItem.Tipo_Custo) && (
                                      <div className="bg-amber-500 h-full animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)]" style={{ width: `${Math.min((selectedCostItem.Valor_Mensal_BRL / monthlyMetrics.totalNonOpCost) * 100, 100)}%` }}></div>
                                   )}
                              </div>
                          </div>
                       </div>
                       
                       <div className="mt-5 pt-4 border-t border-slate-200/60 text-xs text-slate-500 flex justify-between">
                          <span className="font-medium">Total Geral:</span>
                          <span className="font-bold text-slate-800 font-mono">
                             <MaskedValue value={monthlyMetrics.totalCost} privacyMode={isPrivacyMode} format={formatCurrency} />
                          </span>
                       </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50/80 p-5 rounded-3xl border border-slate-200">
                         <div className="flex items-center gap-2 mb-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                           <Calendar size={14} /> Projeção Anual
                         </div>
                         <div className="text-lg font-bold text-slate-700 font-mono">
                           <MaskedValue value={selectedCostItem.Valor_Mensal_BRL * 12} privacyMode={isPrivacyMode} format={formatCurrency} />
                         </div>
                      </div>
                      
                      <div className="bg-amber-50 p-5 rounded-3xl border border-amber-100 col-span-2">
                        <div className="flex items-center gap-2 mb-2 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                           <ShieldAlert size={14} /> Análise de Risco
                        </div>
                        <p className="text-sm text-amber-800 leading-snug">
                         {isNonOperationalCost(selectedCostItem.Tipo_Custo, selectedCostItem.Tipo_Custo) 
                           ? `Este custo não contribui diretamente para a entrega. Se for recorrente e representar mais de 10% do total não operacional, considere renegociar.` 
                           : `Custo essencial para a operação. Reduções aqui podem impactar a qualidade da entrega. Monitore a eficiência do uso.`}
                        </p>
                      </div>
                   </div>
                 </div>
               ) : (
                 // --- SUMMARY VIEW (Default) ---
                 <div className="space-y-5 animate-fade-in">
                   <div className="bg-white/60 p-8 rounded-[32px] border border-white/60 shadow-sm backdrop-blur-md">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Custo Operacional Total</span>
                     <div className="text-4xl font-black text-slate-800 mt-2 font-mono tracking-tight">
                        <MaskedValue value={monthlyMetrics.totalOpCost} privacyMode={isPrivacyMode} format={formatCurrency} />
                     </div>
                     <div className="text-xs text-slate-500 mt-3 font-medium bg-slate-100 inline-block px-2 py-1 rounded-md">Base para cálculo de custo/hora</div>
                   </div>
                   <div className="bg-amber-50/60 p-8 rounded-[32px] border border-amber-100/60 backdrop-blur-md">
                     <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Extraordinários / Adm</span>
                     <div className="text-4xl font-black text-amber-700 mt-2 font-mono tracking-tight">
                        <MaskedValue value={monthlyMetrics.totalNonOpCost} privacyMode={isPrivacyMode} format={formatCurrency} />
                     </div>
                   </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* --- TAB 6: ALERTS (Redesigned) --- */}
        {activeTab === 'alerts' && (
           <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-4 px-2">Central de Alertas e Riscos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {detailedAlerts.length === 0 ? (
                   <div className="col-span-full p-16 bg-emerald-50/50 rounded-[40px] border border-emerald-100/60 text-center backdrop-blur-sm">
                      <div className="inline-flex p-6 bg-emerald-100 rounded-full text-emerald-600 mb-6 shadow-inner">
                        <Trophy size={40} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-2xl font-bold text-emerald-800 mb-2">Tudo Certo!</h3>
                      <p className="text-emerald-600/80 font-medium">Nenhum risco crítico identificado nos períodos analisados.</p>
                   </div>
                 ) : (
                   detailedAlerts.map((alert, idx) => (
                     <div key={idx} className={`relative p-8 rounded-[32px] border shadow-sm overflow-hidden group hover:-translate-y-1 transition-all duration-300 ${
                       alert.type === 'critical' ? 'bg-rose-50/80 border-rose-100' : 'bg-amber-50/80 border-amber-100'
                     }`}>
                        <div className={`absolute top-0 right-0 p-6 opacity-5 transform group-hover:scale-125 transition-transform duration-700 ${
                          alert.type === 'critical' ? 'text-rose-900' : 'text-amber-900'
                        }`}>
                          <alert.icon size={120} />
                        </div>
                        
                        <div className="relative z-10">
                          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide mb-6 ${
                            alert.type === 'critical' ? 'bg-rose-200/50 text-rose-800' : 'bg-amber-200/50 text-amber-800'
                          }`}>
                            {alert.type === 'critical' ? 'Crítico' : 'Atenção'}
                            {alert.isHistorical && <span className="ml-2 opacity-75">• Histórico</span>}
                          </div>
                          
                          <h3 className={`text-lg font-bold mb-1 ${
                            alert.type === 'critical' ? 'text-rose-900' : 'text-amber-900'
                          }`}>
                            {alert.title}
                          </h3>
                          <div className="text-xl font-bold mb-3 text-slate-800 opacity-80">{alert.subject}</div>
                          
                          <div className={`text-3xl font-black mb-5 font-mono tracking-tight ${
                            alert.type === 'critical' ? 'text-rose-600' : 'text-amber-600'
                          }`}>
                            <MaskedValue value={alert.value} privacyMode={isPrivacyMode} />
                          </div>
                          
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            {alert.desc}
                          </p>
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        )}

        {/* --- TAB 7: SETTINGS & AUDIT --- */}
        {activeTab === 'settings' && (
           <ConfigurationsPanel 
             allClients={allClients} 
             allCosts={allCosts} 
             months={MONTHS} 
             currentMonth={selectedMonth}
             onApplyChanges={handleApplyChanges}
             privacyMode={isPrivacyMode}
           />
        )}

      </main>
    </div>
  );
};

export default App;