
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, DollarSign, Activity, History, Users, TrendingDown,
  Trophy, Eye, EyeOff, Settings, AlertCircle, Search, X, 
  FileText, Calendar, Clock, ArrowUpRight, TrendingUp, Filter, Target, Repeat, BarChart3
} from 'lucide-react';
import { INITIAL_CONTRACTS, INITIAL_MONTHLY_RESULTS, ALL_COSTS as INITIAL_COSTS, MONTHS as INITIAL_MONTHS, STANDARD_MONTHS } from './constants';
import KPICard from './components/KPICard';
import { ConfigurationsPanel } from './components/ConfigurationsPanel';
import { 
  ProfitLossChart, TrendChart, ScatterRevContent, RealVsIdealChart, CostsPieChart 
} from './components/Charts';
import { formatCurrency, sortMonths } from './utils';
import { ClientData, CostData, GlobalSettings, ClientContract, ClientMonthlyResult } from './types';
import { calculateSimulation, SimulationOutput } from './utils/configAudit';

type TabType = 'executive' | 'annual' | 'clients' | 'costs' | 'settings' | 'contracts' | 'analysis';
type StatusFilterType = 'Todos' | 'Ativo' | 'Inativo';

const STORAGE_KEYS = {
  CONTRACTS: 'zline_data_contracts',
  RESULTS: 'zline_data_monthly_results',
  COSTS: 'zline_data_costs',
  MONTHS: 'zline_data_months',
  SETTINGS: 'zline_data_settings',
};

