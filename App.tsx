import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  DollarSign,
  LayoutDashboard,
  Lock,
  PieChart,
  TrendingUp,
  Unlock,
  Wallet
} from 'lucide-react';

import {
  ClientContract,
  ClientMonthlyResult,
  CostData,
  GlobalSettings,
  MonthlyGrowthData
} from './types';
import {
  ALL_COSTS,
  INITIAL_CONTRACTS,
  INITIAL_GROWTH_DATA,
  INITIAL_MONTHLY_RESULTS,
  MONTHS
} from './constants';
import { calculateSimulation } from './utils/configAudit';
import { fetchDashboardData } from './database';

import KPICard from './components/KPICard';
import { FinancialCharts } from './components/Charts';
import { ConfigurationsPanel } from './components/ConfigurationsPanel';
import { DiagnosisPanel } from './components/DiagnosisPanel';
import { StrategicInsightsPanel } from './components/StrategicInsightsPanel';

function App() {
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS[0]);
  const [availableMonths, setAvailableMonths] = useState<string[]>(MONTHS);

  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [monthlyResults, setMonthlyResults] = useState<ClientMonthlyResult[]>([]);
  const [costs, setCosts] = useState<CostData[]>([]);
  const [growthData, setGrowthData] = useState<MonthlyGrowthData[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>({
    taxRate: 0.1,
    targetMargin: 0.5,
    maxProductionCapacity: 40,
    benchmarks: { maxChurn: 0.05, minMargin: 0.3, minLtvCac: 3 }
  });

  useEffect(() => {
    const loadData = async () => {
      const dbData = await fetchDashboardData();

      if (dbData) {
        setContracts(dbData.contracts);
        setMonthlyResults(dbData.monthlyResults);
        setCosts(dbData.costs);
        if (dbData.settings) setSettings(dbData.settings);
        setGrowthData(dbData.growthData);
      } else {
        console.warn('Usando fallback local (Falha na conexão)');
        setContracts(INITIAL_CONTRACTS);
        setMonthlyResults(INITIAL_MONTHLY_RESULTS);
        setCosts(ALL_COSTS);
        setGrowthData(INITIAL_GROWTH_DATA);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const currentSimulation = useMemo(
    () => calculateSimulation(selectedMonth, contracts, monthlyResults, costs, settings, []),
    [selectedMonth, contracts, monthlyResults, costs, settings]
  );

  const financialHistory = useMemo(() => {
    const chronologicalMonths = [...MONTHS].reverse();

    return chronologicalMonths.map((month) => {
      const sim = calculateSimulation(month, contracts, monthlyResults, costs, settings, []);

      let uizRevenue = 0;
      let agencyRevenue = 0;

      sim.clients.forEach((client) => {
        const revenue = client.Receita_Mensal_BRL || 0;
        if (client.Tipo_Servico === 'UI-Z') uizRevenue += revenue;
        else agencyRevenue += revenue;
      });

      return {
        month: month.split('/')[0],
        fullMonth: month,
        agencyRevenue,
        uizRevenue,
        totalRevenue: sim.kpis.grossRevenue,
        totalCost: sim.kpis.totalCost,
        netResult: sim.kpis.netResult,
        accumulatedCash: sim.kpis.netResult
      };
    });
  }, [contracts, monthlyResults, costs, settings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center flex-col gap-4">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-300 font-bold text-xs uppercase tracking-widest animate-pulse">
          Carregando Z-Line BI...
        </p>
      </div>
    );
  }

  const kpis = currentSimulation.kpis;
  const margin = kpis.grossRevenue > 0 ? kpis.netResult / kpis.grossRevenue : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 pb-20 font-sans text-slate-100 selection:bg-cyan-200/80 selection:text-slate-900">
      <div className="tech-layer" />
      <div className="tech-grid" />
      <div className="tech-orb tech-orb-left" />
      <div className="tech-orb tech-orb-right" />

      <div className="frost-layer-1" />
      <div className="frost-layer-2" />

      <nav className="sticky top-0 z-40 mb-8 border-b border-white/20 bg-white/10 px-6 py-4 backdrop-blur-3xl">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-cyan-400/20 p-2 shadow-lg shadow-cyan-500/25 border border-cyan-200/30">
              <LayoutDashboard className="text-cyan-100" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tighter text-white">
                Z-LINE <span className="text-cyan-300">BI</span>
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-100/80">
                Financial Intelligence • Glass Control Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-white/30 bg-white/10 p-1.5 backdrop-blur-2xl">
            <div className="group relative">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="min-w-[140px] cursor-pointer appearance-none rounded-xl border border-white/30 bg-black/20 py-2 pl-4 pr-10 text-xs font-black uppercase tracking-wide text-cyan-50 outline-none transition-all focus:border-cyan-300"
              >
                {availableMonths.map((month) => (
                  <option key={month} value={month} className="text-slate-900">
                    {month}
                  </option>
                ))}
              </select>
              <Calendar
                size={14}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cyan-100/80"
              />
            </div>

            <div className="mx-1 h-6 w-px bg-white/25"></div>

            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`rounded-xl p-2 transition-all ${
                privacyMode
                  ? 'bg-cyan-300/20 text-cyan-100'
                  : 'bg-black/20 text-slate-200 shadow-sm hover:text-white'
              }`}
              title="Modo Privacidade"
            >
              {privacyMode ? <Lock size={16} /> : <Unlock size={16} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-7xl space-y-8 px-6">
        <DiagnosisPanel
          contracts={contracts}
          monthlyResults={monthlyResults}
          costs={costs}
          growthData={growthData}
          selectedMonth={selectedMonth}
          netResult={kpis.netResult}
          margin={margin}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Receita Bruta"
            value={kpis.grossRevenue}
            icon={<DollarSign size={20} />}
            privacyMode={privacyMode}
            colorCondition="always-neutral"
            subtitle="Faturamento emitido"
          />
          <KPICard
            title="Receita Líquida"
            value={kpis.realizedRevenue}
            icon={<Wallet size={20} />}
            privacyMode={privacyMode}
            colorCondition="positive-green"
            subtitle="Caixa efetivamente recebido"
          />
          <KPICard
            title="Custos Totais"
            value={kpis.totalCost}
            icon={<TrendingUp size={20} className="rotate-180" />}
            privacyMode={privacyMode}
            colorCondition="cost-warning"
            subtitle={`${costs.length} despesas cadastradas`}
          />
          <KPICard
            title="Margem de Lucro"
            value={margin}
            type="percent"
            icon={<PieChart size={20} />}
            privacyMode={privacyMode}
            colorCondition={margin >= settings.targetMargin ? 'positive-green' : 'alert-low'}
            subtitle={`Meta atual: ${(settings.targetMargin * 100).toFixed(0)}%`}
          />
        </div>

        <FinancialCharts data={financialHistory} privacyMode={privacyMode} />

        <StrategicInsightsPanel
          contracts={contracts}
          monthlyResults={monthlyResults}
          costs={costs}
          settings={settings}
          selectedMonth={selectedMonth}
        />

        <div className="relative">
          <div className="pointer-events-none absolute -top-10 inset-x-0 -z-10 h-20 bg-gradient-to-b from-transparent to-slate-900/50"></div>
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

      <footer className="relative z-10 py-12 text-center text-[10px] font-bold uppercase tracking-widest text-cyan-100/70">
        Z-Line Business Intelligence © 2026 • Sistema Seguro
      </footer>
    </div>
  );
}

export default App;
