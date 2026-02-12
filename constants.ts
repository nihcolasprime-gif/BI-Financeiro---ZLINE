import { ClientContract, ClientMonthlyResult, CostData, MonthlyGrowthData } from './types';

// Calendário 2026
export const STANDARD_MONTHS = [
  'Jan/2026', 'Fev/2026', 'Mar/2026', 'Abr/2026', 'Mai/2026', 'Jun/2026',
  'Jul/2026', 'Ago/2026', 'Set/2026', 'Out/2026', 'Nov/2026', 'Dez/2026'
];

export const MONTHS = [...STANDARD_MONTHS].reverse();

// Listas de apoio para os selects
export const COST_CATEGORIES = ['Operacional', 'Administrativo', 'Impostos', 'Outros'] as const;
export const CONTRACT_ORIGINS = ['Indicação', 'Ads', 'Outbound', 'Orgânico', 'Parceria', 'Outros'] as const;

// Arrays vazios: O sistema inicia sem nenhum dado fake.
export const INITIAL_CONTRACTS: ClientContract[] = [];
export const INITIAL_MONTHLY_RESULTS: ClientMonthlyResult[] = [];
export const ALL_COSTS: CostData[] = [];
export const INITIAL_GROWTH_DATA: MonthlyGrowthData[] = [];
