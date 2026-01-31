
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  LayoutDashboard, DollarSign, Activity, History, Users, TrendingDown,
  Trophy, Eye, EyeOff, Settings, AlertCircle, Search, X, 
  FileText, Calendar, Clock, ArrowUpRight, TrendingUp, Filter, Target, Repeat, BarChart3, Rocket, Wrench, Briefcase, Calculator, PieChart, Layers, RotateCcw
} from 'lucide-react';
import { INITIAL_CONTRACTS, INITIAL_MONTHLY_RESULTS, ALL_COSTS as INITIAL_COSTS, MONTHS as INITIAL_MONTHS, INITIAL_GROWTH_DATA, STANDARD_MONTHS } from './constants';
import KPICard from './components/KPICard';
import { ConfigurationsPanel } from './components/ConfigurationsPanel';
import { 
  ProfitLossChart, TrendChart, ScatterRevContent, RealVsIdealChart, CostsPieChart, OriginPieChart 
} from './components/Charts';
import { formatCurrency, formatPercent, sortMonths, getMonthComparableValue } from './utils';
import { ClientData, CostData, GlobalSettings, ClientContract, ClientMonthlyResult, MonthlyGrowthData } from './types';
import { calculateSimulation, SimulationOutput } from './utils/configAudit';

// Consolidação de Abas conforme solicitado
type TabType = 'executive' | 'growth_tools' | 'contracts_ltv' | 'fin_ops' | 'annual' | 'settings';
type StatusFilterType = 'Todos' | 'Ativo' | 'Inativo';

const STORAGE_KEYS = {
  CONTRACTS: 'zline_data_contracts',
  RESULTS: 'zline_data_monthly_results',
  COSTS: 'zline_data_costs',
  MONTHS: 'zline_data_months',
  GROWTH: 'zline_data_growth',
  SETTINGS: 'zline_data_settings',
};

// --- SUB-COMPONENTS FOR TOOLS ---

