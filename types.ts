
// --- ENTIDADES NORMALIZADAS (Database Structure) ---

export interface ClientContract {
  id: string; // ID único do Contrato (ex: 'contract-1')
  Cliente: string;
  Status_Contrato: 'Ativo' | 'Inativo';
  Data_Inicio?: string; // YYYY-MM-DD
  Data_Renovacao?: string; // YYYY-MM-DD
  Dia_Pagamento?: number;
  Descricao_Servico?: string;
  Valor_Sugerido_Renovacao?: number;
  Origem?: 'Indicação' | 'Ads' | 'Outbound' | 'Orgânico' | 'Parceria' | 'Outros';
}

export interface ClientMonthlyResult {
  id: string; // ID único do Registro Mensal (ex: 'monthly-1-jan')
  contractId: string; // Foreign Key para ClientContract
  Mes_Referencia: string;
  Receita_Mensal_BRL: number;
  Conteudos_Contratados: number;
  Conteudos_Entregues: number;
  Conteudos_Nao_Entregues: number;
  Status_Mensal: 'Ativo' | 'Inativo'; // Se o cliente operou neste mês
  Status_Detalhe?: string;
}

export interface MonthlyGrowthData {
  month: string;
  adSpend: number; // Investimento em Marketing (Ads + Ferramentas de Venda)
  leads?: number;
}

// --- VIEWS (UI Consumption) ---

// ClientData agora é uma "View" (Join) de Contract + MonthlyResult
export interface ClientData extends ClientContract, Omit<ClientMonthlyResult, 'id' | 'contractId'> {
  id: string; // ID do MonthlyResult (para chaves de lista)
  contractId: string; // ID do Contrato
  
  // Campos calculados pela Engine
  Receita_Liquida_Apos_Imposto_BRL: number;
  profit?: number;
  netRevenue?: number;
  idealRevenue?: number;
  margin?: number;
  
  // Compatibilidade de nomes para UI existente
  Status_Cliente: 'Ativo' | 'Inativo'; // Mapeia para Status_Mensal
}

export interface CostData {
  id: string;
  Tipo_Custo: string;
  Mes_Referencia: string;
  Valor_Mensal_BRL: number;
  Ativo_no_Mes: boolean;
  // Categorização Estrita (Adeus Strings Mágicas)
  Categoria: 'Operacional' | 'Administrativo' | 'Impostos' | 'Outros'; 
  Tipo?: 'Fixo' | 'Variável' | 'Extraordinário';
}

export interface MarketBenchmarks {
  maxChurn: number; // ex: 0.05 (5%)
  minMargin: number; // ex: 0.20 (20%)
  minLtvCac: number; // ex: 3.0
  safeCapacityLimit: number; // ex: 0.85 (85%)
}

export interface GlobalSettings {
  taxRate: number;
  targetMargin: number;
  maxProductionCapacity: number;
  allocationMethod: 'perDelivered' | 'perContracted' | 'equalShare';
  inflationFactor: number;
  seasonalMultiplier: number;
  tolerancePercentage: number;
  oneTimeAdjustments: number;
  manualCostPerContentOverride: number;
  benchmarks: MarketBenchmarks; // Nova configuração de mercado
}

export interface FilterState {
  month: string;
  status: string;
  client: string;
}
