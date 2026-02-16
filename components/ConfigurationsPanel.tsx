import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings, Users, FileText, DollarSign, Plus, Trash2, X, 
  Check, Target, Briefcase, AlertTriangle, CreditCard 
} from 'lucide-react';
import { ClientData, ClientContract, ClientMonthlyResult, CostData, GlobalSettings, MonthlyGrowthData } from '../types';
import { formatCurrency } from '../utils';

// Importando as funções do banco que já configuramos
import { 
  upsertContract, deleteContract, 
  upsertMonthlyResult, 
  upsertCost, deleteCost, 
  saveSettings, saveGrowthData 
} from '../database';

interface ConfigurationsPanelProps {
  viewClients: ClientData[];
  contracts: ClientContract[];
  monthlyResults: ClientMonthlyResult[];
  allCosts: CostData[];
  months: string[];
  settings: GlobalSettings;
  growthData: MonthlyGrowthData[];
  selectedMonth: string;
  onUpdateContracts: React.Dispatch<React.SetStateAction<ClientContract[]>>;
  onUpdateResults: React.Dispatch<React.SetStateAction<ClientMonthlyResult[]>>;
  onUpdateCosts: React.Dispatch<React.SetStateAction<CostData[]>>;
  onUpdateSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  onUpdateMonths: React.Dispatch<React.SetStateAction<string[]>>;
  onUpdateGrowth: React.Dispatch<React.SetStateAction<MonthlyGrowthData[]>>;
  privacyMode: boolean;
  churn: number;
}

