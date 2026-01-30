
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { 
  FileDown, Loader2, CheckCircle2, AlertCircle, AlertTriangle, Trash2, PlusCircle, Link2, Trash, Plus, Landmark, Calendar, RefreshCw, Sheet, XCircle, Ban
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ClientData, CostData, GlobalSettings, ClientContract, ClientMonthlyResult } from '../types';
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
  viewClients, contracts, monthlyResults, allCosts, months, settings, selectedMonth,
  onUpdateContracts, onUpdateResults, onUpdateCosts, onUpdateSettings, onUpdateMonths,
  privacyMode = false
}) => {
  const [activeSection, setActiveSection] = useState<'clients' | 'costs' | 'global'>('clients');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [newMonthName, setNewMonthName] = useState(STANDARD_MONTHS[0]);
  const [newMonthYear, setNewMonthYear] = useState(new Date().getFullYear());
  const reportRef = useRef<HTMLDivElement>(null);

  const monthCosts = useMemo(() => allCosts.filter(c => c.Mes_Referencia === selectedMonth), [allCosts, selectedMonth]);

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

  const handleSmartUpdate = useCallback((clientView: ClientData, field: keyof ClientData, val: any) => {
    if (['Cliente', 'Data_Inicio', 'Data_Renovacao', 'Dia_Pagamento', 'Descricao_Servico', 'Valor_Sugerido_Renovacao'].includes(field)) {
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
      Valor_Sugerido_Renovacao: 0
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
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#f8fafc' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 210;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Relatorio_Auditoria_${selectedMonth.replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error("Erro ao gerar PDF", error);
      alert("Falha na geração do PDF.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Mes_Referencia", "Cliente", "Servico", "Status", "Receita_BRL", "Custo_Alocado_BRL", "Lucro_BRL", "Margem_%", "Entregas_Realizadas", "Entregas_Contratadas"];
    const rows = viewClients.map(c => [
      escapeCsvValue(c.Mes_Referencia),
      escapeCsvValue(c.Cliente),
      escapeCsvValue(c.Descricao_Servico),
      escapeCsvValue(c.Status_Cliente),
      c.Receita_Mensal_BRL.toFixed(2),
      ((c.netRevenue || 0) - (c.profit || 0)).toFixed(2),
      (c.profit || 0).toFixed(2),
      ((c.margin || 0) * 100).toFixed(2),
      c.Conteudos_Entregues,
      c.Conteudos_Contratados
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zline_export_${selectedMonth.replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const missingContractsCount = contracts.filter(c => c.Status_Contrato === 'Ativo' && !viewClients.find(v => v.contractId === c.id)).length;
  const displayMonths = useMemo(() => sortMonths(months), [months]);

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Header Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 glass-panel p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between border-none shadow-lg gap-4">
          <div className="flex gap-2 bg-slate-100/50 p-1.5 rounded-2xl overflow-x-auto max-w-full">
            <TabSubBtn active={activeSection === 'clients'} label="Gestão de Contratos" onClick={() => setActiveSection('clients')} />
            <TabSubBtn active={activeSection === 'costs'} label="Gestão de Custos" onClick={() => setActiveSection('costs')} />
            <TabSubBtn active={activeSection === 'global'} label="Sistema" onClick={() => setActiveSection('global')} />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-200 transition-all"
              title="Baixar CSV para Excel/Sheets"
            >
              <Sheet size={14} /> CSV
            </button>
            <button 
              onClick={generatePDFReport} 
              disabled={isGeneratingPDF}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 disabled:opacity-50"
            >
              {isGeneratingPDF ? <Loader2 className="animate-spin" size={14}/> : <FileDown size={14} />} 
              {isGeneratingPDF ? 'Gerando...' : 'PDF'}
            </button>
          </div>
        </div>
        <div className={`glass-panel p-6 rounded-[32px] border-none flex items-center gap-4 shadow-lg ${audit.isHealthy ? 'bg-emerald-50/50' : 'bg-rose-50/50'}`}>
           <div className={`p-3 rounded-2xl ${audit.isHealthy ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
             {audit.isHealthy ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
           </div>
           <div>
             <p className="text-[10px] font-black opacity-60 uppercase">Auditoria</p>
             <p className={`text-sm font-black ${audit.isHealthy ? 'text-emerald-700' : 'text-rose-700'}`}>
               {audit.isHealthy ? 'Sistema Saudável' : 'Atenção Requerida'}
             </p>
           </div>
        </div>
      </div>

      {audit.issues.length > 0 && (
         <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex flex-col gap-2">
            {audit.issues.map((issue, idx) => (
               <div key={idx} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <span className={issue.type === 'error' ? 'text-rose-500' : 'text-amber-500'}>{issue.icon}</span>
                  {issue.message}
               </div>
            ))}
         </div>
      )}

      {activeSection === 'clients' && (
        <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl border-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-6 py-5">Contrato (Master)</th>
                  <th className="px-4 py-5">Vigência (Master)</th>
                  <th className="px-4 py-5 text-center">Volume (Mensal)</th>
                  <th className="px-4 py-5 text-center">Pgto (Master)</th>
                  <th className="px-6 py-5 text-right">Financeiro (Mensal)</th>
                  <th className="px-6 py-5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {viewClients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <CellInput value={c.Cliente} onChange={(val: string) => handleSmartUpdate(c, 'Cliente', val)} className="font-bold outline-none bg-transparent w-full focus:text-indigo-600 block mb-1" />
                        <button 
                          onClick={() => handleDeleteContractMaster(c.contractId, c.Cliente)} 
                          title="Excluir Cliente e Histórico (Irreversível)" 
                          className="text-slate-200 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100 p-1"
                        >
                           <XCircle size={16} />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 group/desc">
                        <Link2 size={10} className="text-slate-300 group-hover/desc:text-indigo-400"/>
                        <CellInput value={c.Descricao_Servico || ''} placeholder="Serviço..." onChange={(val: string) => handleSmartUpdate(c, 'Descricao_Servico', val)} className="text-[10px] font-bold text-slate-400 outline-none bg-transparent w-full focus:text-indigo-400 uppercase tracking-tighter" />
                      </div>
                    </td>
                    <td className="px-4 py-4 min-w-[160px]">
                      <select 
                        value={c.Status_Cliente} 
                        onChange={e => handleSmartUpdate(c, 'Status_Cliente', e.target.value)}
                        className={`text-[9px] font-black uppercase rounded-lg px-2 py-0.5 mb-2 outline-none ${c.Status_Cliente === 'Ativo' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                      <div className="flex flex-col gap-1">
                         <CellInput type="date" value={c.Data_Inicio || ''} onChange={(val: string) => handleSmartUpdate(c, 'Data_Inicio', val)} className="bg-transparent text-[9px] font-bold text-slate-500 outline-none" />
                         <CellInput type="date" value={c.Data_Renovacao || ''} onChange={(val: string) => handleSmartUpdate(c, 'Data_Renovacao', val)} className="bg-transparent text-[9px] font-bold text-slate-500 outline-none" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CellInput isNumeric type="text" value={c.Conteudos_Entregues} onChange={(val: number) => handleSmartUpdate(c, 'Conteudos_Entregues', val)} className="w-10 text-center bg-slate-100 rounded-lg p-1 font-bold text-xs outline-none" />
                        <span className="text-slate-300 font-bold">/</span>
                        <CellInput isNumeric type="text" value={c.Conteudos_Contratados} onChange={(val: number) => handleSmartUpdate(c, 'Conteudos_Contratados', val)} className="w-10 text-center bg-slate-100 rounded-lg p-1 font-bold text-xs outline-none" />
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                       <CellInput isNumeric type="text" value={c.Dia_Pagamento || ''} onChange={(val: number) => handleSmartUpdate(c, 'Dia_Pagamento', val)} className="w-10 text-center bg-indigo-50 text-indigo-600 rounded-lg p-1 font-black text-xs outline-none" />
                    </td>
                    <td className="px-6 py-4 text-right">
                       <CellInput isNumeric type="text" value={c.Receita_Mensal_BRL} onChange={(val: number) => handleSmartUpdate(c, 'Receita_Mensal_BRL', val)} className="w-24 text-right font-mono font-black outline-none bg-transparent focus:ring-1 focus:ring-indigo-100 rounded px-1" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleRemoveFromMonth(c.id)} 
                        className="p-2 text-slate-300 hover:text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                        title="Remover cliente deste mês (Mantém contrato ativo)"
                      >
                        <Trash2 size={18}/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex flex-col md:flex-row border-t border-slate-100">
            <button onClick={handleAddClient} className="flex-1 p-4 text-indigo-600 font-bold text-xs hover:bg-indigo-50 flex justify-center gap-2 items-center transition-colors">
              <PlusCircle size={16}/> Novo Contrato
            </button>
            {missingContractsCount > 0 && (
              <button onClick={handleSyncContracts} className="flex-1 p-4 text-emerald-600 font-bold text-xs hover:bg-emerald-50 flex justify-center gap-2 items-center border-l border-slate-100 transition-colors">
                 <RefreshCw size={16}/> Sincronizar {missingContractsCount} Contratos Pendentes
              </button>
            )}
          </div>
        </div>
      )}

      {activeSection === 'costs' && (
        <div className="glass-panel rounded-[32px] overflow-hidden shadow-2xl border-none">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
               <tr className="text-[10px] font-black text-slate-400 uppercase">
                 <th className="px-6 py-4">Despesa</th>
                 <th className="px-4 py-4">Categoria</th>
                 <th className="px-4 py-4 text-center">Status</th>
                 <th className="px-6 py-4 text-right">Valor</th>
                 <th className="px-4 py-4 text-center">Ações</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthCosts.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4"><CellInput type="text" value={c.Tipo_Custo} onChange={(val: string) => handleUpdateCost(c.id, 'Tipo_Custo', val)} className="font-bold outline-none bg-transparent w-full"/></td>
                  <td className="px-4 py-4">
                     <select value={c.Categoria} onChange={e => handleUpdateCost(c.id, 'Categoria', e.target.value)} className="text-xs bg-slate-100 rounded px-2 py-1 outline-none font-bold text-slate-600">
                        <option value="Operacional">Operacional</option>
                        <option value="Administrativo">Administrativo</option>
                        <option value="Impostos">Impostos</option>
                        <option value="Outros">Outros</option>
                     </select>
                  </td>
                  <td className="px-4 py-4 text-center">
                     <button onClick={() => handleUpdateCost(c.id, 'Ativo_no_Mes', !c.Ativo_no_Mes)} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${c.Ativo_no_Mes ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>{c.Ativo_no_Mes ? 'On' : 'Off'}</button>
                  </td>
                  <td className="px-6 py-4 text-right"><CellInput isNumeric type="text" value={c.Valor_Mensal_BRL} onChange={(val: number) => handleUpdateCost(c.id, 'Valor_Mensal_BRL', val)} className="w-24 text-right font-mono font-black outline-none bg-transparent"/></td>
                  <td className="px-4 py-4 text-center"><button onClick={() => handleDeleteCost(c.id)} className="text-slate-300 hover:text-rose-500"><Trash2 size={16}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={handleAddCost} className="w-full p-4 text-indigo-600 font-bold text-xs hover:bg-indigo-50 flex justify-center gap-2 items-center"><PlusCircle size={16}/> Nova Despesa</button>
        </div>
      )}

      {activeSection === 'global' && (
        <div className="glass-panel p-8 rounded-[40px]">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-700">
                  <Landmark size={16}/> Configurações de Negócio
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-2">Método de Alocação</label>
                    <select value={settings.allocationMethod} onChange={e => onUpdateSettings({...settings, allocationMethod: e.target.value as any})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none">
                        <option value="perDelivered">Por Entrega (Realizado)</option>
                        <option value="perContracted">Por Contrato (Previsto)</option>
                        <option value="equalShare">Divisão Igualitária</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 block mb-2">Imposto (%)</label>
                    <input type="number" step="0.01" value={settings.taxRate} onChange={e => onUpdateSettings({...settings, taxRate: parseFloat(e.target.value)})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black mb-6 flex items-center gap-2 text-slate-700">
                  <Calendar size={16}/> Gestão de Ciclos (Meses)
                </h3>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                   <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Adicionar Novo Mês</p>
                   <div className="flex gap-2">
                      <select value={newMonthName} onChange={e => setNewMonthName(e.target.value)} className="p-3 rounded-xl text-xs font-bold border-none outline-none flex-1 bg-slate-700 text-white shadow-inner">
                         {STANDARD_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <input type="number" value={newMonthYear} onChange={e => setNewMonthYear(parseInt(e.target.value))} className="p-3 rounded-xl text-xs font-bold w-24 border-none outline-none bg-slate-700 text-white shadow-inner" min="2020" max="2035" />
                      <button onClick={handleAddMonth} className="bg-indigo-500 text-white p-3 rounded-xl hover:bg-indigo-600 transition-colors shadow-md"><Plus size={16}/></button>
                   </div>
                </div>
                
                <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                   {displayMonths.map(m => (
                      <div key={m} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm group">
                         <span className={`text-xs font-black ${m === selectedMonth ? 'text-indigo-600' : 'text-slate-600'}`}>{m}</span>
                         <button onClick={() => handleDeleteMonth(m)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                      </div>
                   ))}
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};
