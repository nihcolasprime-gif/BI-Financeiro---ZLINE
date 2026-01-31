
import { ClientContract, ClientMonthlyResult, CostData, MonthlyGrowthData } from './types';

export const STANDARD_MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// --- INITIAL CONTRACTS (MASTER DATA) ---
export const INITIAL_CONTRACTS: ClientContract[] = [
  {
    id: 'c-alexandre', Cliente: 'Alexandre', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-01-10', Data_Renovacao: '2026-01-10', Dia_Pagamento: 5,
    Descricao_Servico: 'Criação de Conteúdo + Gestão de Tráfego', Valor_Sugerido_Renovacao: 950, Origem: 'Indicação'
  },
  {
    id: 'c-deivid', Cliente: 'Deivid', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-06-15', Data_Renovacao: '2026-06-15', Dia_Pagamento: 15,
    Descricao_Servico: 'Estratégia Digital + Produção Audiovisual', Valor_Sugerido_Renovacao: 1850, Origem: 'Ads'
  },
  {
    id: 'c-alan', Cliente: 'Alan', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-10-01', Data_Renovacao: '2026-04-01', Dia_Pagamento: 10,
    Descricao_Servico: 'Social Media Básico', Valor_Sugerido_Renovacao: 400, Origem: 'Indicação'
  },
  {
    id: 'c-leo', Cliente: 'Leo', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-03-20', Data_Renovacao: '2026-03-20', Dia_Pagamento: 20,
    Descricao_Servico: 'Criação de Conteúdo e Reels', Valor_Sugerido_Renovacao: 600, Origem: 'Outbound'
  },
  {
    id: 'c-renan', Cliente: 'Renan', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-11-12', Data_Renovacao: '2026-11-12', Dia_Pagamento: 12,
    Descricao_Servico: 'Assessoria de Comunicação Completa', Valor_Sugerido_Renovacao: 800, Origem: 'Parceria'
  },
  {
    id: 'c-alex', Cliente: 'Alex', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-09-05', Data_Renovacao: '2026-03-05', Dia_Pagamento: 5,
    Descricao_Servico: 'Gestão de LinkedIn', Valor_Sugerido_Renovacao: 650, Origem: 'Ads'
  },
  {
    id: 'c-claudio', Cliente: 'Cláudio', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-08-01', Data_Renovacao: '2026-02-01', Dia_Pagamento: 1,
    Descricao_Servico: 'Consultoria Mensal', Valor_Sugerido_Renovacao: 750, Origem: 'Indicação'
  },
  {
    id: 'c-olimpia', Cliente: 'Olimpia', Status_Contrato: 'Ativo',
    Data_Inicio: '2025-07-22', Data_Renovacao: '2026-07-22', Dia_Pagamento: 22,
    Descricao_Servico: 'Criação de Conteúdo Premium', Valor_Sugerido_Renovacao: 1100, Origem: 'Orgânico'
  },
  {
    id: 'c-elbeton', Cliente: 'Elbeton', Status_Contrato: 'Ativo',
    Data_Inicio: '2026-01-01', Data_Renovacao: '2027-01-01', Dia_Pagamento: 1,
    Descricao_Servico: 'Novo Contrato: Social Media', Valor_Sugerido_Renovacao: 550, Origem: 'Ads'
  },
  {
    id: 'c-lucas', Cliente: 'Lucas', Status_Contrato: 'Ativo',
    Data_Inicio: '2026-01-10', Data_Renovacao: '2026-07-10', Dia_Pagamento: 10,
    Descricao_Servico: 'Permuta Digital', Valor_Sugerido_Renovacao: 0, Origem: 'Parceria'
  }
];

