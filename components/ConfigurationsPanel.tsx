
import React, { useState, useMemo, useRef } from 'react';
import { 
  Settings, Calculator, Trash2, Battery, FileDown, Loader2, Check, X, Shield, Landmark, Target, AlertCircle, Plus
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

export const ConfigurationsPanel: React.FC<ConfigurationsPanelProps> = ({
  allClients, allCosts, months, settings,
  onUpdateClients, onUpdateCosts, onUpdateSettings, onUpdateMonths,
  privacyMode = false
}) => {
  const [selectedMonth, setSelectedMonth] = useState(months[months.length - 1]);
  const [activeSection, setActiveSection] = useState<'clients' | 'costs' | 'global'>('clients');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [inputErrors, setInputErrors] = useState<Record<string, string>>({});
  const reportRef = useRef<HTMLDivElement>(null);

  const [modals, setModals] = useState({ client: false, cost: false });

  const monthClients = allClients.filter(c => c.Mes_Referencia === selectedMonth);
  const monthCosts = allCosts.filter(c => c.Mes_Referencia === selectedMonth);

  // FIX: Calculate 'validation' metrics for the audit report
  const validation = useMemo(() => {
    const grossRevenue = monthClients.reduce((s, c) => s + (c.Receita_Mensal_BRL || 0), 0);
    const netRevenue = grossRevenue * (1 - settings.taxRate);
    const activeMonthCosts = monthCosts.filter(c => c.Ativo_no_Mes);
    const totalCost = activeMonthCosts.reduce((s, c) => s + (c.Valor_Mensal_BRL || 0), 0);
    const totalContracted = monthClients.reduce((s, c) => s + (c.Conteudos_Contratados || 0), 0);
    const margin = netRevenue !== 0 ? (netRevenue - totalCost) / netRevenue : 0;
    const utilization = settings.maxProductionCapacity > 0 ? totalContracted / settings.maxProductionCapacity : 0;

    return {
      margin,
      netRevenue,
      utilization,
      totalContracted
    };
  }, [monthClients, monthCosts, settings]);

  // Sistema de Validação Robusta
  const validateAndConvert = (id: string, value: string, min: number = 0): number | null => {
    const cleanValue = value.replace(',', '.').trim();
    if (cleanValue === '') {
      setInputErrors(prev => ({ ...prev, [id]: "Obrigatório" }));
      return null;
    }
    const num = parseFloat(cleanValue);
    if (isNaN(num)) {
      setInputErrors(prev => ({ ...prev, [id]: "Número inválido" }));
      return null;
    }
    if (num < min) {
      setInputErrors(prev => ({ ...prev, [id]: `Mínimo: ${min}` }));
      return null;
    }
    // Limpa erro se for válido
    setInputErrors(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    return num;
  };

  // Log de Auditoria
  const logAudit = (action: string, details: any) => {
    console.log(`[AUDIT] ${new Date().toISOString()} | ${action} |`, details);
  };

  const handleUpdateClient = (id: string, field: keyof ClientData, rawValue: string) => {
    if (['Receita_Mensal_BRL', 'Conteudos_Contratados', 'Conteudos_Entregues'].includes(field)) {
      const validated = validateAndConvert(`${id}-${field}`, rawValue);
      if (validated === null) return;
      onUpdateClients(allClients.map(c => c.id === id ? { ...c, [field]: validated } : c));
    } else {
      onUpdateClients(allClients.map(c => c.id === id ? { ...c, [field]: rawValue } : c));
    }
  };

  const handleUpdateCost = (id: string, field: keyof CostData, rawValue: string) => {
    if (field === 'Valor_Mensal_BRL') {
      const validated = validateAndConvert(`${id}-${field}`, rawValue);
      if (validated === null) return;
      onUpdateCosts(allCosts.map(c => c.id === id ? { ...c, [field]: validated } : c));
    } else {
      onUpdateCosts(allCosts.map(c => c.id === id ? { ...c, [field]: rawValue } : c));
    }
  };

  const handleDeleteClient = (id: string, name: string) => {
    if (window.confirm(`Deseja EXCLUIR PERMANENTEMENTE o contrato de "${name}"? Esta ação não pode ser desfeita.`)) {
      onUpdateClients(allClients.filter(c => c.id !== id));
      logAudit('CLIENT_DELETED', { id, name });
    }
  };

  const handleDeleteCost = (id: string, name: string) => {
    if (window.confirm(`Deseja EXCLUIR PERMANENTEMENTE a despesa "${name}"?`)) {
      onUpdateCosts(allCosts.filter(c => c.id !== id));
      logAudit('COST_DELETED', { id, name });
    }
  };

  const generatePDFReport = async () => {
    if (!reportRef.current) return;
    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(reportRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      pdf.addImage(imgData, 'PNG', 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Auditoria_${selectedMonth.replace('/', '_')}.pdf`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-6 rounded-[32px] flex items-center justify-between">
        <div className="flex gap-2">
          <TabSubBtn active={activeSection === 'clients'} label="Contratos" onClick={() => setActiveSection('clients')} />
          <TabSubBtn active={activeSection === 'costs'} label="Despesas" onClick={() => setActiveSection('costs')} />
          <TabSubBtn active={activeSection === 'global'} label="Regras Globais" onClick={() => setActiveSection('global')} />
        </div>
        <button onClick={generatePDFReport} className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">
          {isGeneratingPDF ? <Loader2 className="animate-spin" size={14} /> : <FileDown size={14} />} Gerar PDF Auditoria
        </button>
      </div>

      {activeSection === 'clients' && (
        <div className="glass-panel rounded-[32px] overflow-hidden shadow-xl border-none">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] font-black text-slate-400 uppercase">
                <th className="px-6 py-4">Cliente</th>
                <th className="px-4 py-4 text-center">Contratado</th>
                <th className="px-4 py-4 text-center">Entregue</th>
                <th className="px-6 py-4 text-right">Receita Bruta</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthClients.map(c => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <input type="text" value={c.Cliente} onChange={e => handleUpdateClient(c.id, 'Cliente', e.target.value)} className="font-bold outline-none bg-transparent w-full focus:text-indigo-600" />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="relative inline-block">
                      <input 
                        type="text" 
                        value={c.Conteudos_Contratados} 
                        onChange={e => handleUpdateClient(c.id, 'Conteudos_Contratados', e.target.value)} 
                        className={`w-12 text-center bg-slate-100 rounded-lg p-1.5 font-bold transition-all ${inputErrors[`${c.id}-Conteudos_Contratados`] ? 'ring-2 ring-rose-500 bg-rose-50' : 'focus:ring-2 focus:ring-indigo-500'}`}
                      />
                      {inputErrors[`${c.id}-Conteudos_Contratados`] && <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[8px] font-black text-rose-500 bg-white px-1.5 rounded shadow-sm border border-rose-100 z-10">{inputErrors[`${c.id}-Conteudos_Contratados`]}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="text" 
                      value={c.Conteudos_Entregues} 
                      onChange={e => handleUpdateClient(c.id, 'Conteudos_Entregues', e.target.value)} 
                      className="w-12 text-center bg-slate-100 rounded-lg p-1.5 font-bold" 
                    />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">R$</span>
                      <input 
                        type="text" 
                        value={c.Receita_Mensal_BRL} 
                        onChange={e => handleUpdateClient(c.id, 'Receita_Mensal_BRL', e.target.value)} 
                        className={`w-24 text-right font-mono font-black outline-none ${inputErrors[`${c.id}-Receita_Mensal_BRL`] ? 'text-rose-600' : 'text-slate-800'}`}
                      />
                      {inputErrors[`${c.id}-Receita_Mensal_BRL`] && <AlertCircle size={12} className="text-rose-500 ml-1" />}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDeleteClient(c.id, c.Cliente)} className="p-2 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setModals({...modals, client: true})} className="w-full p-6 text-indigo-600 font-black text-xs bg-indigo-50/30 hover:bg-indigo-50 transition-all border-t flex items-center justify-center gap-2"><Plus size={16} /> Novo Contrato</button>
        </div>
      )}

      {activeSection === 'costs' && (
        <div className="glass-panel rounded-[32px] overflow-hidden shadow-xl border-none">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr className="text-[10px] font-black text-slate-400 uppercase">
                <th className="px-6 py-4">Despesa</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthCosts.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4">
                    <input type="text" value={c.Tipo_Custo} onChange={e => handleUpdateCost(c.id, 'Tipo_Custo', e.target.value)} className="font-bold outline-none bg-transparent w-full" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-bold">R$</span>
                      <input 
                        type="text" 
                        value={c.Valor_Mensal_BRL} 
                        onChange={e => handleUpdateCost(c.id, 'Valor_Mensal_BRL', e.target.value)} 
                        className={`w-24 text-right font-mono font-black outline-none ${inputErrors[`${c.id}-Valor_Mensal_BRL`] ? 'text-rose-600' : 'text-slate-800'}`}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button onClick={() => handleDeleteCost(c.id, c.Tipo_Custo)} className="p-2 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setModals({...modals, cost: true})} className="w-full p-6 text-indigo-600 font-black text-xs bg-indigo-50/30 hover:bg-indigo-50 transition-all border-t flex items-center justify-center gap-2"><Plus size={16} /> Novo Lançamento</button>
        </div>
      )}

      {activeSection === 'global' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           <GlobalSettingCard 
             icon={<Battery size={14} />} 
             label="Capacidade" 
             value={settings.maxProductionCapacity} 
             onUpdate={v => onUpdateSettings({...settings, maxProductionCapacity: Math.round(v)})} 
             suffix="un"
             min={1} max={1000}
           />
           <GlobalSettingCard 
             icon={<Landmark size={14} />} 
             label="Imposto Direto" 
             value={settings.taxRate} 
             onUpdate={v => onUpdateSettings({...settings, taxRate: v})} 
             suffix="%"
             multiplier={100}
           />
           <GlobalSettingCard 
             icon={<Target size={14} />} 
             label="Margem Alvo" 
             value={settings.targetMargin} 
             onUpdate={v => onUpdateSettings({...settings, targetMargin: v})} 
             suffix="%"
             multiplier={100}
           />
        </div>
      )}

      {/* MODALS */}
      {modals.client && (
        <ConfigModal title="Novo Contrato" onClose={() => setModals({...modals, client: false})}>
           <div className="space-y-4">
              <input type="text" placeholder="Nome do Cliente" className="w-full p-4 bg-slate-50 rounded-2xl border" id="new-c-name" />
              <div className="grid grid-cols-2 gap-4">
                 <input type="number" placeholder="Volume" className="p-4 bg-slate-50 rounded-2xl border" id="new-c-vol" defaultValue="10" />
                 <input type="number" placeholder="Receita R$" className="p-4 bg-slate-50 rounded-2xl border font-bold" id="new-c-rev" defaultValue="0" />
              </div>
              <button onClick={() => {
                const name = (document.getElementById('new-c-name') as HTMLInputElement).value;
                const vol = parseInt((document.getElementById('new-c-vol') as HTMLInputElement).value) || 0;
                const rev = parseFloat((document.getElementById('new-c-rev') as HTMLInputElement).value) || 0;
                if (!name) return alert("O nome é obrigatório.");
                const newClient: ClientData = {
                  id: `client-${Date.now()}`, Cliente: name, Mes_Referencia: selectedMonth, Status_Cliente: 'Ativo',
                  Conteudos_Contratados: vol, Conteudos_Entregues: 0, Conteudos_Nao_Entregues: vol,
                  Receita_Mensal_BRL: rev, Receita_Liquida_Apos_Imposto_BRL: rev * (1 - settings.taxRate)
                };
                onUpdateClients([...allClients, newClient]);
                logAudit('CLIENT_ADDED', newClient);
                setModals({...modals, client: false});
              }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm">Criar Contrato</button>
           </div>
        </ConfigModal>
      )}

      {modals.cost && (
        <ConfigModal title="Nova Despesa" onClose={() => setModals({...modals, cost: false})}>
           <div className="space-y-4">
              <input type="text" placeholder="Descrição" className="w-full p-4 bg-slate-50 rounded-2xl border" id="new-cost-name" />
              <input type="number" placeholder="Valor R$" className="w-full p-4 bg-slate-50 rounded-2xl border font-bold" id="new-cost-val" defaultValue="0" />
              <button onClick={() => {
                const name = (document.getElementById('new-cost-name') as HTMLInputElement).value;
                const val = parseFloat((document.getElementById('new-cost-val') as HTMLInputElement).value) || 0;
                if (!name) return alert("A descrição é obrigatória.");
                const newCost: CostData = {
                  id: `cost-${Date.now()}`, Tipo_Custo: name, Mes_Referencia: selectedMonth, Ativo_no_Mes: true, Valor_Mensal_BRL: val
                };
                onUpdateCosts([...allCosts, newCost]);
                logAudit('COST_ADDED', newCost);
                setModals({...modals, cost: false});
              }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm">Lançar Despesa</button>
           </div>
        </ConfigModal>
      )}

      {/* Relatório Oculto para PDF */}
      <div ref={reportRef} className="fixed -left-[9999px] top-0 p-12 bg-white w-[800px]">
         <h1 className="text-3xl font-black mb-8 border-b-2 pb-4">Auditoria ZLINE - {selectedMonth}</h1>
         <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="bg-slate-50 p-6 rounded-3xl">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">KPIs de Resultado</p>
               <div className="space-y-2">
                  <div className="flex justify-between font-mono"><span>Margem Real:</span> <span className="font-bold">{formatPercent(validation.margin)}</span></div>
                  <div className="flex justify-between font-mono"><span>Receita Líquida:</span> <span className="font-bold">{formatCurrency(validation.netRevenue)}</span></div>
               </div>
            </div>
            <div className="bg-slate-50 p-6 rounded-3xl">
               <p className="text-[10px] font-black text-slate-400 uppercase mb-2">KPIs de Entrega</p>
               <div className="space-y-2">
                  <div className="flex justify-between font-mono"><span>Ocupação:</span> <span className="font-bold">{formatPercent(validation.utilization)}</span></div>
                  <div className="flex justify-between font-mono"><span>Total un:</span> <span className="font-bold">{validation.totalContracted} un</span></div>
               </div>
            </div>
         </div>
         <p className="text-[10px] text-center text-slate-400 mt-12">BI ZLINE Enterprise • Relatório Oficial de Auditoria</p>
      </div>
    </div>
  );
};

const TabSubBtn = ({ active, label, onClick }: any) => (
  <button onClick={onClick} className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all ${active ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
    {label}
  </button>
);

const ConfigModal = ({ title, onClose, children }: any) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-md p-4 animate-fade-in">
    <div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl relative border border-white/20">
       <button onClick={onClose} className="absolute top-8 right-8 text-slate-300 hover:text-slate-800 transition-colors p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
       <h3 className="text-2xl font-black mb-8 tracking-tighter text-slate-900">{title}</h3>
       {children}
    </div>
  </div>
);

const GlobalSettingCard = ({ icon, label, value, onUpdate, suffix, min = 0, max = 100, multiplier = 1 }: any) => (
  <div className="glass-panel p-8 rounded-[40px] shadow-xl space-y-4 border-none">
    <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">
       {icon} {label}
    </div>
    <div className="text-5xl font-black text-slate-900 font-mono tracking-tighter">
       {Math.round(value * multiplier)}<span className="text-xs ml-1 opacity-20">{suffix}</span>
    </div>
    <input 
      type="range" min={min} max={max} 
      value={value * multiplier} 
      onChange={e => onUpdate(parseFloat(e.target.value) / multiplier)}
      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
    />
  </div>
);
