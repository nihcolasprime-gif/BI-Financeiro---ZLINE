import { ClientData, CostData } from '../types';

// --- TYPES ---

export type SimulationTargetType = 'clientMonthly' | 'costMonthly' | 'setting' | 'formula' | 'estorno' | 'clientMaster' | 'add' | 'delete';

export interface SimulationEvent {
  id: string;
  ts: string;
  userId: string;
  targetType: SimulationTargetType;
  targetId?: string;
  month?: string;
  field: string;
  oldValue: any;
  newValue: any;
  note?: string;
}

export interface SystemSettings {
  taxRate: number;
  targetMargin: number;
  lerTarget: number;
  allocationMethod: 'perDelivered' | 'perContracted' | 'equalShare' | 'manualOverride';
  inflationFactor: number;
  seasonalMultiplier: number;
  tolerancePercentage: number;
  oneTimeAdjustments: number;
  // New Capacity Settings
  maxProductionCapacity: number; // Total contents the agency can produce
  manualCostPerContentOverride: number; // If > 0, overrides calculation
}

export interface SimulationState {
  clients: Record<string, Record<string, Partial<ClientData>>>; // Overrides
  costs: Record<string, Record<string, Partial<CostData>>>; // Overrides
  // CRUD Lists
  addedClients: ClientData[]; 
  addedCosts: CostData[];
  deletedClientIds: string[];
  deletedCostIds: string[];
  global: SystemSettings;
}

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
  capacityUtilization: number; // %
  maxCapacity: number;
  potentialClientsSpace: number; // How many more average clients fit?
}

export interface SimulationOutput {
  clients: (ClientData & { 
    Calculated_NetRevenue: number;
    Calculated_AllocatedCost: number;
    Calculated_Profit: number;
    Calculated_Margin: number;
    Calculated_Gap: number;
  })[];
  costs: CostData[];
  kpis: KPIResult;
}

// --- LOGIC ---

const isNonOperational = (name: string, type: string) => {
  const lowerName = name.toLowerCase();
  // Allow user to change type, so check type first
  if (type === 'Extra' || type === 'Imposto') return true;
  if (type === 'Fixo') return false;
  
  return lowerName.includes('estorno') || lowerName.includes('contador') || lowerName.includes('imposto');
};

