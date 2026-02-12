// --- ENTIDADES DO BANCO DE DADOS ---

export interface ClientContract {
  id: string; // UUID do Supabase
  Cliente: string;
  Status_Contrato: 'Ativo' | 'Inativo';
  Data_Inicio?: string;
  Data_Renovacao?: string;
  Dia_Pagamento?: number;
  Descricao_Servico?: string;
  Valor_Sugerido_Renovacao?: number;
  Origem?: 'Indicação' | 'Ads' | 'Outbound' | 'Orgânico' | 'Parceria' | 'Outros';

  // --- CAMPOS ESTRATÉGICOS (MOLHO NOVO) ---
  Tipo_Servico: 'Agency' | 'UI-Z'; 
  UIZ_Setup_Fee?: number;   // Taxa de entrada do UI-Z
  UIZ_Valor_Mensal?: number; // Assinatura recorrente
}

export interface ClientMonthlyResult {
  id: string; 
  contractId: string;
  Mes_Referencia: string; // Ex: 'Fev/2026'
  Receita_Mensal_BRL: number;
  
  // --- CONTROLE FINANCEIRO REAL ---
  Status_Pagamento: 'Pago' | 'Pendente' | 'Atrasado'; 
  
  // Controle de Produção
  Conteudos_Contratados: number;
  Conteudos_Entregues: number;
  Conteudos_Nao_Entregues: number;
  Status_Mensal: 'Ativo' | 'Inativo';
  Status_Detalhe?: string;
}

// --- INFRAESTRUTURA FINANCEIRA ---

export interface CostData {
  id: string;
  Tipo_Custo: string;
  Mes_Referencia: string;
  Valor_Mensal_BRL: number;
  Ativo_no_Mes: boolean;
  Categoria: 'Operacional' | 'Administrativo' | 'Impostos' | 'Outros'; 
  Tipo?: 'Fixo' | 'Variável' | 'Extraordinário';
}

export interface MonthlyGrowthData {
  month: string;
  adSpend: number;
  leads?: number;
}

export interface GlobalSettings {
  taxRate: number;
  targetMargin: number;
  maxProductionCapacity: number;
  benchmarks: {
    maxChurn: number;
    minMargin: number;
    minLtvCac: number;
  };
}

// --- VIEWS (Para a Interface) ---

export interface ClientData extends ClientContract, Omit<ClientMonthlyResult, 'id' | 'contractId'> {
  id: string; // ID do registro mensal para chaves de lista
  contractId: string;
  Status_Cliente: 'Ativo' | 'Inativo';
  
  // Campos calculados pela Engine
  Receita_Liquida_Apos_Imposto_BRL: number;
  profit: number;
  margin: number;
}
