import React, { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, LineChart, Target, Users } from 'lucide-react';
import { ClientContract, ClientMonthlyResult, CostData, GlobalSettings } from '../types';
import { formatCurrency, formatPercent } from '../utils';

interface StrategicInsightsPanelProps {
  contracts: ClientContract[];
  monthlyResults: ClientMonthlyResult[];
  costs: CostData[];
  settings: GlobalSettings;
  selectedMonth: string;
}

type SegmentLabel = 'Social Media' | 'Eventos' | 'Ocasionais' | 'Assinaturas Site';

type TabKey = 'segmentos' | 'prejuizo' | 'custos' | 'evolucao';

const getSegment = (contract: ClientContract): SegmentLabel => {
  if (contract.Tipo_Servico === 'UI-Z') return 'Assinaturas Site';

  const description = (contract.Descricao_Servico || '').toLowerCase();
  if (description.includes('evento')) return 'Eventos';
  if (description.includes('ocasional') || description.includes('avulso') || description.includes('pontual')) return 'Ocasionais';

  return 'Social Media';
};

export const StrategicInsightsPanel: React.FC<StrategicInsightsPanelProps> = ({
  contracts,
  monthlyResults,
  costs,
  settings,
  selectedMonth
}) => {
  const [activeTab, setActiveTab] = useState<TabKey>('segmentos');

  const analytics = useMemo(() => {
    const monthResults = monthlyResults.filter((result) => result.Mes_Referencia === selectedMonth);
    const monthCosts = costs.filter((cost) => cost.Mes_Referencia === selectedMonth && cost.Ativo_no_Mes);
    const activeContracts = contracts.filter((contract) => contract.Status_Contrato === 'Ativo');

    const totalCost = monthCosts.reduce((sum, cost) => sum + (cost.Valor_Mensal_BRL || 0), 0);
    const avgCostPerClient = activeContracts.length ? totalCost / activeContracts.length : 0;

    const segmentBase: Record<SegmentLabel, { count: number; revenue: number }> = {
      'Social Media': { count: 0, revenue: 0 },
      Eventos: { count: 0, revenue: 0 },
      Ocasionais: { count: 0, revenue: 0 },
      'Assinaturas Site': { count: 0, revenue: 0 }
    };

    const lossClients = activeContracts.map((contract) => {
      const result = monthResults.find((item) => item.contractId === contract.id);
      const revenue = result?.Receita_Mensal_BRL
        ?? (contract.Tipo_Servico === 'UI-Z' ? (contract.UIZ_Valor_Mensal || 0) : (contract.Valor_Sugerido_Renovacao || 0));

      const taxes = revenue * settings.taxRate;
      const profit = revenue - taxes - avgCostPerClient;

      const segment = getSegment(contract);
      segmentBase[segment].count += 1;
      segmentBase[segment].revenue += revenue;

      return {
        client: contract.Cliente,
        segment,
        revenue,
        taxes,
        avgCostShare: avgCostPerClient,
        profit
      };
    });

    const averageRevenuePerClient = activeContracts.length
      ? lossClients.reduce((sum, item) => sum + item.revenue, 0) / activeContracts.length
      : 0;

    const idealContractValue = avgCostPerClient / Math.max(1 - settings.targetMargin, 0.05);
    const monthlyImpact = (idealContractValue - averageRevenuePerClient) * activeContracts.length;

    const clientsEvolution = contracts.map((contract) => {
      const history = monthlyResults
        .filter((result) => result.contractId === contract.id)
        .map((result) => ({ month: result.Mes_Referencia, value: result.Receita_Mensal_BRL }))
        .sort((a, b) => a.month.localeCompare(b.month));

      if (!history.length) {
        return {
          client: contract.Cliente,
          points: 0,
          average: 0,
          trend: 0
        };
      }

      const first = history[0].value;
      const last = history[history.length - 1].value;
      const average = history.reduce((sum, item) => sum + item.value, 0) / history.length;
      const trend = first > 0 ? (last - first) / first : 0;

      return {
        client: contract.Cliente,
        points: history.length,
        average,
        trend
      };
    });

    return {
      segmentBase,
      lossClients: lossClients.sort((a, b) => a.profit - b.profit),
      avgCostPerClient,
      averageRevenuePerClient,
      idealContractValue,
      monthlyImpact,
      clientsEvolution: clientsEvolution.sort((a, b) => b.average - a.average)
    };
  }, [contracts, monthlyResults, costs, selectedMonth, settings]);

  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
    { key: 'segmentos', label: 'Segmentação de Contratos', icon: <Users size={14} /> },
    { key: 'prejuizo', label: 'Clientes em Prejuízo', icon: <AlertTriangle size={14} /> },
    { key: 'custos', label: 'Custo Médio e Valor Ideal', icon: <Target size={14} /> },
    { key: 'evolucao', label: 'Evolução por Cliente', icon: <LineChart size={14} /> }
  ];

  return (
    <section className="glass-panel rounded-[32px] border border-white/30 p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-cyan-200">Analytics Estratégico</p>
          <h2 className="text-xl font-black text-white">Rentabilidade, segmentos e valor ideal de contrato</h2>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-white/20 bg-black/20 px-3 py-2 text-[11px] font-bold text-cyan-100">
          <BarChart3 size={14} /> Competência {selectedMonth}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-2 md:grid-cols-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-xl border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition-all ${
              activeTab === tab.key
                ? 'border-cyan-300/50 bg-cyan-300/15 text-cyan-100'
                : 'border-white/20 bg-white/5 text-slate-200 hover:bg-white/10'
            }`}
          >
            <span className="flex items-center justify-center gap-2">{tab.icon} {tab.label}</span>
          </button>
        ))}
      </div>

      {activeTab === 'segmentos' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(analytics.segmentBase).map(([segment, data]) => (
            <article key={segment} className="rounded-2xl border border-white/20 bg-white/10 p-4">
              <p className="text-[11px] font-black uppercase text-cyan-100/90">{segment}</p>
              <p className="mt-2 text-2xl font-black text-white">{data.count}</p>
              <p className="text-xs font-semibold text-slate-200">Receita no mês: {formatCurrency(data.revenue)}</p>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'prejuizo' && (
        <div className="space-y-2">
          {analytics.lossClients.slice(0, 8).map((item) => (
            <article key={item.client} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs md:grid-cols-5">
              <p className="font-black text-white md:col-span-2">{item.client} <span className="font-semibold text-cyan-200/80">• {item.segment}</span></p>
              <p className="font-bold text-slate-200">Receita: {formatCurrency(item.revenue)}</p>
              <p className="font-bold text-slate-200">Custo médio: {formatCurrency(item.avgCostShare)}</p>
              <p className={`font-black ${item.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {item.profit >= 0 ? 'Lucro' : 'Prejuízo'}: {formatCurrency(item.profit)}
              </p>
            </article>
          ))}
        </div>
      )}

      {activeTab === 'custos' && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-[11px] font-black uppercase text-cyan-100">Custo médio por cliente</p>
            <p className="mt-2 text-2xl font-black text-white">{formatCurrency(analytics.avgCostPerClient)}</p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-[11px] font-black uppercase text-cyan-100">Valor real médio</p>
            <p className="mt-2 text-2xl font-black text-white">{formatCurrency(analytics.averageRevenuePerClient)}</p>
          </article>
          <article className="rounded-2xl border border-white/20 bg-white/10 p-4">
            <p className="text-[11px] font-black uppercase text-cyan-100">Valor ideal médio</p>
            <p className="mt-2 text-2xl font-black text-white">{formatCurrency(analytics.idealContractValue)}</p>
            <p className={`mt-2 text-xs font-bold ${analytics.monthlyImpact <= 0 ? 'text-emerald-300' : 'text-amber-200'}`}>
              Impacto estimado: {formatCurrency(analytics.monthlyImpact)} / mês
            </p>
          </article>
        </div>
      )}

      {activeTab === 'evolucao' && (
        <div className="space-y-2">
          {analytics.clientsEvolution.slice(0, 10).map((client) => (
            <article key={client.client} className="grid grid-cols-1 gap-2 rounded-2xl border border-white/20 bg-white/10 p-4 text-xs md:grid-cols-4">
              <p className="font-black text-white">{client.client}</p>
              <p className="font-bold text-slate-200">Média: {formatCurrency(client.average)}</p>
              <p className="font-bold text-slate-200">Meses com dados: {client.points}</p>
              <p className={`font-black ${client.trend >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                Tendência: {formatPercent(client.trend)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