export const calculateSimulation = (
  month: string,
  realClients: ClientData[],
  realCosts: CostData[],
  simulation: SimulationState
): SimulationOutput => {
  
  // 1. Construct Base Lists (Real + Added - Deleted)
  
  // Clients
  let activeClients = [...realClients.filter(c => c.Mes_Referencia === month), ...simulation.addedClients.filter(c => c.Mes_Referencia === month)];
  activeClients = activeClients.filter(c => !simulation.deletedClientIds.includes(c.id));

  // Costs
  let activeCostsList = [...realCosts.filter(c => c.Mes_Referencia === month), ...simulation.addedCosts.filter(c => c.Mes_Referencia === month)];
  activeCostsList = activeCostsList.filter(c => !simulation.deletedCostIds.includes(c.id));

  // 2. Apply Field Overrides
  const mergedClients = activeClients.map(c => {
    const override = simulation.clients[month]?.[c.id] || {};
    return { ...c, ...override };
  });

  const mergedCosts = activeCostsList.map(c => {
    const override = simulation.costs[month]?.[c.id] || {};
    return { ...c, ...override };
  });

  // 3. Extract Globals
  const { taxRate, targetMargin, allocationMethod, oneTimeAdjustments, maxProductionCapacity, manualCostPerContentOverride } = simulation.global;

  // 4. Calculate Aggregates
  const activeCosts = mergedCosts.filter(c => c.Ativo_no_Mes);
  const operationalCosts = activeCosts.filter(c => !isNonOperational(c.Tipo_Custo, c.Tipo_Custo)); // Using Type field as logic
  
  const unitBaseCosts = operationalCosts; 

  const totalGrossRevenue = mergedClients.reduce((sum, c) => sum + (c.Status_Cliente === 'Ativo' ? c.Receita_Mensal_BRL : 0), 0);
  const totalNetRevenue = totalGrossRevenue * (1 - taxRate);
  
  // Costs
  let totalCost = activeCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);
  totalCost += oneTimeAdjustments; 

  const totalOperationalCost = operationalCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);
  const totalUnitCostBase = unitBaseCosts.reduce((sum, c) => sum + c.Valor_Mensal_BRL, 0);

  const totalDelivered = mergedClients.reduce((sum, c) => sum + (c.Status_Cliente === 'Ativo' ? c.Conteudos_Entregues : 0), 0);
  const totalContracted = mergedClients.reduce((sum, c) => sum + (c.Status_Cliente === 'Ativo' ? c.Conteudos_Contratados : 0), 0);

  // 5. Calculate Unit Metrics (Allocation)
  let globalCostPerContent = 0;

  if (manualCostPerContentOverride > 0) {
     globalCostPerContent = manualCostPerContentOverride;
  } else {
    if (allocationMethod === 'perDelivered') {
      globalCostPerContent = totalDelivered > 0 ? totalUnitCostBase / totalDelivered : 0;
    } else if (allocationMethod === 'perContracted') {
      globalCostPerContent = totalContracted > 0 ? totalUnitCostBase / totalContracted : 0;
    } else if (allocationMethod === 'equalShare') {
      const activeCount = mergedClients.filter(c => c.Status_Cliente === 'Ativo').length;
      globalCostPerContent = activeCount > 0 ? totalUnitCostBase / activeCount : 0; 
    }
  }

  const idealPriceUnit = globalCostPerContent / (1 - targetMargin);

  // 6. Calculate Client Specifics
  const enrichedClients = mergedClients.map(c => {
    const netRev = c.Receita_Mensal_BRL * (1 - taxRate);
    
    let allocatedCost = 0;
    if (c.Status_Cliente === 'Inativo') {
        allocatedCost = 0;
    } else {
        if (allocationMethod === 'perDelivered') allocatedCost = c.Conteudos_Entregues * globalCostPerContent;
        else if (allocationMethod === 'perContracted') allocatedCost = c.Conteudos_Contratados * globalCostPerContent;
        else if (allocationMethod === 'equalShare') allocatedCost = globalCostPerContent;
        else allocatedCost = c.Conteudos_Entregues * globalCostPerContent; 
    }

    const profit = netRev - allocatedCost;
    const margin = netRev !== 0 ? profit / netRev : 0;
    const idealRev = idealPriceUnit * c.Conteudos_Contratados;
    const gap = netRev - idealRev;

    return {
      ...c,
      Calculated_NetRevenue: netRev,
      Calculated_AllocatedCost: allocatedCost,
      Calculated_Profit: profit,
      Calculated_Margin: margin,
      Calculated_Gap: gap
    };
  });

  // 7. Global KPIs
  const netResult = totalNetRevenue - totalCost;
  const roi = totalCost > 0 ? netResult / totalCost : 0;
  const ler = totalOperationalCost > 0 ? totalNetRevenue / totalOperationalCost : 0;
  
  // Capacity Logic
  const capacityUtilization = maxProductionCapacity > 0 ? (totalContracted / maxProductionCapacity) : 0;
  const avgContractSize = totalContracted / (mergedClients.filter(c => c.Status_Cliente === 'Ativo').length || 1);
  const potentialClientsSpace = avgContractSize > 0 ? (maxProductionCapacity - totalContracted) / avgContractSize : 0;

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
      capacityUtilization,
      maxCapacity: maxProductionCapacity,
      potentialClientsSpace
    }
  };
};

export const generateAuditReport = (
  snapshotId: string,
  user: { id: string; name: string },
  month: string,
  realClients: ClientData[],
  realCosts: CostData[],
  simulation: SimulationState,
  events: SimulationEvent[],
  realKPIs: KPIResult
) => {
  const simResult = calculateSimulation(month, realClients, realCosts, simulation);

  return {
    snapshotId,
    createdAt: new Date().toISOString(),
    createdBy: user,
    clients: simResult.clients,
    costs: simResult.costs,
    events: events,
    formulas: {
      netRevenue: `grossRevenue * (1 - ${simulation.global.taxRate})`,
      totalOperationalCost: "sum(costs where isOperational && active)",
      globalCostPerContent: simulation.global.manualCostPerContentOverride > 0 
        ? `${simulation.global.manualCostPerContentOverride} (Manual Override)`
        : `totalUnitCostBase / ${simulation.global.allocationMethod}`,
      allocatedCost_client: `usage * globalCostPerContent`,
      idealPriceUnit: `globalCostPerContent / (1 - ${simulation.global.targetMargin})`
    },
    globalParams: simulation.global,
    previewKPIsBefore: realKPIs,
    previewKPIsAfter: simResult.kpis
  };
};