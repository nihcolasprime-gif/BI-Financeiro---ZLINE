
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, DollarSign, Activity, 
  History, Users, TrendingDown, ArrowRight,
  Trophy, X, UserCheck, ChevronDown, Eye, EyeOff, Settings, AlertCircle
} from 'lucide-react';
import { ALL_CLIENTS as INITIAL_CLIENTS, ALL_COSTS as INITIAL_COSTS, MONTHS as INITIAL_MONTHS } from './constants';
import KPICard from './components/KPICard';
import { ConfigurationsPanel } from './components/ConfigurationsPanel';
import { 
  ProfitLossChart, TrendChart, ScatterRevContent, RealVsIdealChart, CostsPieChart 
} from './components/Charts';
import { formatCurrency, formatPercent } from './utils';
import { ClientData, CostData, GlobalSettings } from './types';

type TabType = 'executive' | 'annual' | 'clients' | 'costs' | 'settings';

const STORAGE_KEYS = {
  CLIENTS: 'zline_data_clients',
  COSTS: 'zline_data_costs',
  MONTHS: 'zline_data_months',
  SETTINGS: 'zline_data_settings'
};

const STANDARD_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  
  // Persistência robusta: Tenta carregar do LocalStorage ou usa os valores iniciais das constantes
  const [allClients, setAllClients] = useState<ClientData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });
  const [allCosts, setAllCosts] = useState<CostData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.COSTS);
    return saved ? JSON.parse(saved) : INITIAL_COSTS;
  });
  const [availableMonths, setAvailableMonths] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MONTHS);
    return saved ? JSON.parse(saved) : INITIAL_MONTHS;
  });
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : {
      taxRate: 0.10,
      targetMargin: 0.20,
      maxProductionCapacity: 140,
      allocationMethod: 'perDelivered'
    };
  });

  const [selectedMonth, setSelectedMonth] = useState<string>(availableMonths[availableMonths.length - 1]);

  // Efeito de persistência automática
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(allClients));
    localStorage.setItem(STORAGE_KEYS.COSTS, JSON.stringify(allCosts));
    localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(availableMonths));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [allClients, allCosts, availableMonths, settings]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // Lógica de cálculo centralizada (Brain)
  const brain = useMemo(() => {
    const months = [...availableMonths].sort((a,b) => {
      const [ma, ya] = a.split('/');
      const [mb, yb] = b.split('/');
      if (ya !== yb) return parseInt(ya) - parseInt(yb);
      return STANDARD_MONTHS.indexOf(ma) - STANDARD_MONTHS.indexOf(mb);
    });

    const monthlyMetrics = months.map(month => {
      const clients = allClients.filter(c => c.Mes_Referencia === month);
      const costs = allCosts.filter(c => c.Mes_Referencia === month && c.Ativo_no_Mes);
      
      const grossRevenue = clients.reduce((s, c) => s + (c.Receita_Mensal_BRL || 0), 0);
      const netRevenue = grossRevenue * (1 - settings.taxRate);
      const totalCost = costs.reduce((s, c) => s + (c.Valor_Mensal_BRL || 0), 0);
      const totalDelivered = clients.reduce((s, c) => s + (c.Conteudos_Entregues || 0), 0);
      const totalContracted = clients.reduce((s, c) => s + (c.Conteudos_Contratados || 0), 0);
      
      const costPerContent = totalDelivered > 0 ? totalCost / totalDelivered : 0;
      const idealPricePerContent = costPerContent / (1 - settings.targetMargin);
      
      const enrichedClients = clients.map(c => {
        const clientNetRev = c.Receita_Mensal_BRL * (1 - settings.taxRate);
        const allocatedCost = c.Conteudos_Entregues * costPerContent;
        const profit = clientNetRev - allocatedCost;
        return {
          ...c,
          netRevenue: clientNetRev,
          profit,
          idealRevenue: idealPricePerContent * c.Conteudos_Contratados
        };
      });

      return {
        month,
        grossRevenue,
        netRevenue,
        totalCost,
        totalDelivered,
        totalContracted,
        netResult: netRevenue - totalCost,
        margin: netRevenue !== 0 ? (netRevenue - totalCost) / netRevenue : 0,
        utilization: settings.maxProductionCapacity > 0 ? totalContracted / settings.maxProductionCapacity : 0,
        clients: enrichedClients,
        costs
      };
    });

    return { months, monthlyMetrics };
  }, [allClients, allCosts, availableMonths, settings]);

  const currentView = useMemo(() => {
    return brain.monthlyMetrics.find(m => m.month === selectedMonth) || brain.monthlyMetrics[brain.monthlyMetrics.length - 1];
  }, [brain, selectedMonth]);

  if (showSplash) return <SplashScreen />;

  return (
    <div className="min-h-screen text-slate-800 selection:bg-indigo-100 flex flex-col">
      <header className="fixed top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">Z</div>
              <div>
                <h1 className="text-xl font-black text-slate-900">BI Financeiro</h1>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Enterprise v3.0</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-white/50 p-1.5 rounded-2xl border border-white/60 shadow-inner">
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-sm font-bold border-none focus:ring-0 cursor-pointer px-4">
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <button onClick={() => setIsPrivacyMode(!isPrivacyMode)} className="p-2 rounded-xl text-slate-400 hover:bg-white transition-colors">
                {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <nav className="flex space-x-2 pb-3 no-scrollbar">
            <TabButton id="executive" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="clients" label="Contratos" icon={Users} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="costs" label="Custos" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="annual" label="Histórico" icon={History} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="settings" label="Configurações" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-44 pb-20 w-full animate-fade-in">
        {currentView ? (
          <>
            {activeTab === 'executive' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard title="Receita Bruta" value={currentView.grossRevenue} icon={<DollarSign />} privacyMode={isPrivacyMode} />
                  <KPICard title="Receita Líquida" value={currentView.netRevenue} icon={<Activity />} privacyMode={isPrivacyMode} />
                  <KPICard title="Total Despesas" value={currentView.totalCost} colorCondition="always-neutral" icon={<TrendingDown />} privacyMode={isPrivacyMode} />
                  <KPICard title="Resultado" value={currentView.netResult} colorCondition="positive-green" icon={<Trophy />} privacyMode={isPrivacyMode} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel p-8 rounded-[40px] border-none shadow-xl">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Performance por Cliente</h3>
                    <ProfitLossChart clients={currentView.clients} privacyMode={isPrivacyMode} />
                  </div>
                  <div className="glass-panel p-8 rounded-[40px] border-none shadow-xl flex flex-col justify-center text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Utilização de Capacidade</p>
                    <div className="text-6xl font-black text-slate-900 mb-2">{formatPercent(currentView.utilization)}</div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-6">
                      <div className="h-full bg-indigo-600 transition-all duration-700" style={{ width: `${Math.min(currentView.utilization * 100, 100)}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-500 font-bold">{currentView.totalContracted} conteúdos contratados de {settings.maxProductionCapacity} unidades disponíveis.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="space-y-6">
                <div className="glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-[10px] font-black text-slate-400 uppercase">
                        <th className="px-8 py-6">Cliente</th>
                        <th className="px-6 py-6 text-center">Entrega</th>
                        <th className="px-8 py-6 text-right">Faturamento</th>
                        <th className="px-8 py-6 text-right">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentView.clients.map(c => (
                        <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="px-8 py-6 font-bold text-slate-800">{c.Cliente}</td>
                          <td className="px-6 py-6 text-center text-sm font-black text-slate-500">{c.Conteudos_Entregues}/{c.Conteudos_Contratados}</td>
                          <td className="px-8 py-6 text-right font-mono font-bold text-slate-900">{isPrivacyMode ? '••••' : formatCurrency(c.Receita_Mensal_BRL)}</td>
                          <td className={`px-8 py-6 text-right font-mono font-bold ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{isPrivacyMode ? '••••' : formatCurrency(c.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="glass-panel p-8 rounded-[40px] shadow-xl"><ScatterRevContent data={currentView.clients} privacyMode={isPrivacyMode} /></div>
                   <div className="glass-panel p-8 rounded-[40px] shadow-xl"><RealVsIdealChart clients={currentView.clients.map(c => ({...c, idealRevenueBasedOnContract: c.idealRevenue}))} privacyMode={isPrivacyMode} /></div>
                </div>
              </div>
            )}

            {activeTab === 'costs' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase">
                          <th className="px-8 py-6">Descrição</th>
                          <th className="px-8 py-6 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {currentView.costs.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6 font-bold text-slate-800">{c.Tipo_Custo}</td>
                            <td className="px-8 py-6 text-right font-mono font-bold text-slate-900">{isPrivacyMode ? '••••' : formatCurrency(c.Valor_Mensal_BRL)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="glass-panel p-8 rounded-[40px] shadow-xl"><CostsPieChart costs={currentView.costs} privacyMode={isPrivacyMode} /></div>
                </div>
              </div>
            )}

            {activeTab === 'annual' && (
              <div className="glass-panel p-8 rounded-[40px] shadow-xl h-[500px]">
                <TrendChart data={brain.monthlyMetrics.map(m => ({ month: m.month, revenue: m.netRevenue, cost: m.totalCost, profit: m.netResult }))} privacyMode={isPrivacyMode} />
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
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <AlertCircle size={48} className="opacity-20 mb-4" />
            <p className="font-black uppercase tracking-widest text-sm">Sem dados disponíveis</p>
          </div>
        )}
      </main>
    </div>
  );
};

const TabButton = ({ id, label, icon: Icon, activeTab, onClick }: any) => {
  const isActive = activeTab === id;
  return (
    <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all ${isActive ? 'bg-slate-900 text-white shadow-xl translate-y-[-2px]' : 'text-slate-400 hover:bg-white'}`}>
      <Icon size={18} /> {label}
    </button>
  );
};

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center">
    <div className="text-center animate-pulse">
      <div className="h-20 w-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-5xl mx-auto mb-6">Z</div>
      <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px]">Iniciando Engine Financeiro</p>
    </div>
  </div>
);

export default App;
