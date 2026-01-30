
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
import { ALL_CLIENTS as INITIAL_CLIENTS, ALL_COSTS as INITIAL_COSTS, MONTHS as INITIAL_MONTHS } from './constants';
import KPICard from './components/KPICard';
import { ConfigurationsPanel } from './components/ConfigurationsPanel';
import { 
  ProfitLossChart, EfficiencyChart, CostsPieChart, 
  TrendChart, ParetoChart, ScatterRevContent, RealVsIdealChart 
} from './components/Charts';
import { formatCurrency, formatPercent } from './utils';
import { ClientData, CostData, GlobalSettings } from './types';

type TabType = 'executive' | 'roi' | 'annual' | 'clients' | 'costs' | 'alerts' | 'settings';

const STANDARD_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const ClientDetailModal = ({ client, onClose, privacyMode }: { client: any, onClose: () => void, privacyMode: boolean }) => {
  if (!client) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in px-4">
      <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-lg w-full space-y-6 relative border border-white/60">
        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400">
          <X size={18} />
        </button>
        <div className="flex items-center gap-4 mb-4">
          <div className="h-12 w-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
            <UserCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-800">{client.Cliente}</h3>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">{client.Mes_Referencia}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Lucro Estimado</p>
            <p className={`text-lg font-bold ${client.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {privacyMode ? '••••' : formatCurrency(client.profit)}
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Entregas</p>
            <p className="text-lg font-bold text-slate-800">{client.Conteudos_Entregues} / {client.Conteudos_Contratados}</p>
          </div>
        </div>
        
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl text-sm">Fechar</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [isPrivacyMode, setIsPrivacyMode] = useState(true);
  
  // PRIMARY PERSISTENT STATE
  const [allClients, setAllClients] = useState<ClientData[]>(INITIAL_CLIENTS);
  const [allCosts, setAllCosts] = useState<CostData[]>(INITIAL_COSTS);
  const [availableMonths, setAvailableMonths] = useState<string[]>(INITIAL_MONTHS);
  const [settings, setSettings] = useState<GlobalSettings>({
    taxRate: 0.10,
    targetMargin: 0.20,
    maxProductionCapacity: 140,
    allocationMethod: 'perDelivered'
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[availableMonths.length - 1]);
  const [selectedClient, setSelectedClient] = useState<string>('Todos');
  const [selectedDetailClient, setSelectedDetailClient] = useState<any | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // CENTRALIZED FORMULAS BRAIN
  const brain = useMemo(() => {
    const months = availableMonths.sort((a,b) => {
      const [ma, ya] = a.split('/');
      const [mb, yb] = b.split('/');
      if (ya !== yb) return parseInt(ya) - parseInt(yb);
      return STANDARD_MONTHS.indexOf(ma) - STANDARD_MONTHS.indexOf(mb);
    });

    const monthlyMetrics = months.map(month => {
      const clients = allClients.filter(c => c.Mes_Referencia === month);
      const costs = allCosts.filter(c => c.Mes_Referencia === month && c.Ativo_no_Mes);
      
      // Changed: Include revenue even if inactive, as long as it's recorded
      const grossRevenue = clients.reduce((s, c) => s + (c.Receita_Mensal_BRL || 0), 0);
      const netRevenue = grossRevenue * (1 - settings.taxRate);
      
      const opCosts = costs.filter(c => c.Categoria === 'Operacional' || (!c.Categoria && !c.Tipo_Custo.toLowerCase().includes('estorno') && !c.Tipo_Custo.toLowerCase().includes('contador')));
      const totalOpCost = opCosts.reduce((s, c) => s + c.Valor_Mensal_BRL, 0);
      const totalCost = costs.reduce((s, c) => s + c.Valor_Mensal_BRL, 0);
      
      const totalDelivered = clients.reduce((s, c) => s + (c.Conteudos_Entregues || 0), 0);
      const totalContracted = clients.reduce((s, c) => s + (c.Conteudos_Contratados || 0), 0);
      
      const costPerContent = totalDelivered > 0 ? totalOpCost / totalDelivered : 0;
      const idealPricePerContent = costPerContent / (1 - settings.targetMargin);
      
      const enrichedClients = clients.map(c => {
        const clientNetRev = c.Receita_Mensal_BRL * (1 - settings.taxRate);
        const allocatedCost = c.Conteudos_Entregues * costPerContent;
        const profit = clientNetRev - allocatedCost;
        const idealRev = idealPricePerContent * c.Conteudos_Contratados;
        return {
          ...c,
          netRevenue: clientNetRev,
          allocatedCost,
          profit,
          idealRevenue: idealRev,
          gap: clientNetRev - idealRev
        };
      });

      const netResult = netRevenue - totalCost;
      const margin = netRevenue !== 0 ? netResult / netRevenue : 0;
      const roi = totalCost > 0 ? netResult / totalCost : 0;
      const utilization = settings.maxProductionCapacity > 0 ? totalContracted / settings.maxProductionCapacity : 0;

      return {
        month,
        grossRevenue,
        netRevenue,
        totalCost,
        totalOpCost,
        totalDelivered,
        totalContracted,
        costPerContent,
        idealPricePerContent,
        netResult,
        margin,
        roi,
        utilization,
        clients: enrichedClients,
        costs
      };
    });

    return { months, monthlyMetrics };
  }, [allClients, allCosts, availableMonths, settings]);

  const currentView = useMemo(() => {
    const data = brain.monthlyMetrics.find(m => m.month === selectedMonth) || brain.monthlyMetrics[brain.monthlyMetrics.length - 1];
    if (selectedClient === 'Todos') return data;
    
    const clientData = data.clients.find(c => c.Cliente === selectedClient);
    if (!clientData) return data;

    return {
      ...data,
      grossRevenue: clientData.Receita_Mensal_BRL,
      netRevenue: clientData.netRevenue,
      totalOpCost: clientData.allocatedCost,
      totalCost: clientData.allocatedCost,
      netResult: clientData.profit,
      margin: clientData.netRevenue !== 0 ? clientData.profit / clientData.netRevenue : 0,
      clients: [clientData]
    };
  }, [brain, selectedMonth, selectedClient]);

  const uniqueClientsNames = ['Todos', ...Array.from(new Set(allClients.map(c => c.Cliente)))];

  if (showSplash) return <SplashScreen />;

  return (
    <div className="min-h-screen text-slate-800 selection:bg-indigo-100 flex flex-col">
      {selectedDetailClient && (
        <ClientDetailModal 
          client={currentView.clients.find(c => c.id === selectedDetailClient.id)} 
          onClose={() => setSelectedDetailClient(null)} 
          privacyMode={isPrivacyMode}
        />
      )}
      
      <header className="fixed top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-2 md:py-4 gap-3 md:gap-4">
            <div className="flex w-full md:w-auto items-center justify-between md:justify-start gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 md:h-11 md:w-11 bg-gradient-to-tr from-slate-900 to-slate-700 rounded-xl md:rounded-2xl flex items-center justify-center text-white font-bold text-lg md:text-xl shadow-xl border border-white/20">Z</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">BI Financeiro</h1>
                    <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400">
                      {isPrivacyMode ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="text-[10px] md:text-xs text-slate-500 font-semibold uppercase tracking-wider">Gestão Real v3.0</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-white/50 p-1 rounded-xl md:rounded-2xl border border-white/60 shadow-inner w-full md:w-auto backdrop-blur-md overflow-x-auto no-scrollbar">
              <div className="relative shrink-0 min-w-[140px]">
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-full appearance-none bg-transparent text-xs md:text-sm font-bold text-slate-700 border-none focus:ring-0 cursor-pointer pl-3 pr-8 py-2">
                  {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="h-4 w-px bg-slate-200"></div>
              <div className="relative flex-auto min-w-[120px]">
                <select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)} className="w-full appearance-none bg-transparent text-xs md:text-sm font-bold text-indigo-900 border-none focus:ring-0 cursor-pointer pl-3 pr-8 py-2">
                  {uniqueClientsNames.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
              </div>
              <button onClick={() => setActiveTab('settings')} className="p-2 rounded-xl text-slate-400 hover:bg-slate-200"><Settings size={16} /></button>
            </div>
          </div>

          <div className="flex overflow-x-auto space-x-2 pb-3 pt-1 no-scrollbar mask-gradient-right snap-x">
            <TabButton id="executive" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="annual" label="Histórico" icon={History} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="clients" label="Contratos" icon={Users} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="costs" label="Custos" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="settings" label="Configurações" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
          </div>
        </div>
      </header>

      <main key={activeTab} className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 mt-[150px] md:mt-[170px] space-y-6 md:space-y-8 pb-20 animate-fade-in w-full">
        {activeTab === 'executive' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard title="Receita Bruta" value={currentView.grossRevenue} colorCondition="always-neutral" icon={<DollarSign />} privacyMode={isPrivacyMode} />
              <KPICard title="Receita Líquida" value={currentView.netRevenue} icon={<Activity />} privacyMode={isPrivacyMode} />
              <KPICard title="Total Despesas" value={currentView.totalCost} colorCondition="always-neutral" icon={<TrendingDown />} privacyMode={isPrivacyMode} />
              <KPICard title="Resultado Líquido" value={currentView.netResult} colorCondition="positive-green" icon={<Trophy />} privacyMode={isPrivacyMode} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass-panel p-6 rounded-[32px]"><ProfitLossChart clients={currentView.clients} privacyMode={isPrivacyMode} /></div>
              <div className="glass-panel p-6 rounded-[32px] flex flex-col">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Ocupação da Agência</h3>
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="text-5xl font-black text-slate-800 mb-2">{formatPercent(currentView.utilization)}</div>
                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full transition-all duration-700" style={{ width: `${Math.min(currentView.utilization * 100, 100)}%` }}></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-4 font-medium">{currentView.totalContracted} conteúdos contratados de {settings.maxProductionCapacity} disponíveis.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'annual' && (
          <div className="space-y-6">
             <div className="glass-panel p-6 rounded-[32px] shadow-lg">
                <TrendChart data={brain.monthlyMetrics.map(m => ({ month: m.month, revenue: m.netRevenue, cost: m.totalCost, profit: m.netResult }))} privacyMode={isPrivacyMode} />
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <ConfigurationsPanel 
            allClients={allClients} 
            allCosts={allCosts} 
            months={availableMonths} 
            settings={settings}
            onUpdateClients={setAllClients}
            onUpdateCosts={setAllCosts}
            onUpdateSettings={setSettings}
            onUpdateMonths={setAvailableMonths}
            privacyMode={isPrivacyMode}
          />
        )}
      </main>

      <style>{`
        .SplashScreen-Logo { animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
      `}</style>
    </div>
  );
};

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col items-center justify-center animate-fade-out-delayed">
    <div className="relative h-28 w-28 bg-gradient-to-tr from-indigo-600 to-slate-900 rounded-3xl flex items-center justify-center shadow-2xl border border-indigo-400/20">
      <span className="text-white font-black text-6xl tracking-tighter">Z</span>
    </div>
    <div className="mt-8 text-center">
      <h1 className="text-3xl font-bold text-white tracking-tight mb-2">BI Financeiro</h1>
      <p className="text-slate-500 text-xs tracking-[0.2em] uppercase font-bold">Carregando Cérebro do Sistema...</p>
    </div>
  </div>
);

const TabButton = ({ id, label, icon: Icon, activeTab, onClick }: { id: TabType, label: string, icon: any, activeTab: TabType, onClick: (id: TabType) => void }) => {
  const isActive = activeTab === id;
  return (
    <button onClick={() => onClick(id)} className={`relative flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-2xl transition-all whitespace-nowrap snap-center ${isActive ? 'bg-slate-900 text-white shadow-xl' : 'bg-white/40 text-slate-500 hover:bg-white/80 hover:text-indigo-600'}`}>
      <Icon size={18} className={isActive ? 'text-indigo-300' : 'opacity-70'} />
      {label}
    </button>
  );
};

export default App;
