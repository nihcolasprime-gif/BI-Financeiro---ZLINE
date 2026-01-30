import { ClientData, CostData } from './types';

// --- DEZEMBRO 2025 ---
const CLIENTS_DEZEMBRO_2025: ClientData[] = [
  {
    id: 'dez-1', Cliente: 'Alexandre', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 850, Conteudos_Contratados: 10, Conteudos_Entregues: 10, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 765 // 850 * 0.9
  },
  {
    id: 'dez-2', Cliente: 'Deivid', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 1700, Conteudos_Contratados: 31, Conteudos_Entregues: 31, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 1530 // 1700 * 0.9
  },
  {
    id: 'dez-3', Cliente: 'Alan', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 350, Conteudos_Contratados: 8, Conteudos_Entregues: 8, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 315 // 350 * 0.9
  },
  {
    id: 'dez-4', Cliente: 'Leo', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 550, Conteudos_Contratados: 12, Conteudos_Entregues: 12, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 495 // 550 * 0.9
  },
  {
    id: 'dez-5', Cliente: 'Renan', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 750, Conteudos_Contratados: 14, Conteudos_Entregues: 14, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 675 // 750 * 0.9
  },
  {
    id: 'dez-6', Cliente: 'Alex', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 560, Conteudos_Contratados: 5, Conteudos_Entregues: 5, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 504 // 560 * 0.9
  },
  {
    id: 'dez-7', Cliente: 'Cláudio', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 700, Conteudos_Contratados: 7, Conteudos_Entregues: 7, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 630 // 700 * 0.9
  },
  {
    id: 'dez-8', Cliente: 'Olimpia', Mes_Referencia: 'Dezembro/2025', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 900, Conteudos_Contratados: 8, Conteudos_Entregues: 8, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 810 // 900 * 0.9
  }
];

