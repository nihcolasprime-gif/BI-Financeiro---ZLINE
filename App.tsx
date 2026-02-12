import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, Lock, Unlock, TrendingUp, DollarSign, 
  Wallet, PieChart, AlertCircle, Calendar 
} from 'lucide-react';

// Tipos e Constantes
import { 
  ClientContract, ClientMonthlyResult, CostData, 
  GlobalSettings, MonthlyGrowthData 
} from './types';
import { MONTHS, INITIAL_CONTRACTS, INITIAL_MONTHLY_RESULTS, ALL_COSTS, INITIAL_GROWTH_DATA } from './constants';
import { calculateSimulation } from './utils/configAudit';

// Banco de Dados
import { fetchDashboardData } from './database';

// Componentes
import KPICard from './components/KPICard';
import { FinancialCharts } from './components/Charts';
import { ConfigurationsPanel } from './components/ConfigurationsPanel';

function App() {
  // --- ESTADOS GLOBAIS ---
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[0]); // Pega o mês mais recente
  const [availableMonths, setAvailableMonths] = useState<string[]>(MONTHS);

  // Dados do Sistema
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [monthlyResults, setMonthlyResults] = useState<ClientMonthlyResult[]>([]);
  const [costs, setCosts] = useState<CostData[]>([]);
  const [growthData, setGrowthData] = useState<MonthlyGrowthData[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({
    taxRate: 0.10, // 10% Padrão
    targetMargin: 0.50, // 50% Margem
    maxProductionCapacity: 40,
    benchmarks: { maxChurn: 0.05, minMargin: 0.30, minLtvCac: 3 }
  });

  // --- 1. CARREGAMENTO INICIAL (SUPABASE) ---
  useEffect(() => {
    const loadData = async () => {
      const dbData = await fetchDashboardData();
      
      if (dbData) {
        // Se o banco retornou algo, usa. Se vier vazio [], usa vazio mesmo.
        setContracts(dbData.contracts);
        setMonthlyResults(dbData.monthlyResults);
        setCosts(dbData.costs);
        if (dbData.settings) setSettings(dbData.settings);
        setGrowthData(dbData.growthData);
      } else {
        // Fallback de segurança (muito raro cair aqui se o .env estiver certo)
        console.warn("Usando fallback local (Falha na conexão)");
        setContracts(INITIAL_CONTRACTS);
        setMonthlyResults(INITIAL_MONTHLY_RESULTS);
        setCosts(ALL_COSTS);
        setGrowthData(INITIAL_GROWTH_DATA);
      }
      setLoading(false);
    };

    loadData();
  }, []);

  // --- 2. CÁLCULOS EM TEMPO REAL ---

  // A. Simulação do Mês Selecionado (Para os Cards do Topo)
  const currentSimulation = useMemo(() => {
    return calculateSimulation(
      selectedMonth,
      contracts,
      monthlyResults,
      costs,
      settings,
      [] // Futuro: passar resultados anteriores para cálculo de churn exato
    );
  }, [selectedMonth, contracts, monthlyResults, costs, settings]);

  // B. Histórico Financeiro Completo (Para os Gráficos)
  const financialHistory = useMemo(() => {
    // Vamos calcular mês a mês para plotar o gráfico de evolução
    // Revertemos MONTHS para ficar cronológico (Jan -> Dez) no gráfico
    const cronologicalMonths = [...MONTHS].reverse(); 

    return cronologicalMonths.map(month => {
      const sim = calculateSimulation(month, contracts, monthlyResults, costs, settings, []);
      
      // AQUI ESTÁ O PULO DO GATO: SEPARAR UI-Z DE AGÊNCIA
      let uizRevenue = 0;
      let agencyRevenue = 0;

      sim.clients.forEach(client => {
        // Receita considerada para o gráfico (Realizada se tiver, Projetada se não)
        const revenue = client.Receita_Mensal_BRL || 0;
        
        if (client.Tipo_Servico === 'UI-Z') {
          uizRevenue += revenue;
        } else {
          agencyRevenue += revenue;
        }
      });

      return {
        month: month.split('/')[0], // "Jan" em vez de "Jan/2026" pra caber no gráfico
        fullMonth: month,
        agencyRevenue,
        uizRevenue,
        totalRevenue: sim.kpis.grossRevenue,
        totalCost: sim.kpis.totalCost,
        netResult: sim.kpis.netResult,
        accumulatedCash: sim.kpis.netResult // Simplificado
      };
    });
  }, [contracts, monthlyResults, costs, settings]);

  // --- 3. RENDERIZAÇÃO ---

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Carregando Z-Line BI...</p>
      </div>
    );
  }

  const kpis = currentSimulation.kpis;
  const margin = kpis.grossRevenue > 0 ? (kpis.netResult / kpis.grossRevenue) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900 pb-20">
      
      {/* HEADER / BARRA DE NAVEGAÇÃO */}
      <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4 mb-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-xl">
              <LayoutDashboard className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-slate-900">Z-LINE <span className="text-indigo-600">BI</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Financial Intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
            <div className="relative group">
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="appearance-none bg-white pl-4 pr-10 py-2 rounded-xl text-xs font-black uppercase tracking-wide border border-slate-200 shadow-sm outline-none focus:border-indigo-500 cursor-pointer min-w-[140px]"
              >
                {availableMonths.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
            </div>

            <div className="h-6 w-px bg-slate-300 mx-1"></div>

            <button 
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`p-2 rounded-xl transition-all ${privacyMode ? 'bg-indigo-100 text-indigo-700' : 'bg-white text-slate-400 hover:text-slate-600 shadow-sm'}`}
              title="Modo Privacidade"
            >
              {privacyMode ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          </div>

        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 space-y-8">
        
        {/* SEÇÃO 1: CARDS DE KPI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard 
            title="Receita Bruta" 
            value={kpis.grossRevenue} 
            icon={<DollarSign size={20} />} 
            privacyMode={privacyMode}
            colorCondition="always-neutral"
            subtitle="Faturamento Total Emitido"
          />
          <KPICard 
            title="Receita Líquida" 
            value={kpis.realizedRevenue} // Mostra o que realmente entrou (Pago)
            icon={<Wallet size={20} />} 
            privacyMode={privacyMode}
            colorCondition="positive-green"
            subtitle="Caixa Realizado (Pago)"
          />
           <KPICard 
            title="Custos Totais" 
            value={kpis.totalCost} 
            icon={<TrendingUp size={20} className="rotate-180"/>} 
            privacyMode={privacyMode}
            colorCondition="cost-warning"
            subtitle={`${costs.length} despesas lançadas`}
          />
          <KPICard 
            title="Margem de Lucro" 
            value={margin} 
            type="percent"
            icon={<PieChart size={20} />} 
            privacyMode={privacyMode}
            colorCondition={margin >= settings.targetMargin ? 'positive-green' : 'alert-low'}
            subtitle={`Meta: ${(settings.targetMargin * 100).toFixed(0)}%`}
          />
        </div>

        {/* SEÇÃO 2: GRÁFICOS ESTRATÉGICOS */}
        <FinancialCharts 
          data={financialHistory} 
          privacyMode={privacyMode} 
        />

        {/* SEÇÃO 3: PAINEL DE CONTROLE */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 pointer-events-none -z-10 h-20 -top-10"></div>
          <ConfigurationsPanel
            viewClients={currentSimulation.clients}
            contracts={contracts}
            monthlyResults={monthlyResults}
            allCosts={costs}
            months={availableMonths}
            settings={settings}
            growthData={growthData}
            selectedMonth={selectedMonth}
            onUpdateContracts={setContracts}
            onUpdateResults={setMonthlyResults}
            onUpdateCosts={setCosts}
            onUpdateSettings={setSettings}
            onUpdateMonths={setAvailableMonths}
            onUpdateGrowth={setGrowthData}
            privacyMode={privacyMode}
            churn={kpis.churn}
          />
        </div>

      </main>
      
      <footer className="text-center py-12 text-slate-300 text-[10px] font-bold uppercase tracking-widest">
        Z-Line Business Intelligence &copy; 2026 • Sistema Seguro
      </footer>
    </div>
  );
}

export default App;
