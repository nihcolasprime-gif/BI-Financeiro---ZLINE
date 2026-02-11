import { ClientContract, ClientMonthlyResult, CostData, MonthlyGrowthData } from './types';

export const STANDARD_MONTHS = [
  'Jan/2026', 'Fev/2026', 'Mar/2026', 'Abr/2026', 'Mai/2026', 'Jun/2026',
  'Jul/2026', 'Ago/2026', 'Set/2026', 'Out/2026', 'Nov/2026', 'Dez/2026'
];

export const MONTHS = [...STANDARD_MONTHS].reverse();

// Dados Iniciais (Fallback para quando o Banco estiver vazio)
export const INITIAL_CONTRACTS: ClientContract[] = [
  {
    id: 'contract-1',
    Cliente: 'Exemplo Agência (Antigo)',
    Status_Contrato: 'Ativo',
    Data_Inicio: '2025-01-10',
    Data_Renovacao: '2026-01-10',
    Dia_Pagamento: 15,
    Descricao_Servico: 'Gestão de Tráfego + Social Media',
    Valor_Sugerido_Renovacao: 2500,
    Origem: 'Indicação',
    Tipo_Servico: 'Agency'
  },
  {
    id: 'contract-2',
    Cliente: 'Cliente UI-Z (Novo)',
    Status_Contrato: 'Ativo',
    Data_Inicio: '2026-02-01', // Começou este mês
    Data_Renovacao: '2027-02-01',
    Dia_Pagamento: 5,
    Descricao_Servico: 'Site Profissional por Assinatura',
    Valor_Sugerido_Renovacao: 49.90, // Valor base
    Origem: 'Ads',
    Tipo_Servico: 'UI-Z',
    UIZ_Setup_Fee: 99.90,
    UIZ_Valor_Mensal: 49.90
  }
];

export const INITIAL_MONTHLY_RESULTS: ClientMonthlyResult[] = [
  // Exemplo de resultado já fechado
  {
    id: 'result-1',
    contractId: 'contract-1',
    Mes_Referencia: 'Jan/2026',
    Receita_Mensal_BRL: 2500,
    Conteudos_Contratados: 12,
    Conteudos_Entregues: 12,
    Conteudos_Nao_Entregues: 0,
    Status_Mensal: 'Ativo',
    Status_Detalhe: 'Entregue completo'
  }
];

export const ALL_COSTS: CostData[] = [
  {
    id: 'cost-1',
    Tipo_Custo: 'Ferramentas (Vercel, Supabase)',
    Mes_Referencia: 'Fev/2026',
    Valor_Mensal_BRL: 120, // $20 USD aprox
    Ativo_no_Mes: true,
    Categoria: 'Operacional',
    Tipo: 'Fixo'
  },
  {
    id: 'cost-2',
    Tipo_Custo: 'Prolabore Sócios',
    Mes_Referencia: 'Fev/2026',
    Valor_Mensal_BRL: 2000,
    Ativo_no_Mes: true,
    Categoria: 'Administrativo',
    Tipo: 'Fixo'
  }
];

export const INITIAL_GROWTH_DATA: MonthlyGrowthData[] = [
  { month: 'Jan/2026', adSpend: 500, leads: 15 },
  { month: 'Fev/2026', adSpend: 800, leads: 25 }
];
