import { ClientContract, ClientMonthlyResult, CostData, GlobalSettings } from '../types';
import { STANDARD_MONTHS } from '../constants';

export interface SimulationOutput {
  kpis: {
    grossRevenue: number;
    netRevenue: number;
    totalCost: number;
    netResult: number;
    churn: number;
  };
  clients: any[];
  costs: CostData[];
}

// Helper para converter Data ISO (YYYY-MM-DD) para formato do App (Mês/Ano)
const getMonthYearFromDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  // Ajuste de fuso horário simples para evitar pular dia/mês errado
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
  
  const monthName = STANDARD_MONTHS[adjustedDate.getMonth()];
  const year = adjustedDate.getFullYear();
  return `${monthName}/${year}`;
};

export const calculateSimulation = (
  month: string,
  contracts: ClientContract[],
  monthlyResults: ClientMonthlyResult[],
  allCosts: CostData[],
  settings: GlobalSettings,
  prevResults: ClientMonthlyResult[]
): SimulationOutput => {
  
  // 1. Filtrar Custos do Mês
  const activeCosts = allCosts.filter(c => c.Mes_Referencia === month && c.Ativo_no_Mes);
  const totalCost = activeCosts.reduce((acc, curr) => acc + curr.Valor_Mensal_BRL, 0);

  // 2. Processar Receita dos Clientes
  let grossRevenue = 0;
  
  // Lista de clientes processados com seus dados financeiros deste mês
  const processedClients = contracts.map(contract => {
    // Verifica se existe um resultado REAL lançado para este mês
    const realResult = monthlyResults.find(r => r.contractId === contract.id && r.Mes_Referencia === month);
    
    // Verifica se é o mês de início do contrato (para cobrar Setup do UI-Z)
    const startMonthYear = getMonthYearFromDate(contract.Data_Inicio);
    const isStartMonth = startMonthYear === month;
    
    let revenue = 0;
    let isProjected = false;

    if (realResult) {
      // Se tem lançamento manual, usa ele (Isso permite "mudar o valor da parcela" manualmente)
      revenue = realResult.Receita_Mensal_BRL;
    } else {
      // Se não tem, faz PROJEÇÃO baseada no contrato e status
      isProjected = true;
      if (contract.Status_Contrato === 'Ativo') {
        if (contract.Tipo_Servico === 'UI-Z') {
           // Projeção UI-Z: Mensalidade Base
           revenue = contract.UIZ_Valor_Mensal || 0;
        } else {
           // Projeção Agência: Valor Sugerido ou estimativa
           revenue = contract.Valor_Sugerido_Renovacao || 0;
        }
      }
    }

    // REGRA DE SETUP UI-Z:
    // Se for contrato UI-Z e estivermos no mês de início, soma o Setup Fee
    // Nota: Se já tiver resultado manual (realResult), assumimos que o usuário já somou ou lançou lá.
    // Se for projeção, somamos automático.
    if (contract.Tipo_Servico === 'UI-Z' && isStartMonth && isProjected) {
        revenue += (contract.UIZ_Setup_Fee || 0);
    }

    // Soma ao total global
    grossRevenue += revenue;

    // Cálculo de Lucro Individual (Estimado)
    // Distribuição de custos simples para visualização (pode refinar com settings.allocationMethod)
    const costShare = activeCosts.length > 0 ? totalCost / Math.max(contracts.filter(c => c.Status_Contrato === 'Ativo').length, 1) : 0;
    const taxes = revenue * settings.taxRate;
    const profit = revenue - taxes - costShare;

    return {
      ...contract, // Dados do contrato
      ...realResult, // Dados do resultado mensal (se houver)
      id: realResult?.id || contract.id, // ID para chave React
      contractId: contract.id,
      Receita_Mensal_BRL: revenue,
      profit,
      Status_Cliente: realResult?.Status_Mensal || contract.Status_Contrato,
      // Se não tiver resultado real, preenchemos com zeros para não quebrar a UI
      Conteudos_Contratados: realResult?.Conteudos_Contratados || 0,
      Conteudos_Entregues: realResult?.Conteudos_Entregues || 0,
      Conteudos_Nao_Entregues: realResult?.Conteudos_Nao_Entregues || 0
    };
  });

  // 3. Cálculos Finais de KPI
  const taxDeduction = grossRevenue * settings.taxRate;
  const netRevenue = grossRevenue - taxDeduction;
  const netResult = netRevenue - totalCost;

  // Cálculo Simples de Churn (Clientes que eram ativos mês passado e não são mais)
  // Requer lógica mais complexa comparando prevResults, simplificado aqui para:
  const activeNow = processedClients.filter(c => c.Status_Cliente === 'Ativo').length;
  // const activeBefore = ... (depende de prevResults passado pelo App.tsx)
  
  return {
    kpis: {
      grossRevenue,
      netRevenue,
      totalCost,
      netResult,
      churn: 0 // Placeholder, lógica real de churn é feita no App.tsx ou Engine avançada
    },
    clients: processedClients,
    costs: activeCosts
  };
};