const CUSTOS_DEZEMBRO_2025: CostData[] = [
  { id: 'cd-1', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Pro-labore', Valor_Mensal_BRL: 3000, Ativo_no_Mes: true },
  { id: 'cd-2', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Editor', Valor_Mensal_BRL: 2000, Ativo_no_Mes: true },
  { id: 'cd-3', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Fotografo', Valor_Mensal_BRL: 480, Ativo_no_Mes: true },
  { id: 'cd-4', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'DAS', Valor_Mensal_BRL: 83, Ativo_no_Mes: true },
  { id: 'cd-5', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'CapCut', Valor_Mensal_BRL: 70, Ativo_no_Mes: true },
  { id: 'cd-6', Mes_Referencia: 'Dezembro/2025', Tipo_Custo: 'Canva', Valor_Mensal_BRL: 35, Ativo_no_Mes: true },
];

// --- JANEIRO 2026 ---
const CLIENTS_JANEIRO_2026: ClientData[] = [
  {
    id: 'jan-1', Cliente: 'Elbeton', Mes_Referencia: 'Janeiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 500, Conteudos_Contratados: 10, Conteudos_Entregues: 10, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 450, // 500 * 0.9
  },
  {
    id: 'jan-2', Cliente: 'Lucas', Mes_Referencia: 'Janeiro/2026', Status_Cliente: 'Ativo', Status_Detalhe: 'Permuta',
    Receita_Mensal_BRL: 0, Conteudos_Contratados: 10, Conteudos_Entregues: 5, Conteudos_Nao_Entregues: 5,
    Receita_Liquida_Apos_Imposto_BRL: 0,
  },
  {
    id: 'jan-3', Cliente: 'Deivid', Mes_Referencia: 'Janeiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 1000, Conteudos_Contratados: 36, Conteudos_Entregues: 35, Conteudos_Nao_Entregues: 1,
    Receita_Liquida_Apos_Imposto_BRL: 900, // 1000 * 0.9
  },
  {
    id: 'jan-4', Cliente: 'Olimpia', Mes_Referencia: 'Janeiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 900, Conteudos_Contratados: 30, Conteudos_Entregues: 16, Conteudos_Nao_Entregues: 14,
    Receita_Liquida_Apos_Imposto_BRL: 810, // 900 * 0.9
  },
  {
    id: 'jan-5', Cliente: 'Alex', Mes_Referencia: 'Janeiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 560, Conteudos_Contratados: 16, Conteudos_Entregues: 5, Conteudos_Nao_Entregues: 11,
    Receita_Liquida_Apos_Imposto_BRL: 504, // 560 * 0.9
  },
  {
    id: 'jan-6', Cliente: 'Alexandre', Mes_Referencia: 'Janeiro/2026', Status_Cliente: 'Inativo', Status_Detalhe: 'Desligado no mês',
    Receita_Mensal_BRL: 850, Conteudos_Contratados: 20, Conteudos_Entregues: 2, Conteudos_Nao_Entregues: 18,
    Receita_Liquida_Apos_Imposto_BRL: 765, // 850 * 0.9
  },
  {
    id: 'jan-7', Cliente: 'Leo', Mes_Referencia: 'Janeiro/2026', Status_Cliente: 'Inativo',
    Receita_Mensal_BRL: 550, // Updated to 550 to match the 4360 Total Gross Revenue requirement
    Conteudos_Contratados: 20, Conteudos_Entregues: 0, Conteudos_Nao_Entregues: 20,
    Receita_Liquida_Apos_Imposto_BRL: 495 // 550 * 0.9
  }
];

const CUSTOS_JANEIRO_2026: CostData[] = [
  { id: 'c1', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'Pro-labore', Valor_Mensal_BRL: 3000, Ativo_no_Mes: true },
  { id: 'c2', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'Editor', Valor_Mensal_BRL: 2600, Ativo_no_Mes: false }, // Explicitly 2600 but listed as "Não" active in prompt, keeping purely for record or enabling if needed
  { id: 'c3', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'ChatGPT', Valor_Mensal_BRL: 99.99, Ativo_no_Mes: true },
  { id: 'c4', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'Canva', Valor_Mensal_BRL: 35, Ativo_no_Mes: true },
  { id: 'c5', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'CapCut', Valor_Mensal_BRL: 65.90, Ativo_no_Mes: true },
  { id: 'c6', Mes_Referencia: 'Janeiro/2026', Tipo_Custo: 'Deslocamento', Valor_Mensal_BRL: 300, Ativo_no_Mes: true },
];

// --- FEVEREIRO 2026 ---
const CLIENTS_FEVEREIRO_2026: ClientData[] = [
  {
    id: 'feb-1', Cliente: 'Alex', Mes_Referencia: 'Fevereiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 560, Conteudos_Contratados: 16, Conteudos_Entregues: 16, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 504, // 560 * 0.9
  },
  {
    id: 'feb-2', Cliente: 'Lucas', Mes_Referencia: 'Fevereiro/2026', Status_Cliente: 'Ativo', Status_Detalhe: 'Permuta',
    Receita_Mensal_BRL: 0, Conteudos_Contratados: 15, Conteudos_Entregues: 15, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 0,
  },
  {
    id: 'feb-3', Cliente: 'Deivid', Mes_Referencia: 'Fevereiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 1000, Conteudos_Contratados: 36, Conteudos_Entregues: 36, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 900, // 1000 * 0.9
  },
  {
    id: 'feb-4', Cliente: 'Olimpia', Mes_Referencia: 'Fevereiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 350, Conteudos_Contratados: 44, Conteudos_Entregues: 44, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 315, // 350 * 0.9
  },
  {
    id: 'feb-5', Cliente: 'Elbeton', Mes_Referencia: 'Fevereiro/2026', Status_Cliente: 'Ativo',
    Receita_Mensal_BRL: 500, Conteudos_Contratados: 10, Conteudos_Entregues: 10, Conteudos_Nao_Entregues: 0,
    Receita_Liquida_Apos_Imposto_BRL: 450, // 500 * 0.9
  }
];

const CUSTOS_FEVEREIRO_2026: CostData[] = [
  { id: 'fc1', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'Pro-labore', Valor_Mensal_BRL: 3000, Ativo_no_Mes: true },
  { id: 'fc2', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'Editor', Valor_Mensal_BRL: 2600, Ativo_no_Mes: true },
  { id: 'fc3', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'ChatGPT', Valor_Mensal_BRL: 99.99, Ativo_no_Mes: true },
  { id: 'fc4', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'Canva', Valor_Mensal_BRL: 35, Ativo_no_Mes: true },
  { id: 'fc5', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'CapCut', Valor_Mensal_BRL: 65.90, Ativo_no_Mes: true },
  { id: 'fc6', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'Deslocamento', Valor_Mensal_BRL: 300, Ativo_no_Mes: true },
  { id: 'fc7', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'Contador', Valor_Mensal_BRL: 1500, Ativo_no_Mes: true },
  { id: 'fc8', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'Estorno Cliente Leo', Valor_Mensal_BRL: 907.50, Ativo_no_Mes: true },
  { id: 'fc9', Mes_Referencia: 'Fevereiro/2026', Tipo_Custo: 'Estorno Editor Antigo', Valor_Mensal_BRL: 2000, Ativo_no_Mes: true },
];

export const ALL_CLIENTS = [...CLIENTS_DEZEMBRO_2025, ...CLIENTS_JANEIRO_2026, ...CLIENTS_FEVEREIRO_2026];
export const ALL_COSTS = [...CUSTOS_DEZEMBRO_2025, ...CUSTOS_JANEIRO_2026, ...CUSTOS_FEVEREIRO_2026];

export const MONTHS = ['Dezembro/2025', 'Janeiro/2026', 'Fevereiro/2026'];
export const STATUSES = ['Todos', 'Ativo', 'Inativo'];