const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('executive');
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>('Todos');
  
  // --- STATE NORMALIZADO ---
  const [contracts, setContracts] = useState<ClientContract[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
    if (saved) return JSON.parse(saved);
    return INITIAL_CONTRACTS; 
  });

  const [monthlyResults, setMonthlyResults] = useState<ClientMonthlyResult[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.RESULTS);
    if (saved) return JSON.parse(saved);
    return INITIAL_MONTHLY_RESULTS;
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
    const defaultSettings: GlobalSettings = {
      taxRate: 0.10,
      targetMargin: 0.20,
      maxProductionCapacity: 140,
      allocationMethod: 'perDelivered',
      inflationFactor: 1,
      seasonalMultiplier: 1,
      tolerancePercentage: 0.05,
      oneTimeAdjustments: 0,
      manualCostPerContentOverride: 0
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Stable Sorted Months
  const sortedMonths = useMemo(() => sortMonths(availableMonths), [availableMonths]);

  // Initialize selectedMonth safely after availableMonths is loaded
  useEffect(() => {
    if (!selectedMonth && sortedMonths.length > 0) {
      setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
    } else if (sortedMonths.length > 0 && !sortedMonths.includes(selectedMonth)) {
      // If current selected month was deleted
      setSelectedMonth(sortedMonths[sortedMonths.length - 1]);
    }
  }, [sortedMonths, selectedMonth]);

  // Persistência
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(monthlyResults));
    localStorage.setItem(STORAGE_KEYS.COSTS, JSON.stringify(allCosts));
    localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(availableMonths));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [contracts, monthlyResults, allCosts, availableMonths, settings]);

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  // --- ENGINE INTEGRATION ---
  const brain = useMemo(() => {
    // Optimization: Index results by month to avoid O(N*M) lookups inside the loop
    const resultsByMonth = new Map<string, ClientMonthlyResult[]>();
    monthlyResults.forEach(r => {
      if (!resultsByMonth.has(r.Mes_Referencia)) {
        resultsByMonth.set(r.Mes_Referencia, []);
      }
      resultsByMonth.get(r.Mes_Referencia)?.push(r);
    });

    // 1. Run simulation for each month sequentially using stable sortedMonths
    const monthlyMetrics = sortedMonths.map((month, idx) => {
      const previousMonth = idx > 0 ? sortedMonths[idx - 1] : null;
      // Fast O(1) lookup
      const prevResults = previousMonth ? (resultsByMonth.get(previousMonth) || []) : [];
      
      const result = calculateSimulation(month, contracts, monthlyResults, allCosts, settings, prevResults);

      return {
        month,
        ...result.kpis,
        clients: result.clients, // View unificada
        costs: result.costs
      };
    });

    // 2. Smart Retention Calculation (Avg Duration of Active Contracts)
    let totalDurationMonths = 0;
    const activeContracts = contracts.filter(c => c.Status_Contrato === 'Ativo');
    const now = new Date();
    
    activeContracts.forEach(c => {
      if (c.Data_Inicio) {
        const start = new Date(c.Data_Inicio);
        if (!isNaN(start.getTime())) {
             // Ensure we don't calculate duration for future contracts
             if (start > now) return;

             // Diff in months
             const monthsDiff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
             
             // If Diff is 0 (started this month), it counts as 1 month of tenure
             totalDurationMonths += Math.max(1, monthsDiff + 1);
        }
      }
    });

    const avgRetentionMonths = activeContracts.length > 0 ? totalDurationMonths / activeContracts.length : 0;

    return { months: sortedMonths, monthlyMetrics, avgRetentionMonths };
  }, [contracts, monthlyResults, allCosts, sortedMonths, settings]);

  const rawView = useMemo(() => {
    return brain.monthlyMetrics.find(m => m.month === selectedMonth) || brain.monthlyMetrics[brain.monthlyMetrics.length - 1];
  }, [brain, selectedMonth]);

  const currentView = useMemo(() => {
    if (!rawView) return null;
    
    let filteredClients = rawView.clients;
    if (statusFilter !== 'Todos') {
      filteredClients = filteredClients.filter(c => c.Status_Cliente === statusFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filteredClients = filteredClients.filter(c => 
        c.Cliente.toLowerCase().includes(term) || 
        (c.Descricao_Servico && c.Descricao_Servico.toLowerCase().includes(term))
      );
    }

    return {
      ...rawView,
      clients: filteredClients,
      costs: searchTerm.trim() ? rawView.costs.filter(c => c.Tipo_Custo.toLowerCase().includes(searchTerm.toLowerCase())) : rawView.costs
    };
  }, [rawView, searchTerm, statusFilter]);

  const getDaysUntilRenewal = (dateString?: string) => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) return null;
    
    const diffTime = targetDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (showSplash) return <SplashScreen />;

  return (
    <div className="min-h-screen text-slate-800 selection:bg-indigo-100 flex flex-col">
      <header className="fixed top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl">Z</div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black text-slate-900">BI Financeiro</h1>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Enterprise v3.5 (Normalized)</p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="flex-1 max-w-md relative group">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                    <Search size={18} />
                </div>
                <input 
                    type="text" 
                    placeholder="Buscar..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-100/50 border-none rounded-2xl py-2.5 pl-11 pr-10 text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all outline-none"
                />
                {searchTerm && (
                    <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-300 hover:text-slate-600 transition-colors"
                    >
                    <X size={16} />
                    </button>
                )}
                </div>

                {/* FILTERS & DISPLAY CONTROLS - Separated for clarity */}
                <div className="flex items-center gap-2">
                  <div className="bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all group flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-transparent text-xs font-black text-slate-700 border-none focus:ring-0 cursor-pointer uppercase tracking-tight outline-none appearance-none">
                        {brain.months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all group flex items-center gap-2">
                    <Filter size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilterType)} className="bg-transparent text-xs font-black text-slate-700 border-none focus:ring-0 cursor-pointer uppercase tracking-tight outline-none appearance-none">
                        <option value="Todos">Todos</option>
                        <option value="Ativo">Ativos</option>
                        <option value="Inativo">Inativos</option>
                    </select>
                  </div>

                  <button 
                    onClick={() => setIsPrivacyMode(!isPrivacyMode)} 
                    className={`p-2.5 rounded-xl border shadow-sm transition-all ${isPrivacyMode ? 'bg-indigo-100 border-indigo-200 text-indigo-600' : 'bg-white/60 backdrop-blur-md border-white/60 text-slate-400 hover:text-slate-600 hover:shadow-md'}`}
                    title={isPrivacyMode ? "Exibir Valores" : "Ocultar Valores"}
                  >
                      {isPrivacyMode ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
            </div>
          </div>

          <nav className="flex space-x-2 pb-3 no-scrollbar overflow-x-auto">
            <TabButton id="executive" label="Dashboard" icon={LayoutDashboard} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="contracts" label="Contratos" icon={FileText} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="analysis" label="LTV & Ciclos" icon={BarChart3} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="clients" label="Operacional" icon={Users} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="costs" label="Custos" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="annual" label="Histórico" icon={History} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="settings" label="Config" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-48 pb-20 w-full animate-fade-in">
        {currentView ? (
          <>
            {activeTab === 'executive' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard title="Receita Bruta" value={rawView?.grossRevenue || 0} icon={<DollarSign />} privacyMode={isPrivacyMode} />
                  <KPICard title="Churn Rate" value={rawView?.churn || 0} type="percent" colorCondition="alert-low" icon={<TrendingUp />} privacyMode={isPrivacyMode} />
                  <KPICard title="Retenção Média (Meses)" value={brain.avgRetentionMonths} type="number" colorCondition="positive-green" icon={<Clock />} privacyMode={isPrivacyMode} />
                  <KPICard title="Resultado" value={rawView?.netResult || 0} colorCondition="positive-green" icon={<Trophy />} privacyMode={isPrivacyMode} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel p-8 rounded-[40px] border-none shadow-xl">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8">Performance Financeira</h3>
                    <ProfitLossChart clients={currentView.clients} privacyMode={isPrivacyMode} />
                  </div>
                  <div className="glass-panel p-8 rounded-[40px] border-none shadow-xl flex flex-col justify-center text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Saúde da Base (LTV Estimado)</p>
                    <div className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">
                       {isPrivacyMode ? '••••' : formatCurrency((rawView?.grossRevenue / Math.max(currentView.clients.filter(c => c.Status_Cliente === 'Ativo').length, 1)) * brain.avgRetentionMonths)}
                    </div>
                    <p className="text-xs text-slate-500 font-bold px-4">Projeção de faturamento total médio por cliente ao longo da permanência.</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'contracts' && (
              <div className="space-y-6">
                <div className="glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-6">Cliente & Serviço</th>
                          <th className="px-6 py-6">Vigência</th>
                          <th className="px-6 py-6 text-center">Pgto</th>
                          <th className="px-6 py-6 text-right">Receita Atual</th>
                          <th className="px-8 py-6 text-right">Sugestão Renovação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentView.clients.length > 0 ? currentView.clients.map(c => {
                          const daysLeft = getDaysUntilRenewal(c.Data_Renovacao);
                          return (
                            <tr key={c.id} className="hover:bg-indigo-50/20 transition-all group">
                              <td className="px-8 py-6">
                                <p className="font-black text-slate-900">{c.Cliente}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[200px]">{c.Descricao_Servico || 'Serviço não descrito'}</p>
                                {c.Status_Cliente === 'Inativo' && <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold uppercase mt-1 inline-block">Inativo</span>}
                              </td>
                              <td className="px-6 py-6">
                                {daysLeft !== null ? (
                                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                                    daysLeft < 0 ? 'bg-rose-100 text-rose-600' :
                                    daysLeft <= 30 ? 'bg-amber-100 text-amber-600 animate-pulse' :
                                    'bg-emerald-100 text-emerald-600'
                                  }`}>
                                    <Clock size={12}/> {daysLeft < 0 ? 'Expirado' : `${daysLeft} dias`}
                                  </div>
                                ) : <span className="text-[10px] font-bold text-slate-300 uppercase">Indefinido</span>}
                                <div className="mt-1 space-y-0.5">
                                   <p className="text-[9px] font-bold text-slate-400">Início: {c.Data_Inicio ? new Date(c.Data_Inicio).toLocaleDateString('pt-BR') : '--'}</p>
                                   <p className="text-[9px] font-bold text-slate-400">Renova: {c.Data_Renovacao ? new Date(c.Data_Renovacao).toLocaleDateString('pt-BR') : '--'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                <span className="inline-block w-8 py-1 bg-slate-100 rounded text-xs font-black text-slate-600">{c.Dia_Pagamento || '-'}</span>
                              </td>
                              <td className="px-6 py-6 text-right">
                                <span className="font-mono font-black text-slate-900">{isPrivacyMode ? '••••' : formatCurrency(c.Receita_Mensal_BRL)}</span>
                              </td>
                              <td className="px-8 py-6 text-right">
                                <span className="text-emerald-600 font-bold text-xs">{isPrivacyMode ? '••••' : formatCurrency(c.Valor_Sugerido_Renovacao || 0)}</span>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-bold text-sm italic">Nenhum contrato encontrado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analysis' && (
              <div className="space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <KPICard title="LTV (Valor de Vida)" value={(rawView?.grossRevenue / Math.max(currentView.clients.filter(c => c.Status_Cliente === 'Ativo').length, 1)) * brain.avgRetentionMonths} icon={<Target />} privacyMode={isPrivacyMode} />
                  <KPICard title="Ticket Médio" value={rawView?.grossRevenue / Math.max(currentView.clients.filter(c => c.Status_Cliente === 'Ativo').length, 1)} icon={<DollarSign />} privacyMode={isPrivacyMode} />
                </div>
                
                <div className="glass-panel p-8 rounded-[40px] border-none shadow-xl">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Target size={18} className="text-indigo-600"/> Análise de Valores Ideais vs Realizados
                  </h3>
                  <div className="h-[350px]">
                    <RealVsIdealChart clients={currentView.clients.map(c => ({
                      ...c, 
                      idealRevenueBasedOnContract: c.Valor_Sugerido_Renovacao || c.idealRevenue
                    }))} privacyMode={isPrivacyMode} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'clients' && (
              <div className="space-y-6">
                <div className="glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-6">Cliente</th>
                        <th className="px-6 py-6 text-center">Entrega</th>
                        <th className="px-8 py-6 text-right">Faturamento</th>
                        <th className="px-8 py-6 text-right">Resultado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentView.clients.length > 0 ? currentView.clients.map(c => (
                        <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="px-8 py-6 font-bold text-slate-800">{c.Cliente}</td>
                          <td className="px-6 py-6 text-center text-sm font-black text-slate-500">{c.Conteudos_Entregues}/{c.Conteudos_Contratados}</td>
                          <td className="px-8 py-6 text-right font-mono font-bold text-slate-900">{isPrivacyMode ? '••••' : formatCurrency(c.Receita_Mensal_BRL)}</td>
                          <td className={`px-8 py-6 text-right font-mono font-bold ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{isPrivacyMode ? '••••' : formatCurrency(c.profit || 0)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-bold text-sm">Nenhum cliente encontrado.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'costs' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-6">Descrição</th>
                          <th className="px-8 py-6 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {currentView.costs.length > 0 ? currentView.costs.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6 font-bold text-slate-800">{c.Tipo_Custo}</td>
                            <td className="px-8 py-6 text-right font-mono font-bold text-slate-900">{isPrivacyMode ? '••••' : formatCurrency(c.Valor_Mensal_BRL)}</td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={2} className="px-8 py-12 text-center text-slate-400 font-bold text-sm">Nenhuma despesa encontrada.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="glass-panel p-8 rounded-[40px] shadow-xl">
                    <CostsPieChart costs={currentView.costs} privacyMode={isPrivacyMode} />
                  </div>
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
                viewClients={currentView.clients} // Passamos a View para renderização
                contracts={contracts} // Store normalizado
                monthlyResults={monthlyResults} // Store normalizado
                allCosts={allCosts} 
                months={availableMonths} 
                settings={settings}
                selectedMonth={selectedMonth}
                onUpdateContracts={setContracts}
                onUpdateResults={setMonthlyResults}
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
    <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shrink-0 ${isActive ? 'bg-slate-900 text-white shadow-xl translate-y-[-2px]' : 'text-slate-400 hover:bg-white'}`}>
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
