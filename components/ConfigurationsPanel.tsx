
import React, { useState, useMemo, useRef } from 'react';
import { 
  Settings, Database, Calculator, Save, RefreshCw, 
  FileText, Lock, Edit3, AlertTriangle, Download, 
  CheckCircle, Shield, X, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Users, RotateCcw,
  Plus, Trash2, History, AlertCircle, BarChart3, Battery,
  Calendar as CalendarIcon, MinusCircle, Info, FileDown,
  Printer, Loader2, Heart, Check, HelpCircle, Activity,
  Landmark, Target
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { ClientData, CostData, GlobalSettings } from '../types';
import { formatCurrency, formatPercent } from '../utils';

interface ConfigurationsPanelProps {
  allClients: ClientData[];
  allCosts: CostData[];
  months: string[];
  settings: GlobalSettings;
  onUpdateClients: (clients: ClientData[]) => void;
  onUpdateCosts: (costs: CostData[]) => void;
  onUpdateSettings: (settings: GlobalSettings) => void;
  onUpdateMonths: (months: string[]) => void;
  privacyMode?: boolean;
}

const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const YEARS = ['2024', '2025', '2026', '2027'];

export const ConfigurationsPanel: React.FC<ConfigurationsPanelProps> = ({
  allClients, allCosts, months, settings,
  onUpdateClients, onUpdateCosts, onUpdateSettings, onUpdateMonths,
  privacyMode = false
}) => {
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1]);
  const [activeSection, setActiveSection] = useState<'clients' | 'costs' | 'global'>('clients');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [isAddMonthOpen, setIsAddMonthOpen] = useState(false);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [isAddCostOpen, setIsAddCostOpen] = useState(false);

  // New month input
  const [newMonthName, setNewMonthName] = useState(MONTH_NAMES[0]);
  const [newMonthYear, setNewMonthYear] = useState(YEARS[1]);

  const monthClients = allClients.filter(c => c.Mes_Referencia === selectedMonth);
  const monthCosts = allCosts.filter(c => c.Mes_Referencia === selectedMonth);

  // --- COMPREHENSIVE HEALTH VALIDATION ENGINE ---
  const validation = useMemo(() => {
    const grossRevenue = monthClients.reduce((s, c) => s + (c.Receita_Mensal_BRL || 0), 0);
    const netRevenue = grossRevenue * (1 - settings.taxRate);
    const totalCost = monthCosts.filter(c => c.Ativo_no_Mes).reduce((s, c) => s + (c.Valor_Mensal_BRL || 0), 0);
    const totalContracted = monthClients.reduce((s, c) => s + (c.Conteudos_Contratados || 0), 0);
    const totalDelivered = monthClients.reduce((s, c) => s + (c.Conteudos_Entregues || 0), 0);
    
    // --- ROBUST CAPACITY CALCULATION ---
    const capacityLimit = settings.maxProductionCapacity || 0;
    const utilization = capacityLimit > 0 ? totalContracted / capacityLimit : (totalContracted > 0 ? 1 : 0);

    const profit = netRevenue - totalCost;
    const margin = netRevenue > 0 ? profit / netRevenue : 0;
    const operationalCosts = monthCosts.filter(c => c.Ativo_no_Mes && (c.Categoria === 'Operacional' || !c.Categoria)).reduce((s, c) => s + c.Valor_Mensal_BRL, 0);
    const costPerContent = totalDelivered > 0 ? operationalCosts / totalDelivered : 0;

    const issues: { type: 'error' | 'warning', msg: string, category: 'financeiro' | 'capacidade' | 'dados' | 'global' }[] = [];

    // 1. Global Parameter Validation
    if (settings.taxRate < 0) {
      issues.push({ type: 'error', msg: 'Taxa de imposto negativa detectada. Corrija nos parâmetros globais.', category: 'global' });
    } else if (settings.taxRate === 0) {
      issues.push({ type: 'warning', msg: 'Taxa de imposto configurada como 0%. Verifique se a agência é isenta.', category: 'global' });
    }

    if (settings.targetMargin <= 0) {
      issues.push({ type: 'error', msg: 'Meta de margem não pode ser zero ou negativa.', category: 'global' });
    }

    if (capacityLimit <= 0) {
      issues.push({ type: 'error', msg: 'Capacidade nominal da agência está zerada. O sistema não pode validar a ocupação do time.', category: 'global' });
    }

    // 2. Financial Health Checks
    if (margin < 0 && netRevenue > 0) {
      issues.push({ type: 'error', msg: `Margem negativa (${formatPercent(margin)}). Operação gerando prejuízo no mês.`, category: 'financeiro' });
    } else if (margin > 0 && margin < settings.targetMargin) {
      issues.push({ type: 'warning', msg: `Margem (${formatPercent(margin)}) abaixo da meta global de ${formatPercent(settings.targetMargin)}.`, category: 'financeiro' });
    }
    
    // 3. Production Capacity Checks (CRITICAL)
    if (utilization > 1) {
      issues.push({ 
        type: 'error', 
        msg: `Capacidade máxima estourada (${formatPercent(utilization)}). O volume contratado de ${totalContracted} un excede o teto operacional de ${capacityLimit} un.`, 
        category: 'capacidade' 
      });
    } else if (utilization > 0.85) {
      issues.push({ 
        type: 'warning', 
        msg: `Utilização de carga crítica (${formatPercent(utilization)}). Operação em risco de atrasos ou queda de qualidade.`, 
        category: 'capacidade' 
      });
    }

    // 4. Data Integrity
    const activeClientsNoRevenue = monthClients.filter(c => c.Status_Cliente === 'Ativo' && (c.Receita_Mensal_BRL || 0) === 0);
    if (activeClientsNoRevenue.length > 0) {
      issues.push({ type: 'warning', msg: `${activeClientsNoRevenue.length} cliente(s) ativo(s) com faturamento zerado (Permuta ou erro).`, category: 'dados' });
    }

    const bleedingClients = monthClients.filter(c => {
      const clientNet = c.Receita_Mensal_BRL * (1 - settings.taxRate);
      const clientCost = c.Conteudos_Entregues * costPerContent;
      return (clientNet - clientCost) < -1 && c.Conteudos_Entregues > 0;
    });

    if (bleedingClients.length > 0) {
      issues.push({ type: 'error', msg: `${bleedingClients.length} contrato(s) deficitário(s): O custo de entrega supera a receita líquida.`, category: 'financeiro' });
    }

    return {
      grossRevenue, netRevenue, totalCost, profit, margin, utilization, totalContracted, issues,
      formulas: {
        receitaLiquida: `${formatCurrency(grossRevenue)} * (1 - ${settings.taxRate}) = ${formatCurrency(netRevenue)}`,
        lucro: `${formatCurrency(netRevenue)} - ${formatCurrency(totalCost)} = ${formatCurrency(profit)}`,
        margem: `${formatCurrency(profit)} / ${formatCurrency(netRevenue)} = ${formatPercent(margin)}`,
        utilizacao: `${totalContracted} un / ${capacityLimit} un = ${formatPercent(utilization)}`
      }
    };
  }, [monthClients, monthCosts, settings]);

  const handleUpdateClient = (id: string, field: keyof ClientData, value: any) => {
    const updated = allClients.map(c => c.id === id ? { ...c, [field]: value } : c);
    onUpdateClients(updated);
  };

  const handleDeleteClient = (id: string) => {
    if (confirm("Deseja remover este cliente permanentemente?")) {
      onUpdateClients(allClients.filter(c => c.id !== id));
    }
  };

  const handleUpdateCost = (id: string, field: keyof CostData, value: any) => {
    const updated = allCosts.map(c => c.id === id ? { ...c, [field]: value } : c);
    onUpdateCosts(updated);
  };

  const handleDeleteCost = (id: string) => {
    if (confirm("Deseja remover este custo permanentemente?")) {
      onUpdateCosts(allCosts.filter(c => c.id !== id));
    }
  };

  const handleAddMonth = () => {
    const newMonth = `${newMonthName}/${newMonthYear}`;
    if (months.includes(newMonth)) return alert("Mês já existe.");
    onUpdateMonths([...months, newMonth]);
    setSelectedMonth(newMonth);
    setIsAddMonthOpen(false);
  };

  const handleAddClient = (name: string, contracted: number, revenue: number) => {
    const newClient: ClientData = {
      id: `c-${Date.now()}`,
      Cliente: name || 'Novo Cliente',
      Mes_Referencia: selectedMonth,
      Status_Cliente: 'Ativo',
      Receita_Mensal_BRL: revenue,
      Conteudos_Contratados: contracted,
      Conteudos_Entregues: 0,
      Conteudos_Nao_Entregues: 0,
      Receita_Liquida_Apos_Imposto_BRL: revenue * (1 - settings.taxRate)
    };
    onUpdateClients([...allClients, newClient]);
    setIsAddClientOpen(false);
  };

  const handleAddCost = (name: string, value: number, tipo: CostData['Tipo'], categoria: CostData['Categoria']) => {
    const newCost: CostData = {
      id: `cost-${Date.now()}`,
      Tipo_Custo: name || 'Nova Despesa',
      Mes_Referencia: selectedMonth,
      Valor_Mensal_BRL: value,
      Ativo_no_Mes: true,
      Tipo: tipo || 'Fixo',
      Categoria: categoria || 'Operacional'
    };
    onUpdateCosts([...allCosts, newCost]);
    setIsAddCostOpen(false);
  };

  const generatePDFReport = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const element = reportRef.current;
      element.style.display = 'block';
      const canvas = await html2canvas(element, { scale: 2, logging: false, useCORS: true });
      element.style.display = 'none';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Auditoria_Financeira_${selectedMonth.replace('/', '_')}.pdf`);
    } catch (error) {
      console.error('PDF Generation failed:', error);
      alert('Erro ao gerar o PDF. Tente novamente.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const hasGlobalIssue = (param: 'taxRate' | 'targetMargin' | 'maxCapacity') => {
    return validation.issues.some(issue => {
      if (param === 'taxRate' && issue.msg.toLowerCase().includes('imposto')) return true;
      if (param === 'targetMargin' && (issue.msg.toLowerCase().includes('margem') && issue.category === 'global')) return true;
      if (param === 'maxCapacity' && (issue.msg.toLowerCase().includes('capacidade') && issue.category === 'global')) return true;
      return false;
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <style>{`
        .input-money { color: #06283D; font-family: 'JetBrains Mono', monospace; font-weight: 700; border-bottom: 2px solid transparent; background: transparent; width: 100%; text-align: right; outline: none; transition: border-color 0.2s; }
        .input-money:focus { border-bottom-color: #6366f1; }
        .input-text-edit { background: transparent; border: none; border-bottom: 1px solid transparent; outline: none; font-weight: inherit; color: inherit; width: 100%; }
        .input-text-edit:focus { border-bottom-color: #6366f1; }
        .text-navy-800 { color: #06283D; }
        .pdf-report-template { width: 210mm; background: white; padding: 20mm; color: #1e293b; font-family: 'Plus Jakarta Sans', sans-serif; display: none; position: absolute; left: -9999px; }
        .pdf-section-title { font-size: 14pt; font-weight: 800; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 12px; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.05em; }
        .pdf-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .pdf-table th { text-align: left; font-size: 9pt; color: #64748b; text-transform: uppercase; padding: 8px; border-bottom: 1px solid #f1f5f9; }
        .pdf-table td { font-size: 10pt; padding: 8px; border-bottom: 1px solid #f8fafc; }
        .pdf-kpi-box { border: 1px solid #f1f5f9; background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center; }
        .pdf-kpi-label { font-size: 8pt; color: #94a3b8; text-transform: uppercase; font-weight: bold; }
        .pdf-kpi-value { font-size: 14pt; font-weight: 800; color: #1e293b; }
      `}</style>

      {/* HIDDEN PDF TEMPLATE */}
      <div ref={reportRef} className="pdf-report-template">
         <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-8">
            <div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tighter">ZLINE</h1>
               <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Relatório de Auditoria Operacional</p>
            </div>
            <div className="text-right">
               <p className="text-sm font-bold text-slate-900">{selectedMonth}</p>
               <p className="text-[10px] text-slate-400">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
            </div>
         </div>

         <div className="pdf-section-title">Resumo Executivo</div>
         <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="pdf-kpi-box">
               <p className="pdf-kpi-label">Receita Bruta</p>
               <p className="pdf-kpi-value">{formatCurrency(validation.grossRevenue)}</p>
            </div>
            <div className="pdf-kpi-box">
               <p className="pdf-kpi-label">Resultado Líquido</p>
               <p className={`pdf-kpi-value ${validation.profit < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{formatCurrency(validation.profit)}</p>
            </div>
            <div className="pdf-kpi-box">
               <p className="pdf-kpi-label">Margem Real</p>
               <p className="pdf-kpi-value">{formatPercent(validation.margin)}</p>
            </div>
            <div className="pdf-kpi-box">
               <p className="pdf-kpi-label">Utilização</p>
               <p className="pdf-kpi-value">{formatPercent(validation.utilization)}</p>
            </div>
         </div>

         {validation.issues.length > 0 && (
           <>
            <div className="pdf-section-title">Alertas de Auditoria</div>
            <div className="space-y-2 mb-8">
               {validation.issues.map((issue, idx) => (
                 <div key={idx} className={`p-3 rounded-lg text-sm border flex items-center gap-3 ${issue.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                    <span className="font-bold uppercase text-[10px]">{issue.type}</span>
                    <span>{issue.msg}</span>
                 </div>
               ))}
            </div>
           </>
         )}

         <div className="pdf-section-title">Detalhamento de Clientes</div>
         <table className="pdf-table">
            <thead>
               <tr>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Contratado</th>
                  <th>Entregue</th>
                  <th className="text-right">Receita Bruta</th>
               </tr>
            </thead>
            <tbody>
               {monthClients.map(c => (
                 <tr key={c.id}>
                    <td className="font-bold">{c.Cliente}</td>
                    <td>{c.Status_Cliente}</td>
                    <td className="text-center">{c.Conteudos_Contratados}</td>
                    <td className="text-center">{c.Conteudos_Entregues}</td>
                    <td className="text-right font-mono font-bold">{formatCurrency(c.Receita_Mensal_BRL)}</td>
                 </tr>
               ))}
            </tbody>
         </table>

         <div className="pdf-section-title">Detalhamento de Custos</div>
         <table className="pdf-table">
            <thead>
               <tr>
                  <th>Descrição</th>
                  <th>Tipo</th>
                  <th>Categoria</th>
                  <th>Status</th>
                  <th className="text-right">Valor</th>
               </tr>
            </thead>
            <tbody>
               {monthCosts.map(c => (
                 <tr key={c.id}>
                    <td className="font-bold">{c.Tipo_Custo}</td>
                    <td>{c.Tipo || 'Fixo'}</td>
                    <td>{c.Categoria || 'Operacional'}</td>
                    <td>{c.Ativo_no_Mes ? 'Ativo' : 'Inativo'}</td>
                    <td className="text-right font-mono font-bold">{formatCurrency(c.Valor_Mensal_BRL)}</td>
                 </tr>
               ))}
            </tbody>
         </table>

         <div className="pdf-section-title">Fórmulas Aplicadas</div>
         <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 font-mono text-[10px] space-y-2">
            <p><strong>Receita Líquida:</strong> {validation.formulas.receitaLiquida}</p>
            <p><strong>Lucro Líquido:</strong> {validation.formulas.lucro}</p>
            <p><strong>Margem de Operação:</strong> {validation.formulas.margem}</p>
            <p><strong>Taxa de Ocupação:</strong> {validation.formulas.utilizacao}</p>
         </div>

         <div className="mt-12 pt-4 border-t border-slate-200 flex justify-between items-center opacity-50">
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">BI Financeiro - ZLINE Enterprise v3.0</p>
            <p className="text-[10px] text-slate-400">Documento Confidencial</p>
         </div>
      </div>

      {/* HEADER CONTROLS */}
      <div className="glass-panel p-6 rounded-[32px] flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm border border-indigo-100/50"><Settings size={24} /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight">Cérebro do Sistema</h2>
            <p className="text-xs text-slate-500 font-medium">Controle total de parâmetros, auditoria e exportação.</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
             <button onClick={() => setActiveSection('clients')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'clients' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Clientes</button>
             <button onClick={() => setActiveSection('costs')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'costs' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Custos</button>
             <button onClick={() => setActiveSection('global')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSection === 'global' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Global</button>
          </div>
          
          <button 
            onClick={generatePDFReport}
            disabled={isGeneratingPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all disabled:opacity-50"
          >
            {isGeneratingPDF ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
            {isGeneratingPDF ? 'Compilando...' : 'Gerar Relatório PDF'}
          </button>
        </div>
      </div>

      {/* HEALTH DASHBOARD SECTION - OBJECTIVE: ENHANCED VISUAL KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
         <div className="lg:col-span-2 space-y-6">
            <div className="glass-panel p-6 rounded-[32px] border-l-4 border-l-indigo-500">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                     <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Shield size={20} /></div>
                     <div>
                        <h3 className="font-bold text-slate-800">Check-up de Saúde: {selectedMonth}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Monitoramento de Capacidade & Dados</p>
                     </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${validation.issues.length > 0 ? (validation.issues.some(i => i.type === 'error') ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700') : 'bg-emerald-100 text-emerald-700'}`}>
                     {validation.issues.length} {validation.issues.length === 1 ? 'Ocorrência' : 'Ocorrências'}
                  </div>
               </div>
               
               <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                  {validation.issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 space-y-3 bg-emerald-50/30 rounded-[24px] border border-dashed border-emerald-200">
                       <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm"><Check size={24} /></div>
                       <div className="text-center">
                          <p className="font-bold text-emerald-800">Operação em Conformidade</p>
                          <p className="text-xs text-emerald-600/80 max-w-xs mx-auto">Não foram detectados desvios financeiros ou de capacidade para o período selecionado.</p>
                       </div>
                    </div>
                  ) : (
                    validation.issues.map((issue, idx) => (
                      <div key={idx} className={`group flex items-start gap-4 p-4 rounded-2xl border transition-all ${issue.type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100/50' : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100/50'}`}>
                         <div className={`mt-0.5 p-2 rounded-lg shrink-0 ${issue.type === 'error' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                            {issue.type === 'error' ? <AlertCircle size={18} /> : <AlertTriangle size={18} />}
                         </div>
                         <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                               <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/60">{issue.category}</span>
                               <span className="text-[9px] font-black uppercase tracking-widest">{issue.type === 'error' ? 'Crítico' : 'Alerta'}</span>
                            </div>
                            <p className="text-sm font-semibold leading-relaxed">{issue.msg}</p>
                         </div>
                      </div>
                    ))
                  )}
               </div>
            </div>

            {/* CAPACITY KPIs - OBJECTIVE: KPI VISUAL CORRECT DISPLAY */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-panel p-4 rounded-[24px] text-center space-y-1 group transition-all">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carga Nominal</p>
                   <div className="flex items-center justify-center gap-1">
                      <Battery size={14} className="text-indigo-500" />
                      <p className="text-xl font-black font-mono text-slate-800">{settings.maxProductionCapacity}</p>
                      <span className="text-[10px] text-slate-400 font-bold">un</span>
                   </div>
                </div>
                <div className="glass-panel p-4 rounded-[24px] text-center space-y-1">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume Atual</p>
                   <div className="flex items-center justify-center gap-1">
                      <Activity size={14} className="text-slate-400" />
                      <p className="text-xl font-black font-mono text-slate-800">{validation.totalContracted}</p>
                      <span className="text-[10px] text-slate-400 font-bold">un</span>
                   </div>
                </div>
                <div className="glass-panel p-4 rounded-[24px] text-center space-y-1">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Uso de Time</p>
                   <p className={`text-xl font-black font-mono ${validation.utilization > 1 ? 'text-rose-600' : 'text-slate-800'}`}>{formatPercent(validation.utilization)}</p>
                </div>
                <div className="glass-panel p-4 rounded-[24px] text-center space-y-1">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Margem Real</p>
                   <p className={`text-xl font-black font-mono ${validation.margin < 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatPercent(validation.margin)}</p>
                </div>
            </div>
         </div>

         {/* FORMULA INSPECTOR */}
         <div className="glass-panel p-6 rounded-[32px] space-y-6">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-slate-100 rounded-xl text-slate-600"><Calculator size={20} /></div>
               <div>
                  <h3 className="font-bold text-slate-800">Cálculos do Período</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Transparência ZLINE</p>
               </div>
            </div>
            
            <div className="space-y-5">
               <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Check size={10} className="text-emerald-500" /> Receita Líquida</p>
                  <code className="text-[10px] block bg-slate-900 text-indigo-300 p-3 rounded-xl font-mono leading-relaxed border border-indigo-500/20 shadow-inner break-all">
                    {validation.formulas.receitaLiquida}
                  </code>
               </div>
               
               <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Check size={10} className="text-emerald-500" /> Lucro Operacional</p>
                  <code className="text-[10px] block bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono leading-relaxed border border-emerald-500/20 shadow-inner break-all">
                    {validation.formulas.lucro}
                  </code>
               </div>

               <div className="space-y-1.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Check size={10} className="text-emerald-500" /> Utilização (Capacity)</p>
                  <code className="text-[10px] block bg-slate-900 text-indigo-100 p-3 rounded-xl font-mono leading-relaxed border border-white/10 shadow-inner break-all">
                    {validation.formulas.utilizacao}
                  </code>
               </div>
            </div>

            <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
               <div className="flex items-start gap-3">
                  <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] leading-relaxed text-indigo-800 font-medium">
                     O cálculo de <b>Capacidade</b> é baseado no volume de itens contratados frente ao limite de produção nominal ({settings.maxProductionCapacity} un).
                  </p>
               </div>
            </div>
         </div>
      </div>

      {/* PERIOD NAVIGATION */}
      <div className="flex items-center justify-between px-2 pt-4">
         <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {months.map(m => (
              <button 
                key={m} 
                onClick={() => setSelectedMonth(m)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold border transition-all whitespace-nowrap ${selectedMonth === m ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}
              >
                {m}
              </button>
            ))}
            <button onClick={() => setIsAddMonthOpen(true)} className="p-2.5 rounded-full bg-indigo-100 text-indigo-600 border border-indigo-200 hover:bg-indigo-200 transition-colors shadow-sm"><Plus size={18} /></button>
         </div>
      </div>

      {/* GLOBAL SETTINGS - OBJECTIVE: HYBRID SLIDER + NUMERIC INPUT FOR CAPACITY */}
      {activeSection === 'global' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in">
           {/* HYBRID CAPACITY CONTROL */}
           <div className={`glass-panel p-6 rounded-[32px] space-y-4 border transition-all ${hasGlobalIssue('maxCapacity') ? 'border-amber-300 bg-amber-50/20 ring-1 ring-amber-200 shadow-lg shadow-amber-100/50' : 'border-slate-100/60'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Battery size={14} className="text-slate-400" />
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Capacidade Operacional</label>
                </div>
                {hasGlobalIssue('maxCapacity') && <AlertTriangle size={14} className="text-amber-500 animate-pulse" />}
              </div>
              
              <div className="flex items-center justify-between gap-4">
                 <div className="text-4xl font-black text-navy-800 tracking-tighter drop-shadow-sm">{settings.maxProductionCapacity} <span className="text-xs text-slate-400 font-bold uppercase ml-1">un</span></div>
                 <div className="relative">
                    <input 
                       type="number" 
                       value={settings.maxProductionCapacity}
                       onChange={(e) => onUpdateSettings({...settings, maxProductionCapacity: Math.max(0, parseInt(e.target.value) || 0)})}
                       className="w-24 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 text-center transition-all no-spinner"
                    />
                    <div className="absolute -top-2 -right-2 p-1 bg-white border border-slate-200 rounded-lg shadow-sm"><Edit3 size={10} className="text-slate-400" /></div>
                 </div>
              </div>
              
              <div className="pt-2">
                 <input 
                   type="range" min="1" max="1000" step="1"
                   value={settings.maxProductionCapacity}
                   onChange={(e) => onUpdateSettings({...settings, maxProductionCapacity: parseInt(e.target.value) || 10})}
                   className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                 />
                 <div className="flex justify-between mt-2 px-1">
                    <span className="text-[9px] font-bold text-slate-300">1 un</span>
                    <span className="text-[9px] font-bold text-slate-300">500 un</span>
                    <span className="text-[9px] font-bold text-slate-300">1000 un</span>
                 </div>
              </div>
              <p className="text-[9px] text-slate-400 italic leading-tight">Este valor é o denominador comum para o cálculo de <b>Ocupação</b>. Define quanto o time aguenta entregar sem quebra de qualidade.</p>
           </div>
           
           <div className={`glass-panel p-6 rounded-[32px] space-y-4 border transition-all ${hasGlobalIssue('taxRate') ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-200 shadow-lg shadow-amber-100/50' : 'border-slate-100/60'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Landmark size={14} className="text-slate-400" />
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Imposto (%)</label>
                </div>
                {hasGlobalIssue('taxRate') && <AlertTriangle size={14} className="text-amber-500 animate-pulse" />}
              </div>
              <input 
                type="number" step="0.01"
                value={settings.taxRate}
                onChange={(e) => onUpdateSettings({...settings, taxRate: parseFloat(e.target.value) || 0})}
                className={`input-money text-3xl outline-none focus:ring-0 transition-colors ${hasGlobalIssue('taxRate') ? 'text-amber-700' : 'text-navy-800'}`}
              />
              <div className="pt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[9px] text-slate-400 italic font-medium leading-relaxed">Incide diretamente sobre a Receita Bruta. (Ex: 0.15 = 15%)</p>
              </div>
           </div>
           
           <div className={`glass-panel p-6 rounded-[32px] space-y-4 border transition-all ${hasGlobalIssue('targetMargin') ? 'border-amber-300 bg-amber-50/30 ring-1 ring-amber-200 shadow-lg shadow-amber-100/50' : 'border-slate-100/60'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <Target size={14} className="text-slate-400" />
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Meta de Margem (%)</label>
                </div>
                {hasGlobalIssue('targetMargin') && <AlertTriangle size={14} className="text-amber-500 animate-pulse" />}
              </div>
              <input 
                type="number" step="0.01"
                value={settings.targetMargin}
                onChange={(e) => onUpdateSettings({...settings, targetMargin: parseFloat(e.target.value) || 0})}
                className={`input-money text-3xl outline-none focus:ring-0 transition-colors ${hasGlobalIssue('targetMargin') ? 'text-amber-700' : 'text-navy-800'}`}
              />
              <div className="pt-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                 <p className="text-[9px] text-slate-400 italic font-medium leading-relaxed">Meta mínima aceitável de lucro operacional. (Ex: 0.25 = 25%)</p>
              </div>
           </div>
        </div>
      )}

      {/* CLIENTS EDITOR */}
      {activeSection === 'clients' && (
        <div className="glass-panel rounded-[32px] overflow-hidden animate-fade-in border border-slate-100/60 shadow-xl">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <div>
               <h3 className="font-bold text-slate-800">Contratos em {selectedMonth}</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Edição de Receitas e Volumes</p>
            </div>
            <button onClick={() => setIsAddClientOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"><Plus size={14} /> Novo Cliente</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-4 py-4 text-center">Status</th>
                  <th className="px-4 py-4 text-center">Contratado</th>
                  <th className="px-4 py-4 text-center">Entregue</th>
                  <th className="px-6 py-4 text-right">Receita Bruta</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthClients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={c.Cliente} 
                        onChange={(e) => handleUpdateClient(c.id, 'Cliente', e.target.value)} 
                        className="input-text-edit font-bold text-slate-800"
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                       <select 
                         value={c.Status_Cliente} 
                         onChange={(e) => handleUpdateClient(c.id, 'Status_Cliente', e.target.value as any)}
                         className={`text-[10px] font-bold px-2.5 py-1.5 rounded-full border outline-none cursor-pointer transition-colors ${c.Status_Cliente === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                       >
                         <option value="Ativo">Ativo</option>
                         <option value="Inativo">Inativo</option>
                       </select>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="number" 
                        value={c.Conteudos_Contratados} 
                        onChange={(e) => handleUpdateClient(c.id, 'Conteudos_Contratados', parseInt(e.target.value) || 0)} 
                        className="w-16 text-center bg-transparent border-b border-transparent focus:border-indigo-500 outline-none rounded font-bold text-slate-600 transition-all" 
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input 
                        type="number" 
                        value={c.Conteudos_Entregues} 
                        onChange={(e) => handleUpdateClient(c.id, 'Conteudos_Entregues', parseInt(e.target.value) || 0)} 
                        className="w-16 text-center bg-transparent border-b border-transparent focus:border-indigo-500 outline-none rounded font-bold text-slate-600 transition-all" 
                      />
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center justify-end gap-2">
                         <span className="text-[10px] text-slate-400 font-bold">R$</span>
                         <input 
                            type="number" step="any"
                            value={c.Receita_Mensal_BRL} 
                            onChange={(e) => handleUpdateClient(c.id, 'Receita_Mensal_BRL', parseFloat(e.target.value) || 0)}
                            className={`input-money w-28 text-lg ${privacyMode ? 'blur-sm focus:blur-none' : ''}`}
                         />
                       </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDeleteClient(c.id)} className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* COSTS EDITOR */}
      {activeSection === 'costs' && (
        <div className="glass-panel rounded-[32px] overflow-hidden animate-fade-in border border-slate-100/60 shadow-xl">
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
            <div>
               <h3 className="font-bold text-slate-800">Despesas em {selectedMonth}</h3>
               <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Gestão de Fluxo de Saída</p>
            </div>
            <button onClick={() => setIsAddCostOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"><Plus size={14} /> Nova Despesa</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4">Descrição</th>
                  <th className="px-4 py-4 text-center">Tipo</th>
                  <th className="px-4 py-4 text-center">Categoria</th>
                  <th className="px-6 py-4 text-right">Valor</th>
                  <th className="px-4 py-4 text-center">Ativo</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {monthCosts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 group transition-colors">
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={c.Tipo_Custo} 
                        onChange={(e) => handleUpdateCost(c.id, 'Tipo_Custo', e.target.value)} 
                        className="input-text-edit font-bold text-slate-800"
                      />
                    </td>
                    <td className="px-4 py-4 text-center">
                      <select 
                        value={c.Tipo || 'Fixo'} 
                        onChange={(e) => handleUpdateCost(c.id, 'Tipo', e.target.value as any)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-slate-50 outline-none cursor-pointer"
                      >
                        <option value="Fixo">Fixo</option>
                        <option value="Variável">Variável</option>
                        <option value="Extraordinário">Extraordinário</option>
                      </select>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <select 
                        value={c.Categoria || 'Operacional'} 
                        onChange={(e) => handleUpdateCost(c.id, 'Categoria', e.target.value as any)}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg border bg-slate-50 outline-none cursor-pointer"
                      >
                        <option value="Operacional">Operacional</option>
                        <option value="Admin">Admin</option>
                        <option value="Outros">Outros</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center justify-end gap-2">
                         <span className="text-[10px] text-slate-400 font-bold">R$</span>
                         <input 
                            type="number" step="any"
                            value={c.Valor_Mensal_BRL} 
                            onChange={(e) => handleUpdateCost(c.id, 'Valor_Mensal_BRL', parseFloat(e.target.value) || 0)}
                            className={`input-money w-28 text-lg ${privacyMode ? 'blur-sm focus:blur-none' : ''}`}
                         />
                       </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <input type="checkbox" checked={c.Ativo_no_Mes} onChange={(e) => handleUpdateCost(c.id, 'Ativo_no_Mes', e.target.checked)} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDeleteCost(c.id)} className="p-2.5 text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALS */}
      {isAddMonthOpen && (
        <Modal title="Novo Mês" onClose={() => setIsAddMonthOpen(false)}>
           <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mês</label>
                    <select value={newMonthName} onChange={e => setNewMonthName(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">{MONTH_NAMES.map(m => <option key={m}>{m}</option>)}</select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Ano</label>
                    <select value={newMonthYear} onChange={e => setNewMonthYear(e.target.value)} className="w-full p-2.5 border rounded-xl bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">{YEARS.map(y => <option key={y}>{y}</option>)}</select>
                 </div>
              </div>
              <button onClick={handleAddMonth} className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl text-sm shadow-lg hover:bg-indigo-700 transition-all">Adicionar Período</button>
           </div>
        </Modal>
      )}

      {isAddClientOpen && (
        <Modal title="Novo Cliente" onClose={() => setIsAddClientOpen(false)}>
           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Nome do Cliente</label>
                <input type="text" id="new-client-name" placeholder="Ex: ZLINE Studios" className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Contratado (un)</label>
                  <input type="number" id="new-client-contracted" defaultValue="10" className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Receita Bruta (R$)</label>
                  <input type="number" id="new-client-revenue" defaultValue="0" className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" />
                </div>
              </div>
              <button 
                onClick={() => handleAddClient(
                  (document.getElementById('new-client-name') as HTMLInputElement).value,
                  parseInt((document.getElementById('new-client-contracted') as HTMLInputElement).value) || 10,
                  parseFloat((document.getElementById('new-client-revenue') as HTMLInputElement).value) || 0
                )} 
                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl text-sm shadow-lg hover:bg-indigo-700 transition-all"
              >
                Cadastrar Contrato
              </button>
           </div>
        </Modal>
      )}

      {isAddCostOpen && (
        <Modal title="Nova Despesa" onClose={() => setIsAddCostOpen(false)}>
           <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Descrição</label>
                <input type="text" id="new-cost-name" placeholder="Ex: Novo Software" className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-semibold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Tipo</label>
                  <select id="new-cost-tipo" className="w-full p-2.5 border rounded-2xl bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Fixo">Fixo</option>
                    <option value="Variável">Variável</option>
                    <option value="Extraordinário">Extraordinário</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Categoria</label>
                  <select id="new-cost-categoria" className="w-full p-2.5 border rounded-2xl bg-slate-50 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="Operacional">Operacional</option>
                    <option value="Admin">Admin</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Valor (R$)</label>
                <input type="number" id="new-cost-value" defaultValue="0" className="w-full p-3.5 border rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold" />
              </div>
              <button 
                onClick={() => handleAddCost(
                  (document.getElementById('new-cost-name') as HTMLInputElement).value,
                  parseFloat((document.getElementById('new-cost-value') as HTMLInputElement).value) || 0,
                  (document.getElementById('new-cost-tipo') as HTMLSelectElement).value as CostData['Tipo'],
                  (document.getElementById('new-cost-categoria') as HTMLSelectElement).value as CostData['Categoria']
                )} 
                className="w-full py-3.5 bg-indigo-600 text-white font-bold rounded-2xl text-sm shadow-lg hover:bg-indigo-700 transition-all"
              >
                Lançar Despesa
              </button>
           </div>
        </Modal>
      )}
    </div>
  );
};

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md animate-fade-in px-4">
    <div className="bg-white p-8 rounded-[32px] shadow-2xl max-w-sm w-full space-y-6 relative border border-white/60">
       <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors hover:text-slate-600"><X size={18} /></button>
       <h3 className="text-xl font-bold text-slate-800 tracking-tight">{title}</h3>
       {children}
    </div>
  </div>
);