// --- INITIAL MONTHLY RESULTS (TRANSACTIONAL DATA) ---
export const INITIAL_MONTHLY_RESULTS: ClientMonthlyResult[] = [
  // DEZEMBRO 2025
  { id: 'm-dez-1', contractId: 'c-alexandre', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 850, Conteudos_Contratados: 10, Conteudos_Entregues: 10, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-dez-2', contractId: 'c-deivid', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 1700, Conteudos_Contratados: 31, Conteudos_Entregues: 31, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-dez-3', contractId: 'c-alan', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 350, Conteudos_Contratados: 8, Conteudos_Entregues: 8, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-dez-4', contractId: 'c-leo', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 550, Conteudos_Contratados: 12, Conteudos_Entregues: 12, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-dez-5', contractId: 'c-renan', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 750, Conteudos_Contratados: 14, Conteudos_Entregues: 14, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-dez-6', contractId: 'c-alex', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 560, Conteudos_Contratados: 5, Conteudos_Entregues: 5, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-dez-7', contractId: 'c-claudio', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 700, Conteudos_Contratados: 7, Conteudos_Entregues: 7, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-dez-8', contractId: 'c-olimpia', Mes_Referencia: 'Dezembro/2025', Receita_Mensal_BRL: 900, Conteudos_Contratados: 8, Conteudos_Entregues: 8, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },

  // JANEIRO 2026
  { id: 'm-jan-1', contractId: 'c-elbeton', Mes_Referencia: 'Janeiro/2026', Receita_Mensal_BRL: 500, Conteudos_Contratados: 10, Conteudos_Entregues: 10, Conteudos_Nao_Entregues: 0, Status_Mensal: 'Ativo' },
  { id: 'm-jan-2', contractId: 'c-lucas', Mes_Referencia: 'Janeiro/2026', Receita_Mensal_BRL: 0, Conteudos_Contratados: 10, Conteudos_Entregues: 5, Conteudos_Nao_Entregues: 5, Status_Mensal: 'Ativo', Status_Detalhe: 'Permuta' },
  { id: 'm-jan-3', contractId: 'c-deivid', Mes_Referencia: 'Janeiro/2026', Receita_Mensal_BRL: 1000, Conteudos_Contratados: 36, Conteudos_Entregues: 35, Conteudos_Nao_Entregues: 1, Status_Mensal: 'Ativo' },
  { id: 'm-jan-4', contractId: 'c-olimpia', Mes_Referencia: 'Janeiro/2026', Receita_Mensal_BRL: 900, Conteudos_Contratados: 30, Conteudos_Entregues: 16, Conteudos_Nao_Entregues: 14, Status_Mensal: 'Ativo' },
  { id: 'm-jan-5', contractId: 'c-alex', Mes_Referencia: 'Janeiro/2026', Receita_Mensal_BRL: 560, Conteudos_Contratados: 16, Conteudos_Entregues: 5, Conteudos_Nao_Entregues: 11, Status_Mensal: 'Ativo' },
  // AlexandreChurned:
  { id: 'm-jan-6', contractId: 'c-alexandre', Mes_Referencia: 'Janeiro/2026', Receita_Mensal_BRL: 850, Conteudos_Contratados: 20, Conteudos_Entregues: 2, Conteudos_Nao_Entregues: 18, Status_Mensal: 'Inativo', Status_Detalhe: 'Desligado no mês' }
];

// --- COSTS WITH CATEGORIES ---
export const ALL_COSTS: CostData[] = [
  // Dezembro
  { id: 'cd-1', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Pro-labore', Valor_Mensal_BRL: 3000, Ativo_no_Mes: true, Categoria: 'Administrativo', Tipo: 'Fixo' },
  { id: 'cd-2', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Editor', Valor_Mensal_BRL: 2000, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Variável' },
  { id: 'cd-3', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Fotografo', Valor_Mensal_BRL: 480, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Variável' },
  { id: 'cd-4', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'DAS', Valor_Mensal_BRL: 83, Ativo_no_Mes: true, Categoria: 'Impostos', Tipo: 'Fixo' },
  { id: 'cd-5', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'CapCut', Valor_Mensal_BRL: 70, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Fixo' },
  { id: 'cd-6', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Canva', Valor_Mensal_BRL: 35, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Fixo' },
  // Janeiro
  { id: 'c1', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'Pro-labore', Valor_Mensal_BRL: 3000, Ativo_no_Mes: true, Categoria: 'Administrativo', Tipo: 'Fixo' },
  { id: 'c3', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'ChatGPT', Valor_Mensal_BRL: 99.99, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Fixo' },
  { id: 'c4', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'Canva', Valor_Mensal_BRL: 35, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Fixo' },
  { id: 'c5', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'CapCut', Valor_Mensal_BRL: 65.90, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Fixo' },
  { id: 'c6', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'Deslocamento', Valor_Mensal_BRL: 300, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Variável' },
];

export const INITIAL_GROWTH_DATA: MonthlyGrowthData[] = [
  { month: 'Dezembro/2025', adSpend: 500, leads: 45 },
  { month: 'Janeiro/2026', adSpend: 1200, leads: 82 },
];

export const MONTHS = ['Dezembro/2025', 'Janeiro/2026'];
