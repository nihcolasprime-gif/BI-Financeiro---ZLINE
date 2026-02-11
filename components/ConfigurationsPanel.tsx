import React, { useState } from 'react';
import { 
  Settings, Users, FileText, DollarSign, Plus, Trash2, Save, X, 
  AlertCircle, Check, ChevronDown, ChevronUp, Search, Target, Briefcase 
} from 'lucide-react';
import { ClientData, ClientContract, ClientMonthlyResult, CostData, GlobalSettings, MonthlyGrowthData } from '../types';
import { STANDARD_MONTHS } from '../constants';
import { formatCurrency } from '../utils';

// --- IMPORTANDO AS FUNÇÕES DO BANCO DE DADOS ---
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
  contracts, monthlyResults, allCosts, months, settings, growthData, selectedMonth,
  onUpdateContracts, onUpdateResults, onUpdateCosts, onUpdateSettings, onUpdateGrowth,
  privacyMode
}) => {
  const [activeTab, setActiveTab] = useState<'geral' | 'contratos' | 'resultados' | 'custos' | 'growth'>('geral');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados locais para formulários
  const [editingContract, setEditingContract] = useState<Partial<ClientContract> | null>(null);
  const [editingResult, setEditingResult] = useState<Partial<ClientMonthlyResult> | null>(null);
  const [editingCost, setEditingCost] = useState<Partial<CostData> | null>(null);
  
  // Estado local para Settings e Growth
  const [localSettings, setLocalSettings] = useState<GlobalSettings>(settings);
  const [localAdSpend, setLocalAdSpend] = useState<number>(
    growthData.find(g => g.month === selectedMonth)?.adSpend || 0
  );

  const showFeedback = (type: 'success' | 'error', msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  // --- HANDLERS CONTRATOS ---
  
  const handleSaveContract = async () => {
    if (!editingContract?.Cliente) return;
    setIsSubmitting(true);
    try {
      // 1. Salva no Supabase
      const saved = await upsertContract(editingContract as ClientContract);
      
      // 2. Atualiza Estado Local (UI)
      onUpdateContracts(prev => {
        const exists = prev.find(c => c.id === saved.id);
        if (exists) return prev.map(c => c.id === saved.id ? saved : c);
        return [...prev, saved];
      });

      setEditingContract(null);
      showFeedback('success', 'Contrato salvo com sucesso!');
    } catch (error) {
      console.error(error);
      showFeedback('error', 'Erro ao salvar contrato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteContract = async (id: string) => {
    if (!confirm('Tem certeza? Isso apagará o histórico deste cliente.')) return;
    setIsSubmitting(true);
    try {
      await deleteContract(id);
      onUpdateContracts(prev => prev.filter(c => c.id !== id));
      showFeedback('success', 'Contrato removido.');
    } catch (error) {
      showFeedback('error', 'Erro ao remover contrato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLERS RESULTADOS ---

  const handleSaveResult = async () => {
    if (!editingResult?.contractId || !editingResult.Mes_Referencia) return;
    setIsSubmitting(true);
    try {
      const saved = await upsertMonthlyResult(editingResult as ClientMonthlyResult);
      
      onUpdateResults(prev => {
        // Remove anterior se existir (para evitar duplicata visual temporária)
        const clean = prev.filter(r => r.id !== saved.id);
        return [...clean, saved];
      });

      setEditingResult(null);
      showFeedback('success', 'Resultado lançado!');
    } catch (error) {
      showFeedback('error', 'Erro ao lançar resultado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLERS CUSTOS ---

  const handleSaveCost = async () => {
    if (!editingCost?.Tipo_Custo || !editingCost.Valor_Mensal_BRL) return;
    setIsSubmitting(true);
    try {
      const saved = await upsertCost(editingCost as CostData);
      
      onUpdateCosts(prev => {
        const exists = prev.find(c => c.id === saved.id);
        if (exists) return prev.map(c => c.id === saved.id ? saved : c);
        return [...prev, saved];
      });

      setEditingCost(null);
      showFeedback('success', 'Custo salvo!');
    } catch (error) {
      showFeedback('error', 'Erro ao salvar custo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCost = async (id: string) => {
    if (!confirm('Remover este custo?')) return;
    setIsSubmitting(true);
    try {
      await deleteCost(id);
      onUpdateCosts(prev => prev.filter(c => c.id !== id));
      showFeedback('success', 'Custo removido.');
    } catch (error) {
      showFeedback('error', 'Erro ao remover custo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- HANDLERS SETTINGS & GROWTH ---

  const handleSaveSettings = async () => {
    setIsSubmitting(true);
    try {
      await saveSettings(localSettings);
      await saveGrowthData(selectedMonth, localAdSpend);
      
      onUpdateSettings(localSettings);
      onUpdateGrowth(prev => {
         const others = prev.filter(g => g.month !== selectedMonth);
         return [...others, { month: selectedMonth, adSpend: localAdSpend }];
      });

      showFeedback('success', 'Configurações globais salvas.');
    } catch (error) {
      showFeedback('error', 'Erro ao salvar configurações.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- RENDERIZADORES ---

  return (
    <div className="glass-panel p-6 rounded-[40px] shadow-xl min-h-[600px] relative overflow-hidden">
      {/* Feedback Toast */}
      {feedback && (
        <div className={`absolute top-4 right-4 px-4 py-2 rounded-xl text-xs font-bold shadow-lg animate-fade-in z-50 flex items-center gap-2 ${feedback.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
          {feedback.type === 'success' ? <Check size={14}/> : <AlertCircle size={14}/>}
          {feedback.msg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 border-b border-slate-100 no-scrollbar">
        {[
            { id: 'geral', icon: Settings, label: 'Ajustes Globais' },
            { id: 'contratos', icon: Users, label: 'Contratos (Clientes)' },
            { id: 'resultados', icon: FileText, label: 'Lançamento Mensal' },
            { id: 'custos', icon: DollarSign, label: 'Custos & Despesas' }
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
            >
                <tab.icon size={14} /> {tab.label}
            </button>
        ))}
      </div>

      <div className="animate-fade-in">
        
        {/* TAB: GERAL */}
        {activeTab === 'geral' && (
            <div className="max-w-2xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Target size={14}/> Metas & Impostos</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Imposto Médio (%)</label>
                                <input type="number" step="0.1" value={localSettings.taxRate * 100} onChange={e => setLocalSettings({...localSettings, taxRate: parseFloat(e.target.value)/100})} className="w-full p-2 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Margem Alvo (%)</label>
                                <input type="number" step="1" value={localSettings.targetMargin * 100} onChange={e => setLocalSettings({...localSettings, targetMargin: parseFloat(e.target.value)/100})} className="w-full p-2 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Briefcase size={14}/> Capacidade & Growth</h4>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Capacidade Máxima (Vídeos/Mês)</label>
                                <input type="number" value={localSettings.maxProductionCapacity} onChange={e => setLocalSettings({...localSettings, maxProductionCapacity: parseInt(e.target.value)})} className="w-full p-2 bg-white rounded-xl text-sm font-bold border border-slate-200 outline-none focus:border-indigo-500 transition-colors" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-indigo-500 uppercase">Investimento Ads ({selectedMonth})</label>
                                <input type="number" value={localAdSpend} onChange={e => setLocalAdSpend(parseFloat(e.target.value))} className="w-full p-2 bg-indigo-50 rounded-xl text-sm font-bold border border-indigo-100 outline-none focus:border-indigo-500 transition-colors text-indigo-700" />
                            </div>
                        </div>
                    </div>
                </div>
                <button onClick={handleSaveSettings} disabled={isSubmitting} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 disabled:opacity-50">
                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações Globais'}
                </button>
            </div>
        )}

        {/* TAB: CONTRATOS */}
        {activeTab === 'contratos' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Gerenciar Clientes</h3>
                    <button onClick={() => setEditingContract({ id: `new_${Date.now()}`, Status_Contrato: 'Ativo', Tipo_Servico: 'Agency' })} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/30">
                        <Plus size={16} /> Novo Cliente
                    </button>
                </div>

                {editingContract && (
                    <div className="bg-white border-2 border-indigo-100 p-6 rounded-[2rem] shadow-2xl animate-fade-in relative z-10">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Cliente</label>
                                <input type="text" value={editingContract.Cliente || ''} onChange={e => setEditingContract({...editingContract, Cliente: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500/20" autoFocus />
                            </div>
                             <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Tipo de Serviço</label>
                                <select 
                                    value={editingContract.Tipo_Servico || 'Agency'} 
                                    onChange={e => setEditingContract({...editingContract, Tipo_Servico: e.target.value as any})}
                                    className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none focus:ring-2 focus:ring-indigo-500/20"
                                >
                                    <option value="Agency">Agency (Padrão)</option>
                                    <option value="UI-Z">UI-Z (Assinatura)</option>
                                </select>
                            </div>
                         </div>

                         {/* CAMPOS DINÂMICOS BASEADOS NO TIPO DE SERVIÇO */}
                         {editingContract.Tipo_Servico === 'UI-Z' ? (
                             <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4 grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Taxa de Setup (Única)</label>
                                    <input type="number" value={editingContract.UIZ_Setup_Fee || 0} onChange={e => setEditingContract({...editingContract, UIZ_Setup_Fee: parseFloat(e.target.value)})} className="w-full p-2 bg-white rounded-lg text-sm font-bold outline-none" placeholder="Ex: 99.90" />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-indigo-400 uppercase">Mensalidade UI-Z</label>
                                    <input type="number" value={editingContract.UIZ_Valor_Mensal || 0} onChange={e => setEditingContract({...editingContract, UIZ_Valor_Mensal: parseFloat(e.target.value)})} className="w-full p-2 bg-white rounded-lg text-sm font-bold outline-none" placeholder="Ex: 49.90" />
                                 </div>
                             </div>
                         ) : (
                             <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 grid grid-cols-2 gap-4">
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Data Início</label>
                                    <input type="date" value={editingContract.Data_Inicio || ''} onChange={e => setEditingContract({...editingContract, Data_Inicio: e.target.value})} className="w-full p-2 bg-white rounded-lg text-xs font-bold outline-none" />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Renovação</label>
                                    <input type="date" value={editingContract.Data_Renovacao || ''} onChange={e => setEditingContract({...editingContract, Data_Renovacao: e.target.value})} className="w-full p-2 bg-white rounded-lg text-xs font-bold outline-none" />
                                 </div>
                             </div>
                         )}

                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Status</label>
                                <select value={editingContract.Status_Contrato} onChange={e => setEditingContract({...editingContract, Status_Contrato: e.target.value as any})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none">
                                    <option value="Ativo">Ativo</option>
                                    <option value="Inativo">Inativo</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Dia Vencimento</label>
                                <input type="number" value={editingContract.Dia_Pagamento || ''} onChange={e => setEditingContract({...editingContract, Dia_Pagamento: parseInt(e.target.value)})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Origem</label>
                                <select value={editingContract.Origem || 'Indicação'} onChange={e => setEditingContract({...editingContract, Origem: e.target.value as any})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none">
                                    <option value="Indicação">Indicação</option>
                                    <option value="Ads">Ads</option>
                                    <option value="Outbound">Outbound</option>
                                    <option value="Orgânico">Orgânico</option>
                                    <option value="Parceria">Parceria</option>
                                </select>
                            </div>
                         </div>
                         
                         <div className="flex gap-2 justify-end">
                             <button onClick={() => setEditingContract(null)} className="px-4 py-2 text-slate-400 font-bold text-xs hover:text-slate-600">Cancelar</button>
                             <button onClick={handleSaveContract} disabled={isSubmitting} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-slate-800 transition-all">
                                 {isSubmitting ? 'Salvando...' : 'Confirmar'}
                             </button>
                         </div>
                    </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {contracts.map(c => (
                        <div key={c.id} className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${c.Status_Contrato === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{c.Cliente}</p>
                                    <div className="flex gap-2">
                                        <span className="text-[10px] text-slate-400 uppercase">{c.Tipo_Servico || 'Agency'}</span>
                                        {c.Tipo_Servico === 'UI-Z' && <span className="text-[10px] text-indigo-500 font-bold uppercase">R$ {c.UIZ_Valor_Mensal}/mês</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => setEditingContract(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Settings size={14} /></button>
                                <button onClick={() => handleDeleteContract(c.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* TAB: RESULTADOS */}
        {activeTab === 'resultados' && (
             <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Lançamentos de {selectedMonth}</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {/* Lista de Clientes para Lançar */}
                     <div className="md:col-span-1 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                        {contracts.filter(c => c.Status_Contrato === 'Ativo').map(c => {
                             const hasResult = monthlyResults.find(r => r.contractId === c.id && r.Mes_Referencia === selectedMonth);
                             return (
                                 <button 
                                    key={c.id} 
                                    onClick={() => {
                                        // Se já existe resultado, edita. Se não, cria pré-preenchido
                                        if (hasResult) {
                                            setEditingResult(hasResult);
                                        } else {
                                            setEditingResult({
                                                contractId: c.id,
                                                Mes_Referencia: selectedMonth,
                                                // Pré-preencher valores se for UI-Z ou Agency
                                                Receita_Mensal_BRL: c.Tipo_Servico === 'UI-Z' ? (c.UIZ_Valor_Mensal || 0) : (c.Valor_Sugerido_Renovacao || 0),
                                                Status_Mensal: 'Ativo',
                                                Conteudos_Contratados: 0,
                                                Conteudos_Entregues: 0,
                                                Conteudos_Nao_Entregues: 0
                                            });
                                        }
                                    }}
                                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex justify-between items-center ${hasResult ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-300'}`}
                                 >
                                    {c.Cliente}
                                    {hasResult && <Check size={12} />}
                                 </button>
                             )
                        })}
                     </div>

                     {/* Form de Edição */}
                     <div className="md:col-span-2">
                        {editingResult ? (
                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 animate-fade-in">
                                <h4 className="text-xs font-black text-slate-900 uppercase mb-4">
                                    Lançando: {contracts.find(c => c.id === editingResult.contractId)?.Cliente}
                                </h4>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Receita Real ({selectedMonth})</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3 text-slate-400 text-xs font-bold">R$</span>
                                            <input 
                                                type="number" 
                                                value={editingResult.Receita_Mensal_BRL || 0} 
                                                onChange={e => setEditingResult({...editingResult, Receita_Mensal_BRL: parseFloat(e.target.value)})}
                                                className="w-full p-3 pl-8 bg-white rounded-xl text-lg font-black text-slate-800 border-none outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Contratados</label>
                                            <input type="number" value={editingResult.Conteudos_Contratados || 0} onChange={e => setEditingResult({...editingResult, Conteudos_Contratados: parseInt(e.target.value)})} className="w-full p-2 bg-white rounded-xl font-bold text-center outline-none" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-emerald-500 uppercase">Entregues</label>
                                            <input type="number" value={editingResult.Conteudos_Entregues || 0} onChange={e => setEditingResult({...editingResult, Conteudos_Entregues: parseInt(e.target.value)})} className="w-full p-2 bg-white border border-emerald-100 rounded-xl font-bold text-center outline-none text-emerald-700" />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-rose-500 uppercase">Pendentes</label>
                                            <input type="number" value={editingResult.Conteudos_Nao_Entregues || 0} onChange={e => setEditingResult({...editingResult, Conteudos_Nao_Entregues: parseInt(e.target.value)})} className="w-full p-2 bg-white border border-rose-100 rounded-xl font-bold text-center outline-none text-rose-700" />
                                        </div>
                                    </div>

                                    <button onClick={handleSaveResult} disabled={isSubmitting} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
                                        {isSubmitting ? 'Salvando...' : 'Confirmar Lançamento'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                <FileText size={32} className="mb-2 opacity-50"/>
                                <p className="text-xs font-bold uppercase">Selecione um cliente ao lado</p>
                            </div>
                        )}
                     </div>
                </div>
             </div>
        )}

        {/* TAB: CUSTOS */}
        {activeTab === 'custos' && (
             <div className="space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Despesas de {selectedMonth}</h3>
                    <button onClick={() => setEditingCost({ id: `new_cost_${Date.now()}`, Mes_Referencia: selectedMonth, Ativo_no_Mes: true, Categoria: 'Operacional', Tipo: 'Fixo' })} className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-500/30">
                        <Plus size={16} /> Nova Despesa
                    </button>
                </div>

                {editingCost && (
                    <div className="bg-white border-2 border-rose-100 p-6 rounded-[2rem] shadow-xl animate-fade-in relative z-10 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Descrição</label>
                                <input type="text" value={editingCost.Tipo_Custo || ''} onChange={e => setEditingCost({...editingCost, Tipo_Custo: e.target.value})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none" placeholder="Ex: Editor Freelancer" autoFocus />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Valor (R$)</label>
                                <input type="number" value={editingCost.Valor_Mensal_BRL || 0} onChange={e => setEditingCost({...editingCost, Valor_Mensal_BRL: parseFloat(e.target.value)})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold border-none outline-none" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Categoria</label>
                                <select value={editingCost.Categoria} onChange={e => setEditingCost({...editingCost, Categoria: e.target.value as any})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none">
                                    <option value="Operacional">Operacional</option>
                                    <option value="Administrativo">Administrativo</option>
                                    <option value="Impostos">Impostos</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Recorrência</label>
                                <select value={editingCost.Tipo} onChange={e => setEditingCost({...editingCost, Tipo: e.target.value as any})} className="w-full p-3 bg-slate-50 rounded-xl text-sm font-bold outline-none">
                                    <option value="Fixo">Fixo</option>
                                    <option value="Variável">Variável</option>
                                    <option value="Extraordinário">Extraordinário</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                             <button onClick={() => setEditingCost(null)} className="px-4 py-2 text-slate-400 font-bold text-xs hover:text-slate-600">Cancelar</button>
                             <button onClick={handleSaveCost} disabled={isSubmitting} className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-slate-800 transition-all">
                                 {isSubmitting ? 'Salvando...' : 'Confirmar Despesa'}
                             </button>
                         </div>
                    </div>
                )}

                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {allCosts.filter(c => c.Mes_Referencia === selectedMonth).map(c => (
                        <div key={c.id} className="group flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:border-rose-200 hover:shadow-md transition-all">
                             <div>
                                <p className="font-bold text-slate-800 text-sm">{c.Tipo_Custo}</p>
                                <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase">{c.Categoria}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-mono font-bold text-rose-600">{privacyMode ? '••••' : formatCurrency(c.Valor_Mensal_BRL)}</span>
                                <button onClick={() => handleDeleteCost(c.id)} className="p-2 text-slate-300 hover:text-rose-600 rounded-lg transition-colors"><Trash2 size={14} /></button>
                            </div>
                        </div>
                    ))}
                    {allCosts.filter(c => c.Mes_Referencia === selectedMonth).length === 0 && (
                        <p className="text-center text-slate-400 text-xs font-bold py-8">Nenhuma despesa lançada neste mês.</p>
                    )}
                </div>
             </div>
        )}

      </div>
    </div>
  );
};
