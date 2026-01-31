
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  FileDown, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Trash2, PlusCircle, Link2, Trash, Plus, Landmark, Calendar, RefreshCw, Sheet, XCircle, Ban, TrendingUp, Info
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ClientData, CostData, GlobalSettings, ClientContract, ClientMonthlyResult, MonthlyGrowthData } from '../types';
import { formatPercent, sortMonths, escapeCsvValue, getMonthComparableValue, safeFloat } from '../utils';
import { STANDARD_MONTHS } from '../constants';

interface ConfigurationsPanelProps {
  viewClients: ClientData[];
  contracts: ClientContract[];
  onUpdateContracts: (contracts: ClientContract[]) => void;
  monthlyResults: ClientMonthlyResult[];
  onUpdateResults: (results: ClientMonthlyResult[]) => void;
  allCosts: CostData[];
  onUpdateCosts: (costs: CostData[]) => void;
  months: string[];
  onUpdateMonths: (months: string[]) => void;
  settings: GlobalSettings;
  onUpdateSettings: (settings: GlobalSettings) => void;
  growthData?: MonthlyGrowthData[];
  onUpdateGrowth?: (data: MonthlyGrowthData[]) => void;
  selectedMonth: string;
  privacyMode?: boolean;
}

// --- PERFORMANCE COMPONENTS ---

/**
 * Enhanced Input Component
 * Handles "Text" mode for unrestricted typing of numbers (e.g. "1.500,00").
 * Parses and sanitizes on Blur.
 */
const CellInput = React.memo(({ value, onChange, isNumeric = false, className, placeholder, ...props }: any) => {
  const [localValue, setLocalValue] = useState<string | number>(value);
  const [error, setError] = useState(false);
  
  // Sync if parent updates (e.g. data refresh or cancel)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    let finalValue = localValue;

    if (isNumeric) {
      // Parse flexible number format (PT-BR or EN-US)
      const parsed = safeFloat(localValue);
      
      // If valid number, update parent. If NaN, revert or set to 0.
      if (!isNaN(parsed)) {
        finalValue = parsed;
        setError(false);
      } else {
        setError(true);
        finalValue = 0; // Default fallback
      }
    }

    // Only update parent if value actually changed
    if (String(finalValue) !== String(value)) {
      onChange(finalValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  return (
    <input
      type="text" // Always use text to allow "," and "-" freely during typing
      className={`${className} ${error ? 'ring-2 ring-rose-300 bg-rose-50' : ''}`}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        setError(false);
      }}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      {...props}
    />
  );
});

