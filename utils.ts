import { STANDARD_MONTHS } from './constants';

export const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercent = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '0%';
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
};

export const sortMonths = (months: string[]): string[] => {
  return [...months].sort((a, b) => {
    // Busca a posição do mês na lista oficial (constants.ts)
    const indexA = STANDARD_MONTHS.indexOf(a);
    const indexB = STANDARD_MONTHS.indexOf(b);
    
    // Se não encontrar (ex: mês de outro ano não cadastrado), joga pro final
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    
    return indexA - indexB;
  });
};

export const getMonthComparableValue = (monthStr: string): number => {
  const index = STANDARD_MONTHS.indexOf(monthStr);
  return index === -1 ? 999 : index;
};
