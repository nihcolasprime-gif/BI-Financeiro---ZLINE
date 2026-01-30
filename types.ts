export interface ClientData {
  id: string;
  Cliente: string;
  Mes_Referencia: string;
  Status_Cliente: 'Ativo' | 'Inativo';
  Status_Detalhe?: string;
  Receita_Mensal_BRL: number;
  Conteudos_Contratados: number;
  Conteudos_Entregues: number;
  Conteudos_Nao_Entregues: number;
  Receita_Liquida_Apos_Imposto_BRL: number;
}

export interface CostData {
  id: string;
  Tipo_Custo: string;
  Mes_Referencia: string;
  Valor_Mensal_BRL: number;
  Ativo_no_Mes: boolean;
  Categoria?: 'Operacional' | 'Admin' | 'Outros';
  Tipo?: 'Fixo' | 'Variável' | 'Extraordinário';
}

export interface GlobalSettings {
  taxRate: number;
  targetMargin: number;
  maxProductionCapacity: number;
  allocationMethod: 'perDelivered' | 'perContracted' | 'equalShare';
}

export interface FilterState {
  month: string;
  status: string;
  client: string;
}