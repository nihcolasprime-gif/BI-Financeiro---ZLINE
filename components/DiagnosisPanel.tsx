import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, FlaskConical, Sparkles, Wrench } from 'lucide-react';
import { ClientContract, ClientMonthlyResult, CostData, MonthlyGrowthData } from '../types';
import { formatCurrency, formatPercent } from '../utils';

interface DiagnosisPanelProps {
  contracts: ClientContract[];
  monthlyResults: ClientMonthlyResult[];
  costs: CostData[];
  growthData: MonthlyGrowthData[];
  selectedMonth: string;
  netResult: number;
  margin: number;
}

type FindingLevel = 'critico' | 'atencao' | 'oportunidade';

interface Finding {
  id: string;
  level: FindingLevel;
  title: string;
  detail: string;
}

const levelStyles: Record<FindingLevel, string> = {
  critico: 'text-rose-100 bg-rose-500/20 border-rose-300/40',
  atencao: 'text-rose-100 bg-rose-900/35 border-rose-300/40',
  oportunidade: 'text-rose-100 bg-black/35 border-rose-300/30'
};

export const DiagnosisPanel: React.FC<DiagnosisPanelProps> = ({
  contracts,
  monthlyResults,
  costs,
  growthData,
  selectedMonth,
  netResult,
  margin
}) => {
  const findings = useMemo(() => {
    const list: Finding[] = [];
    const activeContracts = contracts.filter((contract) => contract.Status_Contrato === 'Ativo');
    const monthResults = monthlyResults.filter((result) => result.Mes_Referencia === selectedMonth);
    const monthCosts = costs.filter((cost) => cost.Mes_Referencia === selectedMonth && cost.Ativo_no_Mes);

    const withoutResult = activeContracts.filter(
      (contract) => !monthResults.some((result) => result.contractId === contract.id)
    );

    if (withoutResult.length > 0) {
      list.push({
        id: 'missing-results',
        level: 'atencao',
        title: 'Clientes ativos sem lançamento mensal',
        detail: `${withoutResult.length} clientes ativos não possuem registro financeiro em ${selectedMonth}. Isso distorce MRR, inadimplência e margem real.`
      });
    }

    const pendingPayments = monthResults.filter((result) => result.Status_Pagamento !== 'Pago');
    if (pendingPayments.length > 0) {
      list.push({
        id: 'pending-payments',
        level: 'critico',
        title: 'Receita em risco por pagamentos pendentes/atrasados',
        detail: `${pendingPayments.length} lançamentos não estão com status "Pago". Separar previsto x realizado no dashboard executivo é essencial.`
      });
    }

    const uncategorizedCosts = monthCosts.filter((cost) => !cost.Categoria || !cost.Tipo);
    if (uncategorizedCosts.length > 0) {
      list.push({
        id: 'cost-categorization',
        level: 'atencao',
        title: 'Custos sem taxonomia completa',
        detail: `${uncategorizedCosts.length} despesas do mês estão sem categoria/tipo completos. Sem isso, fica difícil otimizar CAC, Opex e margem por centro de custo.`
      });
    }

    const monthGrowth = growthData.find((growth) => growth.month === selectedMonth);
    if (!monthGrowth || !monthGrowth.leads) {
      list.push({
        id: 'missing-growth-kpis',
        level: 'oportunidade',
        title: 'Falta funil de aquisição completo',
        detail: 'Há gasto de mídia cadastrado, mas leads/conversão não estão consolidados. Isso impede cálculo robusto de CAC, payback e LTV/CAC.'
      });
    }

    if (monthCosts.length === 0) {
      list.push({
        id: 'missing-costs',
        level: 'critico',
        title: 'Mês sem custos ativos lançados',
        detail: `Nenhum custo ativo foi identificado em ${selectedMonth}. O lucro líquido fica artificial e inviabiliza decisões de orçamento.`
      });
    }

    if (margin < 0.25) {
      list.push({
        id: 'low-margin',
        level: 'critico',
        title: 'Margem abaixo da zona saudável',
        detail: `A margem atual está em ${formatPercent(margin)}. Recomendado revisar pricing, escopo e eficiência operacional para voltar acima de 35%.`
      });
    }

    if (netResult < 0) {
      list.push({
        id: 'negative-result',
        level: 'critico',
        title: 'Resultado líquido negativo',
        detail: `O mês fecha em ${formatCurrency(netResult)}. É urgente priorizar retenção, cobrança e corte de custos variáveis não essenciais.`
      });
    }

    if (list.length === 0) {
      list.push({
        id: 'healthy',
        level: 'oportunidade',
        title: 'Base organizada para escalar',
        detail: 'Sem inconsistências graves detectadas no mês selecionado. Próximo passo: previsibilidade com forecast trimestral e alertas automáticos.'
      });
    }

    return list;
  }, [contracts, monthlyResults, costs, growthData, selectedMonth, netResult, margin]);

  return (
    <section className="glass-panel rounded-[32px] border border-white/50 bg-white/45 p-6 shadow-[0_24px_90px_-40px_rgba(30,41,59,0.45)] backdrop-blur-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-300">Auditoria BI 360º</p>
          <h2 className="text-xl font-black tracking-tight text-white">Problemas, inconsistências e plano de reformulação</h2>
        </div>
        <span className="rounded-full bg-slate-950/80 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
          {findings.length} pontos mapeados
        </span>
      </div>

      <div className="grid gap-3">
        {findings.map((item) => (
          <article
            key={item.id}
            className={`rounded-2xl border p-4 ${levelStyles[item.level]}`}
          >
            <div className="mb-2 flex items-center gap-2">
              {item.level === 'critico' && <AlertTriangle size={16} />}
              {item.level === 'atencao' && <Wrench size={16} />}
              {item.level === 'oportunidade' && <CheckCircle2 size={16} />}
              <h3 className="text-sm font-black tracking-tight">{item.title}</h3>
            </div>
            <p className="text-xs font-semibold leading-relaxed text-slate-100/90">{item.detail}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-rose-300/25 bg-black/35 p-4">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-rose-100">
            <FlaskConical size={14} /> O que falta
          </p>
          <p className="text-xs font-semibold text-slate-100/90">Forecast de caixa por 90 dias, metas por squad e alertas de variação acima de 15% por KPI.</p>
        </div>

        <div className="rounded-2xl border border-rose-300/25 bg-black/35 p-4">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-rose-100">
            <Sparkles size={14} /> Liquid Glass
          </p>
          <p className="text-xs font-semibold text-slate-100/90">Padronizar cards translúcidos, hierarquia visual por prioridade e estados de risco com brilho contextual.</p>
        </div>

        <div className="rounded-2xl border border-rose-300/25 bg-black/35 p-4">
          <p className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-rose-100">
            <CheckCircle2 size={14} /> Próximo ciclo
          </p>
          <p className="text-xs font-semibold text-slate-100/90">Automatizar importação de dados, versionar regras de cálculo e criar trilha de auditoria para cada ajuste.</p>
        </div>
      </div>
    </section>
  );
};
