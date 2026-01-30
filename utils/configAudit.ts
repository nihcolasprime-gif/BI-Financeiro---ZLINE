
import { ClientData, ClientContract, ClientMonthlyResult, CostData, GlobalSettings } from '../types';

// --- TYPES ---

export interface KPIResult {
  grossRevenue: number;
  netRevenue: number;
  totalCost: number;
  totalOperationalCost: number;
  totalUnitCostBase: number;
  netResult: number;
  margin: number;
  roi: number;
  ler: number;
  globalCostPerContent: number;
  idealPriceUnit: number;
  // Capacity KPIs
  totalContracted: number;
  totalDelivered: number;
  capacityUtilization: number; // %
  maxCapacity: number;
  potentialClientsSpace: number; // How many more average clients fit?
  churn: number;
}

export interface SimulationOutput {
  clients: ClientData[]; // Retorna a VIEW unificada
  costs: CostData[];
  kpis: KPIResult;
}

// --- LOGIC ---

const isOperationalCost = (cost: CostData) => {
  return cost.Categoria === 'Operacional';
};

export const calculateSimulation = (
  month: string,
  contracts: ClientContract[],
  monthlyResults: ClientMonthlyResult[],
  realCosts: CostData[],
  settings: GlobalSettings,
  previousMonthResults: ClientMonthlyResult[] = []
): SimulationOutput => {
  
  // 1. PERFORMANCE OPTIMIZATION: Index Contracts by ID for O(1) lookup
  const contractMap = new Map<string, ClientContract>();
  contracts.forEach(c => contractMap.set(c.id, c));

  // 2. JOIN: Contracts + MonthlyResults (Normalização -> View)
  const monthResults = monthlyResults.filter(r => r.Mes_Referencia === month);
  
  const mergedClients: ClientData[] = monthResults.map(result => {
    const contract = contractMap.get(result.contractId);
    
    // Fallback de segurança caso o contrato tenha sido deletado mas o resultado não
    if (!contract) {
       return {
          ...result,
          id: result.id,
          contractId: result.contractId,
          Cliente: 'Contrato Removido ou Arquivado',
          Status_Contrato: 'Inativo',
          Status_Cliente: result.Status_Mensal,
          Receita_Liquida_Apos_Imposto_BRL: 0
       } as ClientData;
    }

    return {
      ...contract, // Dados Mestres (Nome, Datas, Pagamento)
      ...result,   // Dados Mensais (Receita, Entregas)
      id: result.id, // ID da View é o ID do registro mensal
      contractId: contract.id,
      Status_Cliente: result.Status_Mensal, // Mapeamento para UI
      Receita_Liquida_Apos_Imposto_BRL: 0 // Será calculado abaixo
    };
  });

  // 3. Filter Active Costs for Month
  const activeCosts = realCosts.filter(c => c.Mes_Referencia === month && c.Ativo_no_Mes);

  // 4. Extract Globals
  const { taxRate, targetMargin, allocationMethod, oneTimeAdjustments, maxProductionCapacity, manualCostPerContentOverride } = settings;

  // 5. Calculate Aggregates
  const operationalCosts = activeCosts.filter(isOperationalCost);
  const unitBaseCosts = operationalCosts; 

  const totalGrossRevenue = mergedClients.reduce((sum, c) => sum + (Number(c.Receita_Mensal_BRL) || 0), 0);
  const totalNetRevenue = totalGrossRevenue * (1 - taxRate);
  
  // Costs
  let totalCost = activeCosts.reduce((sum, c) => sum + (Number(c.Valor_Mensal_BRL) || 0), 0);
  totalCost += (oneTimeAdjustments || 0); 

  const totalOperationalCost = operationalCosts.reduce((sum, c) => sum + (Number(c.Valor_Mensal_BRL) || 0), 0);
  const totalUnitCostBase = unitBaseCosts.reduce((sum, c) => sum + (Number(c.Valor_Mensal_BRL) || 0), 0);

  const totalDelivered = mergedClients.reduce((sum, c) => sum + (c.Status_Cliente === 'Ativo' ? (Number(c.Conteudos_Entregues) || 0) : 0), 0);
  const totalContracted = mergedClients.reduce((sum, c) => sum + (c.Status_Cliente === 'Ativo' ? (Number(c.Conteudos_Contratados) || 0) : 0), 0);
  const activeClientsCount = mergedClients.filter(c => c.Status_Cliente === 'Ativo').length;

  // 6. Calculate Unit Metrics (Allocation Logic)
  let globalCostPerContent = 0;

  if (manualCostPerContentOverride > 0) {
     globalCostPerContent = manualCostPerContentOverride;
  } else {
    if (allocationMethod === 'perDelivered') {
      globalCostPerContent = totalDelivered > 0 ? totalUnitCostBase / totalDelivered : 0;
    } else if (allocationMethod === 'perContracted') {
      globalCostPerContent = totalContracted > 0 ? totalUnitCostBase / totalContracted : 0;
    } else if (allocationMethod === 'equalShare') {
      globalCostPerContent = activeClientsCount > 0 ? totalUnitCostBase / activeClientsCount : 0; 
    }
  }

  // Math Safety: Prevent division by zero if targetMargin is 1 (100%) or close to it
  const safeMarginDivisor = Math.max(0.01, 1 - targetMargin);
  const idealPriceUnit = globalCostPerContent / safeMarginDivisor;

  // 7. Calculate Client Specifics (Lucratividade por Cliente)
  const enrichedClients = mergedClients.map(c => {
    const netRev = (Number(c.Receita_Mensal_BRL) || 0) * (1 - taxRate);
    
    let allocatedCost = 0;
    let idealRev = 0;

    if (c.Status_Cliente === 'Inativo') {
        allocatedCost = 0;
    } else {
        if (allocationMethod === 'perDelivered') {
            allocatedCost = (Number(c.Conteudos_Entregues) || 0) * globalCostPerContent;
            idealRev = idealPriceUnit * (Number(c.Conteudos_Contratados) || 0);
        }
        else if (allocationMethod === 'perContracted') {
            allocatedCost = (Number(c.Conteudos_Contratados) || 0) * globalCostPerContent;
            idealRev = idealPriceUnit * (Number(c.Conteudos_Contratados) || 0);
        }
        else if (allocationMethod === 'equalShare') {
            allocatedCost = globalCostPerContent;
            idealRev = allocatedCost / safeMarginDivisor;
        }
    }

    const profit = netRev - allocatedCost;
    const margin = netRev !== 0 ? profit / netRev : 0;
    
    return {
      ...c,
      Receita_Liquida_Apos_Imposto_BRL: netRev,
      netRevenue: netRev,
      profit: profit,
      margin: margin,
      idealRevenue: idealRev
    };
  });

  // 8. Global KPIs
  const netResult = totalNetRevenue - totalCost;
  const roi = totalCost > 0 ? netResult / totalCost : 0;
  const ler = totalOperationalCost > 0 ? totalNetRevenue / totalOperationalCost : 0;
  
  // Capacity Logic
  const capacityUtilization = maxProductionCapacity > 0 ? (totalContracted / maxProductionCapacity) : 0;
  const avgContractSize = activeClientsCount > 0 ? totalContracted / activeClientsCount : 0;
  const potentialClientsSpace = avgContractSize > 0 ? (maxProductionCapacity - totalContracted) / avgContractSize : 0;

  // Churn Calculation
  const activeContractsLastMonth = new Set(previousMonthResults.filter(r => r.Status_Mensal === 'Ativo').map(r => r.contractId));
  const activeContractsThisMonth = new Set(monthResults.filter(r => r.Status_Mensal === 'Ativo').map(r => r.contractId));
  
  let lostCount = 0;
  activeContractsLastMonth.forEach(id => {
    if (!activeContractsThisMonth.has(id)) lostCount++;
  });
  
  const churn = activeContractsLastMonth.size > 0 ? lostCount / activeContractsLastMonth.size : 0;

  return {
    clients: enrichedClients,
    costs: activeCosts,
    kpis: {
      grossRevenue: totalGrossRevenue,
      netRevenue: totalNetRevenue,
      totalCost,
      totalOperationalCost,
      totalUnitCostBase,
      netResult,
      margin: totalNetRevenue !== 0 ? netResult / totalNetRevenue : 0,
      roi,
      ler,
      globalCostPerContent,
      idealPriceUnit,
      totalContracted,
      totalDelivered,
      capacityUtilization,
      maxCapacity: maxProductionCapacity,
      potentialClientsSpace,
      churn
    }
  };
};