const MarkupCalculator = () => {
    const [custoHora, setCustoHora] = useState(50);
    const [horas, setHoras] = useState(10);
    const [imposto, setImposto] = useState(10); // %
    const [margemAlvo, setMargemAlvo] = useState(20); // %
    const [custosExtras, setCustosExtras] = useState(0);

    const custoBase = (custoHora * horas) + custosExtras;
    // Preço = Custo / (1 - (Imposto + Margem))
    // Cuidado com divisão por zero
    const divisor = 1 - ((imposto + margemAlvo) / 100);
    const precoSugerido = divisor > 0 ? custoBase / divisor : 0;
    const lucroBruto = precoSugerido - custoBase - (precoSugerido * (imposto / 100));

    return (
        <div className="glass-panel p-8 rounded-[40px] shadow-xl h-full">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Calculator size={18} className="text-indigo-600"/> Calculadora de Markup (Precificação)
            </h3>
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Custo Hora (R$)</label>
                          <input type="number" value={custoHora} onChange={e => setCustoHora(parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 block mb-1">Horas Estimadas</label>
                          <input type="number" value={horas} onChange={e => setHoras(parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                      </div>
                    </div>
                     <div>
                        <label className="text-xs font-bold text-slate-500 block mb-1">Custos Extras (Softwares/Freelas)</label>
                        <input type="number" value={custosExtras} onChange={e => setCustosExtras(parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Imposto (%)</label>
                            <input type="number" value={imposto} onChange={e => setImposto(parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 block mb-1">Margem Líquida (%)</label>
                            <input type="number" value={margemAlvo} onChange={e => setMargemAlvo(parseFloat(e.target.value) || 0)} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                        </div>
                    </div>
                </div>
                <div className="bg-indigo-900 text-white rounded-3xl p-6 flex flex-col justify-center gap-4 relative overflow-hidden mt-auto">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div>
                        <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mb-1">Preço Sugerido</p>
                        <p className="text-3xl font-black font-mono">{formatCurrency(precoSugerido)}</p>
                    </div>
                    <div className="h-px bg-white/20 w-full"></div>
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-indigo-300 text-[10px] font-bold uppercase">Custo Total</p>
                            <p className="text-sm font-bold">{formatCurrency(custoBase)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-indigo-300 text-[10px] font-bold uppercase">Lucro Projetado</p>
                            <p className="text-sm font-bold text-emerald-400">{formatCurrency(lucroBruto)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const ScenarioSimulator = ({ currentNetResult, currentRevenue, currentCost }: { currentNetResult: number, currentRevenue: number, currentCost: number }) => {
    const [priceVar, setPriceVar] = useState(0);
    const [costVar, setCostVar] = useState(0);
    const [churnVar, setChurnVar] = useState(0); // Simulating revenue loss

    const handleReset = () => {
        setPriceVar(0);
        setCostVar(0);
        setChurnVar(0);
    };

    const simulatedRevenue = currentRevenue * (1 + (priceVar / 100)) * (1 - (churnVar / 100));
    const simulatedCost = currentCost * (1 + (costVar / 100));
    const simulatedResult = simulatedRevenue - simulatedCost;
    const variation = simulatedResult - currentNetResult;

    // Small threshold to prevent -0,00 or tiny floating point errors
    const cleanVariation = Math.abs(variation) < 0.01 ? 0 : variation;

    return (
        <div className="glass-panel p-8 rounded-[40px] shadow-xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={18} className="text-emerald-600"/> Playground de Cenários
                </h3>
                {(priceVar !== 0 || costVar !== 0 || churnVar !== 0) && (
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-slate-600 bg-slate-100 px-2 py-1 rounded-lg transition-all hover:bg-slate-200"
                        title="Resetar Cenário"
                    >
                        <RotateCcw size={10} /> Reset
                    </button>
                )}
            </div>
            
            <div className="space-y-6 mb-8">
                <div>
                     <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500">Aumento de Preço Global</label>
                        <span className="text-xs font-black text-indigo-600">{priceVar > 0 ? '+' : ''}{priceVar}%</span>
                     </div>
                     <input type="range" min="-20" max="50" value={priceVar} onChange={e => setPriceVar(parseInt(e.target.value))} className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                </div>
                <div>
                     <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500">Variação de Custo Operacional</label>
                        <span className="text-xs font-black text-rose-600">{costVar > 0 ? '+' : ''}{costVar}%</span>
                     </div>
                     <input type="range" min="-20" max="50" value={costVar} onChange={e => setCostVar(parseInt(e.target.value))} className="w-full accent-rose-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                </div>
                 <div>
                     <div className="flex justify-between mb-2">
                        <label className="text-xs font-bold text-slate-500">Perda de Receita (Churn)</label>
                        <span className="text-xs font-black text-slate-600">{churnVar}%</span>
                     </div>
                     <input type="range" min="0" max="50" value={churnVar} onChange={e => setChurnVar(parseInt(e.target.value))} className="w-full accent-slate-500 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer" />
                </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-200 mt-auto">
                <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Resultado Simulado</p>
                    <p className={`text-xl font-black ${simulatedResult >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>{formatCurrency(simulatedResult)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Impacto</p>
                    <p className={`text-lg font-black ${cleanVariation >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {cleanVariation > 0 ? '+' : ''}{formatCurrency(cleanVariation)}
                    </p>
                </div>
            </div>
        </div>
    )
}

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

  const [growthData, setGrowthData] = useState<MonthlyGrowthData[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.GROWTH);
    return saved ? JSON.parse(saved) : INITIAL_GROWTH_DATA;
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
      manualCostPerContentOverride: 0,
      // Default Benchmarks
      benchmarks: {
        maxChurn: 0.05, // 5%
        minMargin: 0.20, // 20%
        minLtvCac: 3.0, // 3x
        safeCapacityLimit: 0.85 // 85%
      }
    };
    
    // Deep merge para garantir que benchmarks exista mesmo se carregar do localStorage antigo
    if (saved) {
       const parsed = JSON.parse(saved);
       return {
         ...defaultSettings,
         ...parsed,
         benchmarks: { ...defaultSettings.benchmarks, ...(parsed.benchmarks || {}) }
       };
    }
    return defaultSettings;
  });

  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Stable Sorted Months
  const sortedMonths = useMemo(() => sortMonths(availableMonths), [availableMonths]);
  
  // Reverse sorted for UX (Dropdown)
  const dropdownMonths = useMemo(() => [...sortedMonths].reverse(), [sortedMonths]);

  // Initialize selectedMonth safely after availableMonths is loaded
  useEffect(() => {
    if (!selectedMonth && dropdownMonths.length > 0) {
      setSelectedMonth(dropdownMonths[0]); // Select newest month default
    } else if (sortedMonths.length > 0 && !sortedMonths.includes(selectedMonth)) {
      // If current selected month was deleted
      setSelectedMonth(dropdownMonths[0]);
    }
  }, [dropdownMonths, selectedMonth, sortedMonths]);

  // Handle Month Switch with specific logic
  const handleMonthSwitch = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetMonth = e.target.value;
    if (availableMonths.includes(targetMonth)) {
      setSelectedMonth(targetMonth);
      // Optional: We can keep the search term or reset it. Keeping it is usually better for comparison.
    }
  }, [availableMonths]);

  // Persistência
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(contracts));
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(monthlyResults));
    localStorage.setItem(STORAGE_KEYS.COSTS, JSON.stringify(allCosts));
    localStorage.setItem(STORAGE_KEYS.MONTHS, JSON.stringify(availableMonths));
    localStorage.setItem(STORAGE_KEYS.GROWTH, JSON.stringify(growthData));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }, [contracts, monthlyResults, allCosts, availableMonths, growthData, settings]);

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

  // --- GROWTH METRICS CALCULATION ---
  const growthMetrics = useMemo(() => {
      if (!currentView) return null;
      
      const currentGrowthData = growthData.find(g => g.month === selectedMonth) || { adSpend: 0 };
      
      // Calculate New Clients in this Month
      const currentMonthComparable = getMonthComparableValue(selectedMonth);
      const newClientsCount = contracts.filter(c => {
          if (!c.Data_Inicio) return false;
          // Simple heuristic: if the contract started in this month
          // In real app, we might need more robust date parsing
          // Here we assume Data_Inicio is YYYY-MM-DD
          const startDate = new Date(c.Data_Inicio);
          // Construct month string from date to compare
          const startMonthName = STANDARD_MONTHS[startDate.getMonth()];
          const startYear = startDate.getFullYear();
          const startMonthComparable = getMonthComparableValue(`${startMonthName}/${startYear}`);
          return startMonthComparable === currentMonthComparable;
      }).length;

      const cac = newClientsCount > 0 ? currentGrowthData.adSpend / newClientsCount : 0;
      // LTV = Avg Ticket * Avg Retention. 
      // Note: We use the global Avg Retention, but current Month Avg Ticket
      const avgTicket = currentView.grossRevenue / Math.max(currentView.clients.filter(c => c.Status_Cliente === 'Ativo').length, 1);
      const ltv = avgTicket * brain.avgRetentionMonths;
      const ltvCacRatio = cac > 0 ? ltv / cac : 0;

      // Origin Distribution
      const originCounts = currentView.clients.reduce((acc, client) => {
          const origin = client.Origem || 'Indicação';
          acc[origin] = (acc[origin] || 0) + 1;
          return acc;
      }, {} as Record<string, number>);

      const originData = Object.entries(originCounts).map(([name, value]) => ({ name, value }));

      return {
          adSpend: currentGrowthData.adSpend,
          newClientsCount,
          cac,
          ltv,
          ltvCacRatio,
          originData
      };
  }, [currentView, growthData, selectedMonth, contracts, brain.avgRetentionMonths]);

  const getDaysUntilRenewal = (dateString?: string) => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) return null;
    
    const diffTime = targetDate.getTime() - new Date().getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // --- SHORTCUT HANDLER ---
  const handleShortcut = (tab: TabType) => {
     setActiveTab(tab);
     window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (showSplash) return <SplashScreen />;

  return (
    <div className="min-h-screen text-slate-800 selection:bg-indigo-100 flex flex-col">
      <header className="fixed top-0 w-full z-40 bg-white/70 backdrop-blur-xl border-b border-white/40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center py-4 gap-4">
            <div className="flex items-center gap-3 shrink-0 self-start md:self-auto">
              <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-500/20">Z</div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-black text-slate-900">BI Growth</h1>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Performance & Intelligence</p>
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

                <div className="flex items-center gap-2">
                  <div className="bg-white/60 backdrop-blur-md px-3 py-2 rounded-xl border border-white/60 shadow-sm hover:shadow-md transition-all group flex items-center gap-2">
                    <Calendar size={14} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                    <select value={selectedMonth} onChange={handleMonthSwitch} className="bg-transparent text-xs font-black text-slate-700 border-none focus:ring-0 cursor-pointer uppercase tracking-tight outline-none appearance-none">
                        {dropdownMonths.map(m => <option key={m} value={m}>{m}</option>)}
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
            <TabButton id="growth_tools" label="Estratégico" icon={Rocket} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="contracts_ltv" label="Contratos" icon={FileText} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="fin_ops" label="Financeiro" icon={DollarSign} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="annual" label="Histórico" icon={History} activeTab={activeTab} onClick={setActiveTab} />
            <TabButton id="settings" label="Config" icon={Settings} activeTab={activeTab} onClick={setActiveTab} />
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-48 pb-20 w-full animate-fade-in">
        {currentView ? (
          <>
            {activeTab === 'executive' && (
              <div className="space-y-8">
                {/* KPIs Topo */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <KPICard title="Receita Bruta" value={rawView?.grossRevenue || 0} icon={<DollarSign />} privacyMode={isPrivacyMode} onClick={() => handleShortcut('fin_ops')} />
                  <KPICard title="Churn Rate" value={rawView?.churn || 0} type="percent" colorCondition="alert-low" icon={<TrendingUp />} privacyMode={isPrivacyMode} onClick={() => handleShortcut('contracts_ltv')} />
                  <KPICard title="Retenção Média (Meses)" value={brain.avgRetentionMonths} type="number" colorCondition="positive-green" icon={<Clock />} privacyMode={isPrivacyMode} onClick={() => handleShortcut('contracts_ltv')} />
                  <KPICard title="Resultado Líquido" value={rawView?.netResult || 0} colorCondition="positive-green" icon={<Trophy />} privacyMode={isPrivacyMode} onClick={() => handleShortcut('fin_ops')} />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 glass-panel p-8 rounded-[40px] border-none shadow-xl">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><BarChart3 size={16}/> Performance Financeira</h3>
                    <ProfitLossChart clients={currentView.clients} privacyMode={isPrivacyMode} />
                  </div>
                  <div className="glass-panel p-8 rounded-[40px] border-none shadow-xl flex flex-col justify-center text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">LTV (Lifetime Value)</p>
                    <div className="text-5xl font-black text-slate-900 mb-2 tracking-tighter">
                       {isPrivacyMode ? '••••' : formatCurrency((rawView?.grossRevenue / Math.max(currentView.clients.filter(c => c.Status_Cliente === 'Ativo').length, 1)) * brain.avgRetentionMonths)}
                    </div>
                    <p className="text-xs text-slate-500 font-bold px-4 leading-relaxed">
                        Valor total estimado que cada cliente deixa na agência durante todo o contrato.
                    </p>
                    <button onClick={() => handleShortcut('growth_tools')} className="mt-6 mx-auto bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-black transition-colors">
                        Ver Estratégia
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* CONSOLIDATED TAB: GROWTH & TOOLS */}
            {activeTab === 'growth_tools' && growthMetrics && (
                <div className="space-y-8">
                     {/* KPIs de Growth */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <KPICard title="Investimento (Ads)" value={growthMetrics.adSpend} icon={<Target />} colorCondition="cost-warning" privacyMode={isPrivacyMode} />
                        <KPICard title="Novos Clientes" value={growthMetrics.newClientsCount} type="number" icon={<Users />} privacyMode={isPrivacyMode} />
                        <KPICard title="CAC (Custo Aquisição)" value={growthMetrics.cac} colorCondition="always-neutral" icon={<TrendingUp />} privacyMode={isPrivacyMode} />
                        <KPICard title="Ratio LTV:CAC" value={growthMetrics.ltvCacRatio} type="number" colorCondition="positive-green" icon={<Rocket />} privacyMode={isPrivacyMode} subtitle={growthMetrics.ltvCacRatio > 3 ? "Saudável (>3x)" : "Atenção"} />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                         {/* Origin Chart */}
                         <div className="lg:col-span-8 glass-panel p-8 rounded-[40px] shadow-xl">
                             <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2"><PieChart size={16}/> Origem dos Clientes</h3>
                             <OriginPieChart data={growthMetrics.originData} privacyMode={isPrivacyMode} />
                         </div>
                         
                         {/* Simulator & Calculator (Tools) */}
                         <div className="lg:col-span-4 flex flex-col gap-8">
                            <ScenarioSimulator 
                                currentNetResult={rawView?.netResult || 0} 
                                currentRevenue={rawView?.netRevenue || 0}
                                currentCost={rawView?.totalCost || 0}
                            />
                         </div>
                    </div>
                    
                    {/* Full Width Markup Calculator */}
                    <MarkupCalculator />
                </div>
            )}

            {/* CONSOLIDATED TAB: CONTRACTS & LTV */}
            {activeTab === 'contracts_ltv' && (
              <div className="space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <KPICard title="LTV Estimado" value={(rawView?.grossRevenue / Math.max(currentView.clients.filter(c => c.Status_Cliente === 'Ativo').length, 1)) * brain.avgRetentionMonths} icon={<Target />} privacyMode={isPrivacyMode} onClick={() => handleShortcut('growth_tools')} />
                    <KPICard title="Ticket Médio" value={rawView?.grossRevenue / Math.max(currentView.clients.filter(c => c.Status_Cliente === 'Ativo').length, 1)} icon={<DollarSign />} privacyMode={isPrivacyMode} />
                 </div>

                 {/* Real vs Ideal Chart */}
                 <div className="glass-panel p-8 rounded-[40px] border-none shadow-xl">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Target size={18} className="text-indigo-600"/> Potencial de Receita (Real vs Ideal)
                  </h3>
                  <div className="h-[350px]">
                    <RealVsIdealChart clients={currentView.clients.map(c => ({
                      ...c, 
                      idealRevenueBasedOnContract: c.Valor_Sugerido_Renovacao || c.idealRevenue
                    }))} privacyMode={isPrivacyMode} />
                  </div>
                </div>

                {/* Contracts Table */}
                <div className="glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-6">Cliente & Origem</th>
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
                                <div className="flex gap-2 items-center mt-1">
                                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">{c.Origem || 'Indicação'}</span>
                                    {c.Status_Cliente === 'Inativo' && <span className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold uppercase">Inativo</span>}
                                </div>
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
                                </div>
                              </td>
                              <td className="px-6 py-6 text-center">
                                <span className="inline-block w-8 py-1 bg-slate-100 rounded text-xs font-black text-slate-600">{c.Dia_Pagamento || '-'}</span>
                              </td>
                              <td className="px-6 py-6 text-right">
                                <span className="font-mono font-black text-slate-900">{isPrivacyMode ? '••••' : formatCurrency(c.Receita_Mensal_BRL)}</span>
                              </td>
                              <td className="px-8 py-6 text-right cursor-pointer" onClick={() => handleShortcut('growth_tools')} title="Ir para Calculadora">
                                <span className="text-emerald-600 font-bold text-xs bg-emerald-50 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">
                                    {isPrivacyMode ? '••••' : formatCurrency(c.Valor_Sugerido_Renovacao || 0)}
                                    <ArrowUpRight size={10} className="inline ml-1"/>
                                </span>
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

            {/* CONSOLIDATED TAB: FIN & OPS */}
            {activeTab === 'fin_ops' && (
              <div className="space-y-8">
                 {/* Operational Overview */}
                <div className="glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Resumo Operacional & Financeiro</h3>
                    </div>
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <th className="px-8 py-6">Cliente</th>
                        <th className="px-6 py-6 text-center">Entrega</th>
                        <th className="px-8 py-6 text-right">Faturamento</th>
                        <th className="px-8 py-6 text-right">Lucro/Prejuízo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {currentView.clients.length > 0 ? currentView.clients.map(c => (
                        <tr key={c.id} className="hover:bg-indigo-50/20 transition-colors">
                          <td className="px-8 py-6 font-bold text-slate-800">{c.Cliente}</td>
                          <td className="px-6 py-6 text-center text-sm font-black text-slate-500">
                             <span className={c.Conteudos_Entregues < c.Conteudos_Contratados ? "text-amber-500" : "text-emerald-500"}>
                                {c.Conteudos_Entregues}
                             </span>
                             <span className="text-slate-300 mx-1">/</span>
                             {c.Conteudos_Contratados}
                          </td>
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

                {/* Costs Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 glass-panel rounded-[40px] overflow-hidden border-none shadow-xl">
                    <div className="bg-slate-50 px-8 py-4 border-b border-slate-100">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Detalhamento de Custos</h3>
                    </div>
                    <table className="w-full text-left">
                      <thead className="bg-white">
                        <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-8 py-6">Descrição</th>
                          <th className="px-8 py-6 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {currentView.costs.length > 0 ? currentView.costs.map(c => (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-8 py-6 font-bold text-slate-800 flex items-center gap-2">
                                {c.Tipo_Custo}
                                <span className="text-[8px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded uppercase">{c.Categoria}</span>
                            </td>
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
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-8 text-center">Distribuição</h3>
                    <CostsPieChart costs={currentView.costs} privacyMode={isPrivacyMode} />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'annual' && (
              <div className="glass-panel p-8 rounded-[40px] shadow-xl h-[500px]">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <History size={18} className="text-indigo-600"/> Histórico Anual
                </h3>
                <TrendChart data={brain.monthlyMetrics.map(m => ({ month: m.month, revenue: m.netRevenue, cost: m.totalCost, profit: m.netResult }))} privacyMode={isPrivacyMode} />
              </div>
            )}

            {activeTab === 'settings' && (
              <ConfigurationsPanel 
                viewClients={currentView.clients} 
                contracts={contracts} 
                monthlyResults={monthlyResults} 
                allCosts={allCosts} 
                months={availableMonths} 
                settings={settings}
                growthData={growthData}
                selectedMonth={selectedMonth}
                onUpdateContracts={setContracts}
                onUpdateResults={setMonthlyResults}
                onUpdateCosts={setAllCosts}
                onUpdateSettings={setSettings}
                onUpdateMonths={setAvailableMonths}
                onUpdateGrowth={setGrowthData}
                privacyMode={isPrivacyMode}
                churn={rawView?.churn || 0}
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
    <button onClick={() => onClick(id)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shrink-0 ${isActive ? 'bg-slate-900 text-white shadow-xl translate-y-[-2px]' : 'text-slate-400 hover:bg-white/60 hover:shadow-sm'}`}>
      <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} /> {label}
    </button>
  );
};

const SplashScreen = () => (
  <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center">
    <div className="text-center animate-pulse">
      <div className="h-20 w-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white font-black text-5xl mx-auto mb-6 shadow-2xl shadow-indigo-500/50">Z</div>
      <p className="text-slate-500 font-bold uppercase tracking-[0.5em] text-[10px]">Iniciando Engine Financeiro</p>
    </div>
  </div>
);

export default App;