export const ConfigurationsPanel: React.FC<ConfigurationsPanelProps> = ({
  contracts, monthlyResults, allCosts, settings, growthData, selectedMonth,
  onUpdateContracts, onUpdateResults, onUpdateCosts, onUpdateSettings, onUpdateGrowth,
  privacyMode
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'contratos' | 'resultados' | 'custos'>('geral');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros de Visualização
  const [contractFilter, setContractFilter] = useState<'Todos' | 'Agency' | 'UI-Z'>('Todos');

  // Estados de Edição (Formulários)
  const [editingContract, setEditingContract] = useState<Partial<ClientContract> | null>(null);
  const [editingResult, setEditingResult] = useState<Partial<ClientMonthlyResult> | null>(null);
  const [editingCost, setEditingCost] = useState<Partial<CostData> | null>(null);
  
  // Estados Locais (Settings)
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings);
  const [localAdSpend, setLocalAdSpend] = useState<number>(
    growthData.find(g => g.month === selectedMonth)?.adSpend || 0
  );
  const [localLeads, setLocalLeads] = useState<number>(
    growthData.find(g => g.month === selectedMonth)?.leads || 0
  );

  useEffect(() => {
    const currentGrowth = growthData.find(g => g.month === selectedMonth);
    setLocalAdSpend(currentGrowth?.adSpend || 0);
    setLocalLeads(currentGrowth?.leads || 0);
    setLocalSettings(settings);
  }, [selectedMonth, growthData, settings]);

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  // --- HANDLERS (Salvar/Deletar) ---

  const handleSaveContract = async () => {
    if (!editingContract?.Cliente) return;
    setIsSubmitting(true);
    try {
      const saved = await upsertContract(editingContract as ClientContract);
      onUpdateContracts(prev => {
        const exists = prev.find(c => c.id === saved.id);
        return exists ? prev.map(c => c.id === saved.id ? saved : c) : [...prev, saved];
      });
      setEditingContract(null);
      showFeedback('success', 'Cliente salvo!');
    } catch (error) { showFeedback('error', 'Erro ao salvar.'); } 
    finally { setIsSubmitting(false); }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Apagar este cliente e todo o histórico?')) return;
    setIsSubmitting(true);
    try {
      await deleteContract(id);
      onUpdateContracts(prev => prev.filter(c => c.id !== id));
      showFeedback('success', 'Cliente removido.');
    } catch (error) { showFeedback('error', 'Erro ao remover.'); }
    finally { setIsSubmitting(false); }
  };

  const handleSaveResult = async () => {
    if (!editingResult?.contractId) return;
    setIsSubmitting(true);
    try {
      const saved = await upsertMonthlyResult(editingResult as ClientMonthlyResult);
      onUpdateResults(prev => [...prev.filter(r => r.id !== saved.id), saved]);
      setEditingResult(null);
      showFeedback('success', 'Financeiro atualizado!');
    } catch (error) { showFeedback('error', 'Erro ao lançar.'); }
    finally { setIsSubmitting(false); }
  };

  const handleSaveCost = async () => {
    if (!editingCost?.Tipo_Custo) return;
    setIsSubmitting(true);
    try {
      const saved = await upsertCost(editingCost as CostData);
      onUpdateCosts(prev => {
        const exists = prev.find(c => c.id === saved.id);
        return exists ? prev.map(c => c.id === saved.id ? saved : c) : [...prev, saved];
      });
      setEditingCost(null);
      showFeedback('success', 'Custo salvo!');
    } catch (error) { showFeedback('error', 'Erro ao salvar.'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm('Remover despesa?')) return;
    try {
      await deleteCost(id);
      onUpdateCosts(prev => prev.filter(c => c.id !== id));
      showFeedback('success', 'Custo removido.');
    } catch (error) { showFeedback('error', 'Erro ao remover.'); }
  };

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      await saveSettings(localSettings);
      await saveGrowthData(selectedMonth, localAdSpend, localLeads);
      onUpdateSettings(localSettings);
      onUpdateGrowth(prev => [...prev.filter(g => g.month !== selectedMonth), { month: selectedMonth, adSpend: localAdSpend, leads: localLeads }]);
      showFeedback('success', 'Configurações salvas.');
    } catch (error) { showFeedback('error', 'Erro ao salvar settings.'); }
    finally { setIsSubmitting(false); }
  };

  // Filtro de Contratos
  const filteredContracts = useMemo(() => {
    if (contractFilter === 'Todos') return contracts;
    return contracts.filter(c => c.Tipo_Servico === contractFilter);
  }, [contracts, contractFilter]);

  return (
    <div className="glass-window p-6 rounded-[40px] shadow-xl min-h-[600px]">
      
      {/* Toast Feedback */}
      {feedback && (
        <div className={`absolute top-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-black shadow-2xl z-50 flex items-center gap-3 ${feedback.type === 'success' ? 'bg-black/70 text-white' : 'bg-black/70 text-white'}`}>
          {feedback.type === 'success' ? <Check size={16}/> : <AlertTriangle size={16}/>}
          {feedback.msg}
        </div>
      )}

      {/* Tabs de Navegação */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 border-b border-red-500/25 no-scrollbar">
        {[
            { id: 'geral', icon: Settings, label: 'Global' },
            { id: 'contratos', icon: Users, label: 'Clientes & Contratos' },
            { id: 'resultados', icon: FileText, label: 'Lançamento Mensal' },
            { id: 'custos', icon: DollarSign, label: 'Custos' }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-black text-white shadow-xl scale-105' : 'bg-black/25 text-red-200/70 hover:bg-black/[0.32]'}`}
            >
                <tab.icon size={16} /> {tab.label}
            </button>
        ))}
      </div>

      <div className="animate-fade-in">
        
        {/* TAB: GERAL (Metas e Ads) */}
        {activeTab === 'geral' && (
            <div className="max-w-3xl mx-auto">
                <div className="bg-black/25 p-6 rounded-[32px] border border-red-500/25 mb-6">
                    <h3 className="text-sm font-black text-red-50 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Target size={18} className="text-[#ff2400]"/> Parâmetros do Negócio
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Imposto Médio (%)</label>
                            <input type="number" step="0.1" value={localSettings.taxRate * 100} onChange={e => setLocalSettings({...localSettings, taxRate: e.target.value === '' ? 0 : parseFloat(e.target.value)/100})} className="w-full p-4 bg-black/30 rounded-2xl text-lg font-black text-red-100 outline-none focus:ring-2 focus:ring-red-500/30 transition-all" />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Margem Alvo (%)</label>
                            <input type="number" step="1" value={localSettings.targetMargin * 100} onChange={e => setLocalSettings({...localSettings, targetMargin: e.target.value === '' ? 0 : parseFloat(e.target.value)/100})} className="w-full p-4 bg-black/30 rounded-2xl text-lg font-black text-red-100 outline-none focus:ring-2 focus:ring-red-500/30 transition-all" />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Capacidade Máxima (clientes)</label>
                            <input type="number" value={localSettings.maxProductionCapacity} onChange={e => setLocalSettings({...localSettings, maxProductionCapacity: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="w-full p-4 bg-black/30 rounded-2xl text-lg font-black text-red-100 outline-none focus:ring-2 focus:ring-red-500/30 transition-all" />
                        </div>

                        <div className="relative">
                            <div className="absolute top-0 right-0 bg-red-500/20 text-[#ff2400] text-[9px] font-bold px-2 py-1 rounded-lg uppercase">Mês: {selectedMonth}</div>
                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Investimento em Ads (R$)</label>
                            <input type="number" value={localAdSpend} onChange={e => setLocalAdSpend(e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full p-4 bg-black/30 rounded-2xl text-lg font-black text-[#ff2400] outline-none focus:ring-2 focus:ring-red-500/30 transition-all" />
                        </div>

                        <div>
                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Leads do mês</label>
                            <input type="number" value={localLeads} onChange={e => setLocalLeads(e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full p-4 bg-black/30 rounded-2xl text-lg font-black text-red-100 outline-none focus:ring-2 focus:ring-red-500/30 transition-all" />
                        </div>
                    </div>

                    <div className="mt-6 border-t border-red-500/25 pt-6">
                      <h4 className="text-xs font-black text-red-200/80 uppercase tracking-widest mb-4">Benchmarks estratégicos</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Churn Máximo (%)</label>
                          <input type="number" step="0.1" value={localSettings.benchmarks.maxChurn * 100} onChange={e => setLocalSettings({...localSettings, benchmarks: {...localSettings.benchmarks, maxChurn: e.target.value === '' ? 0 : parseFloat(e.target.value)/100}})} className="w-full p-3 bg-black/30 rounded-xl text-sm font-black text-red-100 outline-none focus:ring-2 focus:ring-red-500/30" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Margem Mínima (%)</label>
                          <input type="number" step="0.1" value={localSettings.benchmarks.minMargin * 100} onChange={e => setLocalSettings({...localSettings, benchmarks: {...localSettings.benchmarks, minMargin: e.target.value === '' ? 0 : parseFloat(e.target.value)/100}})} className="w-full p-3 bg-black/30 rounded-xl text-sm font-black text-red-100 outline-none focus:ring-2 focus:ring-red-500/30" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">LTV/CAC Mínimo</label>
                          <input type="number" step="0.1" value={localSettings.benchmarks.minLtvCac} onChange={e => setLocalSettings({...localSettings, benchmarks: {...localSettings.benchmarks, minLtvCac: e.target.value === '' ? 0 : parseFloat(e.target.value)}})} className="w-full p-3 bg-black/30 rounded-xl text-sm font-black text-red-100 outline-none focus:ring-2 focus:ring-red-500/30" />
                        </div>
                      </div>
                    </div>
                </div>
                <button onClick={handleSaveSettings} disabled={isSubmitting} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-950 transition-all shadow-xl shadow-red-900/20 active:scale-95 disabled:opacity-50">
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        )}

        {/* TAB: CONTRATOS */}
        {activeTab === 'contratos' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                
                {/* Lista (Esquerda) */}
                <div className="lg:col-span-1 flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-red-200/70 uppercase tracking-widest">Carteira</h3>
                        <button onClick={() => setEditingContract({ id: `new_${Date.now()}`, Status_Contrato: 'Ativo', Tipo_Servico: 'Agency' })} className="p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-all"><Plus size={18}/></button>
                    </div>
                    
                    <div className="bg-black/[0.32] p-1 rounded-xl flex gap-1">
                        {['Todos', 'Agency', 'UI-Z'].map(type => (
                            <button key={type} onClick={() => setContractFilter(type as any)} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all ${contractFilter === type ? 'bg-black/30 text-red-50 shadow-sm' : 'text-red-200/70 hover:text-red-200'}`}>{type}</button>
                        ))}
                    </div>

                    <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {filteredContracts.map(c => (
                            <div key={c.id} onClick={() => setEditingContract(c)} className={`cursor-pointer p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-95 ${editingContract?.id === c.id ? 'bg-red-600/20 border-red-500/50 ring-2 ring-red-500' : 'bg-black/30 border-red-500/25 hover:border-red-500/50 hover:shadow-md'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className={`font-bold text-sm ${editingContract?.id === c.id ? 'text-white' : 'text-red-50'}`}>{c.Cliente}</h4>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-md font-black uppercase ${c.Status_Contrato === 'Ativo' ? 'bg-red-500/20 text-[#ff2400]' : 'bg-red-500/20 text-[#ff2400]'}`}>{c.Status_Contrato}</span>
                                </div>
                                <div className="flex gap-2">
                                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg ${c.Tipo_Servico === 'UI-Z' ? 'bg-black/70 text-white' : 'bg-black/30 text-red-200/80'}`}>{c.Tipo_Servico || 'Agency'}</span>
                                    {c.Tipo_Servico === 'UI-Z' && <span className="text-[9px] font-mono text-[#ff2400] pt-1">R$ {c.UIZ_Valor_Mensal}/mês</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Formulário (Direita) */}
                <div className="lg:col-span-2 bg-black/25 rounded-[32px] p-8 border border-red-500/25 relative">
                    {editingContract ? (
                        <div className="animate-fade-in h-full flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-sm font-black text-red-50 uppercase tracking-widest flex items-center gap-2">
                                    {editingContract.id?.startsWith('new') ? <Plus size={18}/> : <Settings size={18}/>}
                                    {editingContract.id?.startsWith('new') ? 'Novo Contrato' : 'Editar Contrato'}
                                </h3>
                                <button onClick={() => setEditingContract(null)} className="p-2 text-red-200/70 hover:text-red-200"><X size={20}/></button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-6">
                                <div className="bg-black/30 p-5 rounded-3xl shadow-sm border border-red-500/25">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="col-span-2 md:col-span-1">
                                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Cliente</label>
                                            <input type="text" value={editingContract.Cliente || ''} onChange={e => setEditingContract({...editingContract, Cliente: e.target.value})} className="w-full p-3 bg-black/25 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500/30" autoFocus />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Tipo de Serviço</label>
                                            <select value={editingContract.Tipo_Servico || 'Agency'} onChange={e => setEditingContract({...editingContract, Tipo_Servico: e.target.value as any})} className="w-full p-3 bg-black/25 rounded-xl text-sm font-bold outline-none cursor-pointer">
                                                <option value="Agency">Agency (Serviço)</option>
                                                <option value="UI-Z">UI-Z (Assinatura)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Status</label>
                                            <select value={editingContract.Status_Contrato} onChange={e => setEditingContract({...editingContract, Status_Contrato: e.target.value as any})} className="w-full p-3 bg-black/25 rounded-xl text-sm font-bold outline-none cursor-pointer">
                                                <option value="Ativo">Ativo</option>
                                                <option value="Inativo">Inativo</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Bloco Dinâmico (UI-Z vs Agency) */}
                                <div className={`p-5 rounded-3xl shadow-sm border transition-all ${editingContract.Tipo_Servico === 'UI-Z' ? 'bg-black/30 border-red-500/40' : 'bg-black/30 border-red-500/25'}`}>
                                    <h4 className={`text-xs font-black uppercase mb-4 ${editingContract.Tipo_Servico === 'UI-Z' ? 'text-[#ff2400]' : 'text-red-200/70'}`}>
                                        {editingContract.Tipo_Servico === 'UI-Z' ? 'Plano de Assinatura' : 'Detalhes do Contrato'}
                                    </h4>
                                    
                                    {editingContract.Tipo_Servico === 'UI-Z' ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-red-300 uppercase mb-1 block">Setup Fee (Taxa Única)</label>
                                                <input type="number" value={editingContract.UIZ_Setup_Fee ?? ''} onChange={e => setEditingContract({...editingContract, UIZ_Setup_Fee: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="w-full p-3 bg-black/30 rounded-xl text-sm font-bold outline-none text-[#ff2400]" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-red-300 uppercase mb-1 block">Valor Mensal (Recorrente)</label>
                                                <input type="number" value={editingContract.UIZ_Valor_Mensal ?? ''} onChange={e => setEditingContract({...editingContract, UIZ_Valor_Mensal: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="w-full p-3 bg-black/30 rounded-xl text-sm font-bold outline-none text-[#ff2400]" />
                                            </div>
                                            <div className="col-span-2">
                                                 <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Data de Início</label>
                                                 <input type="date" value={editingContract.Data_Inicio || ''} onChange={e => setEditingContract({...editingContract, Data_Inicio: e.target.value})} className="w-full p-3 bg-black/30 rounded-xl text-xs font-bold outline-none" />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Início</label>
                                                <input type="date" value={editingContract.Data_Inicio || ''} onChange={e => setEditingContract({...editingContract, Data_Inicio: e.target.value})} className="w-full p-3 bg-black/25 rounded-xl text-xs font-bold outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Renovação</label>
                                                <input type="date" value={editingContract.Data_Renovacao || ''} onChange={e => setEditingContract({...editingContract, Data_Renovacao: e.target.value})} className="w-full p-3 bg-black/25 rounded-xl text-xs font-bold outline-none" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Valor Sugerido</label>
                                                <input type="number" value={editingContract.Valor_Sugerido_Renovacao ?? ''} onChange={e => setEditingContract({...editingContract, Valor_Sugerido_Renovacao: e.target.value === '' ? undefined : parseFloat(e.target.value)})} className="w-full p-3 bg-black/25 rounded-xl text-sm font-bold outline-none" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-auto pt-6 flex justify-between items-center border-t border-red-500/25/50">
                                {!editingContract.id?.startsWith('new') && (
                                    <button onClick={() => handleDeleteContract(editingContract.id!)} className="flex items-center gap-2 text-[#ff2400] font-bold text-xs hover:bg-black/30 px-3 py-2 rounded-lg transition-colors"><Trash2 size={14}/> Excluir</button>
                                )}
                                <div className="flex gap-3 ml-auto">
                                    <button onClick={handleSaveContract} disabled={isSubmitting} className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold text-xs shadow-lg hover:bg-red-950 transition-all">
                                        {isSubmitting ? 'Salvando...' : 'Salvar Alterações'} <Check size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-red-200/60">
                            <Briefcase size={48} className="mb-4 opacity-20"/>
                            <p className="font-bold text-xs uppercase tracking-widest">Selecione um cliente para editar</p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* TAB: RESULTADOS (Financeiro) */}
        {activeTab === 'resultados' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                 
                 {/* Lista Clientes (Esquerda) */}
                 <div className="lg:col-span-1 flex flex-col gap-4">
                     <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-black text-red-200/70 uppercase tracking-widest">Competência: <span className="text-[#ff2400]">{selectedMonth}</span></h3>
                     </div>
                     <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {contracts.filter(c => c.Status_Contrato === 'Ativo').map(c => {
                             const hasResult = monthlyResults.find(r => r.contractId === c.id && r.Mes_Referencia === selectedMonth);
                             // Cor da borda/fundo baseada no status de pagamento
                             let statusStyle = 'border-red-500/25 text-red-200/80';
                             if (hasResult) {
                                 if (hasResult.Status_Pagamento === 'Pago') statusStyle = 'bg-black/30 border-red-500/40 text-[#ff2400]';
                                 else if (hasResult.Status_Pagamento === 'Atrasado') statusStyle = 'bg-black/30 border-red-500/40 text-[#ff2400]';
                                 else statusStyle = 'bg-black/30 border-red-500/40 text-[#ff2400]';
                             }

                             return (
                                 <button 
                                    key={c.id} 
                                    onClick={() => {
                                        if (hasResult) {
                                            setEditingResult(hasResult);
                                        } else {
                                            const isUIZ = c.Tipo_Servico === 'UI-Z';
                                            const val = isUIZ ? (c.UIZ_Valor_Mensal || 0) : (c.Valor_Sugerido_Renovacao || 0);
                                            setEditingResult({
                                                contractId: c.id,
                                                Mes_Referencia: selectedMonth,
                                                Receita_Mensal_BRL: val,
                                                Status_Mensal: 'Ativo',
                                                Status_Pagamento: 'Pendente',
                                                Conteudos_Contratados: 0,
                                                Conteudos_Entregues: 0,
                                                Conteudos_Nao_Entregues: 0
                                            });
                                        }
                                    }}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all flex justify-between items-center ${editingResult?.contractId === c.id ? 'ring-2 ring-red-500' : ''} ${statusStyle}`}
                                 >
                                    <div>
                                        <p className="font-bold text-xs">{c.Cliente}</p>
                                        <p className="text-[9px] uppercase opacity-70">{c.Tipo_Servico}</p>
                                    </div>
                                    {hasResult && (
                                        <div className="text-right">
                                            <p className="font-black text-xs">{formatCurrency(hasResult.Receita_Mensal_BRL)}</p>
                                            <p className="text-[8px] font-black uppercase">{hasResult.Status_Pagamento}</p>
                                        </div>
                                    )}
                                 </button>
                             )
                        })}
                     </div>
                 </div>

                 {/* Formulário Lançamento (Direita) */}
                 <div className="lg:col-span-2 bg-black/25 rounded-[32px] p-8 border border-red-500/25 flex flex-col justify-center">
                    {editingResult ? (
                        <div className="animate-fade-in max-w-lg mx-auto w-full bg-black/30 p-8 rounded-[32px] shadow-xl border border-red-500/25">
                            <h4 className="text-center text-sm font-black text-red-50 uppercase mb-8">
                                Lançamento Financeiro
                                <span className="block text-[10px] text-red-200/70 mt-1">{contracts.find(c => c.id === editingResult.contractId)?.Cliente}</span>
                            </h4>
                            
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Receita Real</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-4 text-red-200/70 text-sm font-bold">R$</span>
                                            <input 
                                                type="number" 
                                                value={editingResult.Receita_Mensal_BRL ?? ''} 
                                                onChange={e => setEditingResult({...editingResult, Receita_Mensal_BRL: e.target.value === '' ? 0 : parseFloat(e.target.value)})}
                                                className="w-full p-4 pl-10 bg-black/25 rounded-2xl text-xl font-black text-red-50 outline-none focus:ring-2 focus:ring-red-500/30" 
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="text-[10px] font-bold text-red-200/70 uppercase mb-2 block">Status Pagamento</label>
                                        <select 
                                            value={editingResult.Status_Pagamento || 'Pendente'} 
                                            onChange={e => setEditingResult({...editingResult, Status_Pagamento: e.target.value as any})}
                                            className={`w-full p-4 rounded-2xl text-sm font-black outline-none appearance-none cursor-pointer border-r-[16px] border-r-transparent ${
                                                editingResult.Status_Pagamento === 'Pago' ? 'bg-red-500/20 text-[#ff2400]' :
                                                editingResult.Status_Pagamento === 'Atrasado' ? 'bg-red-500/20 text-[#ff2400]' :
                                                'bg-red-500/20 text-[#ff2400]'
                                            }`}
                                        >
                                            <option value="Pendente">⏳ Pendente</option>
                                            <option value="Pago">✅ Pago</option>
                                            <option value="Atrasado">🚨 Atrasado</option>
                                        </select>
                                    </div>
                                </div>

                                <button onClick={handleSaveResult} disabled={isSubmitting} className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-widest hover:bg-red-950 transition-all shadow-xl shadow-red-900/20 active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-red-200/60">
                            <CreditCard size={48} className="mb-4 opacity-20"/>
                            <p className="font-bold text-xs uppercase tracking-widest">Selecione um cliente para lançar</p>
                        </div>
                    )}
                 </div>
             </div>
        )}

        {/* TAB: CUSTOS */}
        {activeTab === 'custos' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                 <div className="lg:col-span-1 flex flex-col gap-4">
                     <div className="flex justify-between items-center">
                        <h3 className="text-xs font-black text-red-200/70 uppercase tracking-widest">Saídas</h3>
                        <button onClick={() => setEditingCost({ id: `new_cost_${Date.now()}`, Mes_Referencia: selectedMonth, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Fixo' })} className="p-2 bg-red-600 text-white rounded-xl shadow-lg hover:bg-red-700 transition-all"><Plus size={18}/></button>
                     </div>
                     <div className="overflow-y-auto custom-scrollbar space-y-2 pr-2">
                        {allCosts.filter(c => c.Mes_Referencia === selectedMonth).map(c => (
                            <div key={c.id} className="p-4 bg-black/30 rounded-2xl border border-red-500/25 flex justify-between items-center group hover:shadow-md transition-all">
                                 <div>
                                    <p className="font-bold text-red-50 text-sm">{c.Tipo_Custo}</p>
                                    <span className="text-[9px] bg-black/[0.32] text-red-200/70 px-2 py-0.5 rounded uppercase">{c.Categoria}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="font-mono font-bold text-[#ff2400] text-xs">{privacyMode ? '••••' : formatCurrency(c.Valor_Mensal_BRL)}</span>
                                    <button onClick={() => handleDeleteCost(c.id)} className="text-red-200/60 hover:text-[#ff2400] transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                     </div>
                 </div>
                 
                 {editingCost && (
                    <div className="lg:col-span-2 bg-black/30 rounded-[32px] p-8 border border-red-500/25 shadow-xl animate-fade-in h-fit self-center">
                        <div className="flex justify-between mb-6">
                            <h4 className="text-sm font-black text-red-50 uppercase">Nova Despesa</h4>
                            <button onClick={() => setEditingCost(null)}><X size={20} className="text-red-200/70"/></button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Descrição</label>
                                <input type="text" value={editingCost.Tipo_Custo || ''} onChange={e => setEditingCost({...editingCost, Tipo_Custo: e.target.value})} className="w-full p-3 bg-black/25 rounded-xl text-sm font-bold outline-none" autoFocus />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Valor (R$)</label>
                                <input type="number" value={editingCost.Valor_Mensal_BRL ?? ''} onChange={e => setEditingCost({...editingCost, Valor_Mensal_BRL: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="w-full p-3 bg-black/25 rounded-xl text-sm font-bold outline-none text-[#ff2400]" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-red-200/70 uppercase mb-1 block">Categoria</label>
                                <select value={editingCost.Categoria} onChange={e => setEditingCost({...editingCost, Categoria: e.target.value as any})} className="w-full p-3 bg-black/25 rounded-xl text-sm font-bold outline-none cursor-pointer">
                                    <option value="Operacional">Operacional</option>
                                    <option value="Administrativo">Administrativo</option>
                                    <option value="Impostos">Impostos</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                        </div>
                        <button onClick={handleSaveCost} disabled={isSubmitting} className="w-full py-3 bg-black text-white rounded-xl font-bold uppercase tracking-widest hover:bg-red-950 transition-all">
                            {isSubmitting ? 'Salvando...' : 'Adicionar Despesa'}
                        </button>
                    </div>
                 )}
             </div>
        )}
      </div>
    </div>
  );
};
