export interface ClientData {
  id: string;
  Cliente: string;
  Mes_Referencia: string;
  Status_Cliente: 'Ativo' | 'Inativo';
  Status_Detalhe?: string; // For things like "permuta", "desligado"
  Receita_Mensal_BRL: number;
  Conteudos_Contratados: number;
  Conteudos_Entregues: number;
  Conteudos_Nao_Entregues: number;
  Receita_Liquida_Apos_Imposto_BRL: number; // Calculated as roughly 90% in source, but we use explicit values
}

export interface CostData {
  id: string;
  Tipo_Custo: string;
  Mes_Referencia: string;
  Valor_Mensal_BRL: number;
  Ativo_no_Mes: boolean;
}

export interface FilterState {
  month: string;
  status: string;
  client: string;
}