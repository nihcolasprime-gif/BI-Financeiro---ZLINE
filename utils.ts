
import { STANDARD_MONTHS } from './constants';

// --- FORMATTERS CACHE (Performance Optimization) ---
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export const formatCurrency = (value: number) => {
  return currencyFormatter.format(value);
};

export const formatPercent = (value: number) => {
  return percentFormatter.format(value);
};

export const calculateRevenuePerContent = (netRevenue: number, delivered: number) => {
  if (delivered === 0) return 0;
  return netRevenue / delivered;
};

/**
 * Converte strings numéricas (ex: "1.200,50", "1200.50", "-50,00") para float Javascript.
 * Trata casos de formatação brasileira e internacional.
 */
export const safeFloat = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return value;

  // Remove espaços
  let str = String(value).trim();

  // Detecção heurística de formato PT-BR (se tem vírgula como separador decimal)
  if (str.includes(',') && !str.includes('e')) { // 'e' check prevents scientific notation confusion logic
     // Remove pontos de milhar (ex: 1.000,00 -> 1000,00)
     str = str.replace(/\./g, '');
     // Troca vírgula por ponto (ex: 1000,00 -> 1000.00)
     str = str.replace(',', '.');
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

// --- SORTING HELPERS ---

export const getMonthIndex = (monthName: string): number => {
  // Case-insensitive lookup for robustness
  const normalizedInput = monthName.trim().toLowerCase();
  const index = STANDARD_MONTHS.findIndex(m => m.toLowerCase() === normalizedInput);
  return index === -1 ? 99 : index; // Fallback to end if not found
};

/**
 * Converte uma string "Mês/Ano" em um valor numérico comparável (ex: "Janeiro/2025" -> 202500)
 * Isso torna a ordenação extremamente rápida (comparação numérica simples).
 */
export const getMonthComparableValue = (monthStr: string): number => {
  if (!monthStr) return 0;
  const parts = monthStr.split('/');
  if (parts.length !== 2) return 0;
  
  const monthIndex = getMonthIndex(parts[0]);
  const year = parseInt(parts[1], 10);
  
  if (isNaN(year)) return 0;
  
  // Formato YYYYMM (onde MM é 0-11 ou 0-99)
  // Multiplicamos por 100 para dar espaço aos meses
  return (year * 100) + monthIndex;
};

export const sortMonths = (months: string[]): string[] => {
  return [...months].sort((a, b) => {
    return getMonthComparableValue(a) - getMonthComparableValue(b);
  });
};

export const escapeCsvValue = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return '';
  let str = String(value);
  
  // Prevent CSV Formula Injection (Excel/Sheets vulnerability)
  if (['=', '+', '-', '@'].includes(str.charAt(0))) {
    str = "'" + str;
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};
