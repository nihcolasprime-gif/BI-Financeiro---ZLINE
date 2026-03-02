import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
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
  critico: 'text-red-50 bg-red-600/22 border-red-500/45',
  atencao: 'text-red-50 bg-red-950/60 border-red-500/40',
  oportunidade: 'text-red-50 bg-black/30 border-red-500/35'
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
    <section className="glass-window p-6 shadow-[0_30px_90px_-52px_rgba(255,36,0,0.55)]">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff2400]">Auditoria BI 360º</p>
          <h2 className="text-xl font-black tracking-tight text-white">Problemas, inconsistências e plano de reformulação</h2>
        </div>
        <span className="rounded-full bg-black/70 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white">
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
            <p className="text-xs font-semibold leading-relaxed text-red-50/90">{item.detail}</p>
          </article>
        ))}
      </div>


    </section>
  );
};
