import { ClientContract, ClientMonthlyResult, CostData, GlobalSettings } from '../types';
import { STANDARD_MONTHS } from '../constants';

export interface SimulationOutput {
  kpis: {
    grossRevenue: number;    // Faturamento Total (Emitido)
    realizedRevenue: number; // Receita Realizada (O que entrou no caixa/Pago)
    totalCost: number;
    netResult: number;       // Lucro (Realizada - Custos)
    churn: number;
  };
  clients: any[];
  costs: CostData[];
}

// Helper auxiliar para datas
const getMonthYearFromDate = (dateString?: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const monthName = STANDARD_MONTHS[date.getUTCMonth()]; // Ajustado para evitar erro de fuso
  const year = date.getUTCFullYear();
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

  // 2. Processar Clientes (Receita)
  let grossRevenue = 0;    // Tudo que foi faturado
  let realizedRevenue = 0; // Só o que foi pago

  const processedClients = contracts.map(contract => {
    // Verifica se já existe um lançamento manual para este mês (A tal "mudança de parcela")
    const realResult = monthlyResults.find(r => r.contractId === contract.id && r.Mes_Referencia === month);
    
    // Verifica se é o mês de início (para cobrar Setup do UI-Z)
    const startMonthYear = getMonthYearFromDate(contract.Data_Inicio);
    const isStartMonth = startMonthYear === month;
    
    let revenue = 0;
    let isProjected = false;

    if (realResult) {
      // Prioridade TOTAL ao valor manual. Se você mudou a parcela, vale o que tá aqui.
      revenue = realResult.Receita_Mensal_BRL;
    } else {
      // Se não tem lançamento manual, fazemos a PROJEÇÃO automática
      isProjected = true;
      if (contract.Status_Contrato === 'Ativo') {
        if (contract.Tipo_Servico === 'UI-Z') {
           revenue = contract.UIZ_Valor_Mensal || 0;
           // Adiciona Setup Fee se for o mês de estreia
           if (isStartMonth) {
             revenue += (contract.UIZ_Setup_Fee || 0);
           }
        } else {
           revenue = contract.Valor_Sugerido_Renovacao || 0;
        }
      }
    }

    // Só soma no "Faturamento Bruto" se o contrato estiver Ativo ou se houver lançamento financeiro
    if (contract.Status_Contrato === 'Ativo' || realResult) {
        grossRevenue += revenue;

        // Lógica de Caixa Real ("Dinheiro na Mão")
        // Se for projetado, assumimos que vai entrar. Se for real, só conta se estiver 'Pago'.
        if (isProjected) {
            realizedRevenue += revenue;
        } else if (realResult?.Status_Pagamento === 'Pago') {
            realizedRevenue += revenue;
        }
    }

    // Cálculo de Lucro Individual (Rateio simples de custos)
    const activeContractsCount = contracts.filter(c => c.Status_Contrato === 'Ativo').length;
    const costShare = activeCosts.length > 0 ? totalCost / Math.max(activeContractsCount, 1) : 0;
    const taxes = revenue * settings.taxRate;
    const profit = revenue - taxes - costShare;

    return {
      ...contract,
      ...realResult, // Mescla dados manuais se existirem
      id: realResult?.id || contract.id,
      contractId: contract.id,
      Receita_Mensal_BRL: revenue,
      profit,
      Status_Cliente: realResult?.Status_Mensal || contract.Status_Contrato,
      Status_Pagamento: realResult?.Status_Pagamento || (isProjected ? 'Projetado' : 'Pendente'),
      // Defaults visuais
      Conteudos_Contratados: realResult?.Conteudos_Contratados || 0,
      Conteudos_Entregues: realResult?.Conteudos_Entregues || 0,
      Conteudos_Nao_Entregues: realResult?.Conteudos_Nao_Entregues || 0
    };
  });

  // 3. Resultados Finais
  // Usamos realizedRevenue (caixa real) para calcular o lucro líquido final, 
  // para você não achar que tem lucro com dinheiro que não entrou.
  const taxDeduction = realizedRevenue * settings.taxRate;
  const netRevenue = realizedRevenue - taxDeduction;
  const netResult = netRevenue - totalCost;

  return {
    kpis: {
      grossRevenue,
      realizedRevenue,
      totalCost,
      netResult,
      churn: 0 // Implementaremos churn avançado no futuro se precisar
    },
    clients: processedClients,
    costs: activeCosts
  };
};