const TabSubBtn = ({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
      active 
        ? 'bg-slate-900 text-white shadow-md' 
        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
    }`}
  >
    {label}
  </button>
);

export const ConfigurationsPanel: React.FC<ConfigurationsPanelProps> = ({
  viewClients, contracts, monthlyResults, allCosts, months, settings, growthData = [], selectedMonth,
  onUpdateContracts, onUpdateResults, onUpdateCosts, onUpdateSettings, onUpdateMonths, onUpdateGrowth,
  privacyMode = false
}) => {
  const [activeSection, setActiveSection] = useState<'clients' | 'costs' | 'global'>('clients');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [newMonthName, setNewMonthName] = useState(STANDARD_MONTHS[0]);
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());
  const reportRef = useRef<HTMLDivElement>(null);

  const monthCosts = useMemo(() => allCosts.filter(c => c.Mes_Referencia === selectedMonth), [allCosts, selectedMonth]);

  const currentGrowth = useMemo(() => 
    growthData.find(g => g.month === selectedMonth) || { month: selectedMonth, adSpend: 0, leads: 0 },
  [growthData, selectedMonth]);

  const audit = useMemo(() => {
    const grossRevenue = viewClients.reduce((s, c) => s + (Number(c.Receita_Mensal_BRL) || 0), 0);
    const netRevenue = grossRevenue * (1 - settings.taxRate);
    const activeCostsInMonth = monthCosts.filter(c => c.Ativo_no_Mes);
    const totalCost = activeCostsInMonth.reduce((s, c) => s + (Number(c.Valor_Mensal_BRL) || 0), 0);
    const margin = netRevenue !== 0 ? (netRevenue - totalCost) / netRevenue : 0;
    
    const issues: { type: 'error' | 'warning' | 'info', message: string, icon: any }[] = [];
    if (margin < 0) issues.push({ type: 'error', message: 'Margem Negativa Detectada.', icon: <AlertCircle size={14} /> });
    else if (margin < settings.targetMargin) issues.push({ type: 'warning', message: `Margem abaixo do alvo (${formatPercent(settings.targetMargin)}).`, icon: <AlertTriangle size={14} /> });

    const contractsWithResults = new Set(viewClients.map(c => c.contractId));
    const missingContracts = contracts.filter(c => c.Status_Contrato === 'Ativo' && !contractsWithResults.has(c.id)).length;
    
    if (missingContracts > 0) {
      issues.push({ type: 'info', message: `${missingContracts} contratos ativos sem lançamento neste mês.`, icon: <RefreshCw size={14} /> });
    }

    return { isHealthy: issues.filter(i => i.type === 'error').length === 0, issues };
  }, [viewClients, monthCosts, settings, contracts]);

  const handleUpdateContract = useCallback((contractId: string, field: keyof ClientContract, value: any) => {
    onUpdateContracts(contracts.map(c => c.id === contractId ? { ...c, [field]: value } : c));
  }, [contracts, onUpdateContracts]);

  const handleUpdateMonthly = useCallback((monthlyId: string, field: keyof ClientMonthlyResult, value: any) => {
    onUpdateResults(monthlyResults.map(r => r.id === monthlyId ? { ...r, [field]: value } : r));
  }, [monthlyResults, onUpdateResults]);

  const handleUpdateGrowth = useCallback((field: keyof MonthlyGrowthData, value: number) => {
    if (!onUpdateGrowth) return;
    
    const existingIndex = growthData.findIndex(g => g.month === selectedMonth);
    let newData = [...growthData];
    
    if (existingIndex >= 0) {
        newData[existingIndex] = { ...newData[existingIndex], [field]: value };
    } else {
        newData.push({ month: selectedMonth, adSpend: 0, leads: 0, [field]: value });
    }
    
    onUpdateGrowth(newData);
  }, [growthData, selectedMonth, onUpdateGrowth]);

  const handleSmartUpdate = useCallback((clientView: ClientData, field: keyof ClientData, val: any) => {
    if (['Cliente', 'Data_Inicio', 'Data_Renovacao', 'Dia_Pagamento', 'Descricao_Servico', 'Valor_Sugerido_Renovacao', 'Origem'].includes(field)) {
       handleUpdateContract(clientView.contractId, field as keyof ClientContract, val);
    } 
    else if (['Receita_Mensal_BRL', 'Conteudos_Contratados', 'Conteudos_Entregues', 'Status_Cliente'].includes(field)) {
       const targetField = field === 'Status_Cliente' ? 'Status_Mensal' : field as keyof ClientMonthlyResult;
       handleUpdateMonthly(clientView.id, targetField, val);
    }
  }, [handleUpdateContract, handleUpdateMonthly]);

  const handleUpdateCost = (id: string, field: keyof CostData, rawValue: any) => {
    onUpdateCosts(allCosts.map(c => c.id === id ? { ...c, [field]: rawValue } : c));
  };

  const handleAddClient = () => {
    const newContractId = `c-${Date.now()}`;
    const newContract: ClientContract = {
      id: newContractId,
      Cliente: 'Novo Cliente',
      Status_Contrato: 'Ativo',
      Data_Inicio: new Date().toISOString().split('T')[0],
      Data_Renovacao: '',
      Dia_Pagamento: 5,
      Descricao_Servico: '',
      Valor_Sugerido_Renovacao: 0,
      Origem: 'Indicação'
    };
    const newMonthly: ClientMonthlyResult = {
      id: `m-${Date.now()}`,
      contractId: newContractId,
      Mes_Referencia: selectedMonth,
      Status_Mensal: 'Ativo',
      Receita_Mensal_BRL: 0,
      Conteudos_Contratados: 0,
      Conteudos_Entregues: 0,
      Conteudos_Nao_Entregues: 0
    };
    onUpdateContracts([...contracts, newContract]);
    onUpdateResults([...monthlyResults, newMonthly]);
  };

  const handleSyncContracts = () => {
    const existingContractIds = new Set(viewClients.map(c => c.contractId));
    const missingContracts = contracts.filter(c => c.Status_Contrato === 'Ativo' && !existingContractIds.has(c.id));

    if (missingContracts.length === 0) return alert("Todos os contratos ativos já possuem lançamento neste mês.");

    if (window.confirm(`Detectados ${missingContracts.length} contratos ativos sem lançamento em ${selectedMonth}. Deseja inicializá-los agora?`)) {
      const resultsByContract = new Map<string, ClientMonthlyResult[]>();
      monthlyResults.forEach(r => {
        if (!resultsByContract.has(r.contractId)) {
          resultsByContract.set(r.contractId, []);
        }
        resultsByContract.get(r.contractId)?.push(r);
      });

      const newResults: ClientMonthlyResult[] = [];
      
      missingContracts.forEach(contract => {
        const contractHistory = resultsByContract.get(contract.id)?.filter(r => r.Mes_Referencia !== selectedMonth) || [];
        const sortedHistory = [...contractHistory].sort((a, b) => getMonthComparableValue(a.Mes_Referencia) - getMonthComparableValue(b.Mes_Referencia));
        const lastResult = sortedHistory.length > 0 ? sortedHistory[sortedHistory.length - 1] : null;

        newResults.push({
          id: `m-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          contractId: contract.id,
          Mes_Referencia: selectedMonth,
          Status_Mensal: 'Ativo',
          Receita_Mensal_BRL: lastResult ? lastResult.Receita_Mensal_BRL : (contract.Valor_Sugerido_Renovacao || 0),
          Conteudos_Contratados: lastResult ? lastResult.Conteudos_Contratados : 0,
          Conteudos_Entregues: 0,
          Conteudos_Nao_Entregues: 0
        });
      });

      onUpdateResults([...monthlyResults, ...newResults]);
    }
  };

  const handleAddCost = () => {
    const newCost: CostData = {
      id: `cost-${Date.now()}`,
      Tipo_Custo: 'Nova Despesa',
      Mes_Referencia: selectedMonth,
      Valor_Mensal_BRL: 0,
      Ativo_no_Mes: true,
      Categoria: 'Operacional',
      Tipo: 'Variável'
    };
    onUpdateCosts([...allCosts, newCost]);
  };

  const handleRemoveFromMonth = (monthlyId: string) => {
    if (window.confirm("CONFIRMAÇÃO: Remover este lançamento do mês atual?\n\nO contrato original do cliente permanecerá salvo, apenas os dados deste mês serão removidos.")) {
      onUpdateResults(monthlyResults.filter(r => r.id !== monthlyId));
    }
  };

  // --- DELETE FUNCTIONALITY IMPLEMENTATION ---
  const handleDeleteContractMaster = (contractId: string, name: string) => {
    if (window.confirm(`PERIGO - EXCLUSÃO DE CLIENTE\n\nVocê está prestes a excluir permanentemente o cliente "${name}".\n\nIsso apagará:\n1. O contrato principal.\n2. TODO o histórico financeiro em TODOS os meses registrados.\n\nEsta ação é irreversível. Deseja continuar?`)) {
      // 1. Remove the Master Contract
      onUpdateContracts(contracts.filter(c => c.id !== contractId));
      
      // 2. Remove All Associated Monthly Results (Cascade Delete)
      onUpdateResults(monthlyResults.filter(r => r.contractId !== contractId));
    }
  };

  const handleDeleteCost = (id: string) => {
    if (window.confirm("Excluir esta despesa permanentemente?")) {
      onUpdateCosts(allCosts.filter(c => c.id !== id));
    }
  };

  const handleAddMonth = () => {
    if (newMonthYear < 2020 || newMonthYear > 2035) {
       alert("Por favor, insira um ano válido entre 2020 e 2035.");
       return;
    }

    const monthKey = `${newMonthName}/${newMonthYear}`;
    if (months.includes(monthKey)) {
      alert("Este mês já existe na lista.");
      return;
    }
    onUpdateMonths([...months, monthKey]);
  };

  const handleDeleteMonth = (monthToDelete: string) => {
    if (months.length <= 1) return alert("É necessário ter pelo menos um mês no sistema.");
    
    if (confirm(`PERIGO: Excluir o mês "${monthToDelete}"?\n\nTodos os lançamentos de receita e custos deste mês serão apagados permanentemente.`)) {
      onUpdateMonths(months.filter(m => m !== monthToDelete));
      onUpdateResults(monthlyResults.filter(r => r.Mes_Referencia !== monthToDelete));
      onUpdateCosts(allCosts.filter(c => c.Mes_Referencia !== monthToDelete));
    }
  };

  const generatePDFReport = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPDF(true);