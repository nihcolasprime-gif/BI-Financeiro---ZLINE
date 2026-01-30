import React, { useState, useMemo, useEffect } from 'react';
import { 
  Settings, Database, Calculator, Save, RefreshCw, 
  FileText, Lock, Edit3, AlertTriangle, Download, 
  CheckCircle, Shield, X, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Users, RotateCcw,
  Play, Plus, Trash2, History, AlertCircle, BarChart3, Battery
} from 'lucide-react';
import { ClientData, CostData } from '../types';
import { 
  calculateSimulation, 
  generateAuditReport, 
  SimulationState, 
  SimulationEvent,
  SystemSettings 
} from '../utils/configAudit';
import { formatCurrency, formatPercent } from '../utils';

// --- STYLES & HELPERS ---
const NavyText = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <span className={`text-[#0f172a] ${className}`}>{children}</span>
);

// Mask helper for Config
const MaskedValue = ({ value, privacyMode, format, className }: { value: any, privacyMode: boolean, format?: (v: any) => string, className?: string }) => {
  if (privacyMode) return <span className={`blur-[4px] select-none bg-slate-200/50 rounded px-1 text-slate-400 ${className}`}>••••</span>;
  return <span className={className}>{format ? format(value) : value}</span>;
};

interface ConfigurationsPanelProps {
  allClients: ClientData[];
  allCosts: CostData[];
  months: string[];
  currentMonth: string;
  onApplyChanges?: (clients: ClientData[], costs: CostData[]) => void;
  privacyMode?: boolean;
}

const DEFAULT_SETTINGS: SystemSettings = {
  taxRate: 0.10,
  targetMargin: 0.20,
  lerTarget: 3.0,
  allocationMethod: 'perDelivered',
  inflationFactor: 1.0,
  seasonalMultiplier: 1.0,
  tolerancePercentage: 0.01,
  oneTimeAdjustments: 0,
  maxProductionCapacity: 140, 
  manualCostPerContentOverride: 0
};

const SIM_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const SIM_YEARS = Array.from({ length: 12 }, (_, i) => (2024 + i).toString());

export const ConfigurationsPanel: React.FC<ConfigurationsPanelProps> = ({
  allClients,
  allCosts,
  months,
  currentMonth: initialMonth,
  onApplyChanges,
  privacyMode = false
}) => {
  // --- STATE ---
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [mode, setMode] = useState<'simulation' | 'readonly'>('simulation');
  const [expandedSection, setExpandedSection] = useState<string | null>('clients');
  const [applyStep, setApplyStep] = useState<0 | 1 | 2>(0); 
  const [applyInput, setApplyInput] = useState('');
  
  // Modals
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [isAddCostModalOpen, setIsAddCostModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemValue, setNewItemValue] = useState(0);

  // Split selectedMonth for internal state usage
  const [selMonthName, selYear] = selectedMonth.includes('/') ? selectedMonth.split('/') : initialMonth.split('/');

  const handleDateChange = (m: string, y: string) => {
     setSelectedMonth(`${m}/${y}`);
  };

  // Simulation State
  const [simulation, setSimulation] = useState<SimulationState>({
    clients: {},
    costs: {},
    addedClients: [],
    addedCosts: [],
    deletedClientIds: [],
    deletedCostIds: [],
    global: { ...DEFAULT_SETTINGS }
  });

  const [events, setEvents] = useState<SimulationEvent[]>([]);
  const [snapshotId] = useState(`SIM-${new Date().toISOString().replace(/[-:T.]/g,'').slice(0,14)}`);
  const currentUser = { id: 'usr-1', name: 'Admin User' };

  // --- CALCULATIONS ---
  const simResult = useMemo(() => 
    calculateSimulation(selectedMonth, allClients, allCosts, simulation), 
  [selectedMonth, allClients, allCosts, simulation]);

  const realResult = useMemo(() => 
    calculateSimulation(selectedMonth, allClients, allCosts, {
      clients: {}, costs: {}, addedClients: [], addedCosts: [], deletedClientIds: [], deletedCostIds: [], global: DEFAULT_SETTINGS
    }), 
  [selectedMonth, allClients, allCosts]);

  // --- ACTIONS ---

  const logEvent = (
    targetType: SimulationEvent['targetType'],
    field: string,
    oldValue: any,
    newValue: any,
    targetId?: string,
    note?: string
  ) => {
    const newEvent: SimulationEvent = {
      id: `evt-${Date.now()}`,
      ts: new Date().toISOString(),
      userId: currentUser.id,
      targetType,
      targetId,
      month: selectedMonth,
      field,
      oldValue,
      newValue,
      note
    };
    setEvents(prev => [...prev, newEvent]);
  };

  const handleGlobalChange = (field: keyof SystemSettings, value: any) => {
    if (mode === 'readonly') return;
    const oldValue = simulation.global[field];
    logEvent('setting', field, oldValue, value, undefined, 'Global parameter change');
    setSimulation(prev => ({
      ...prev,
      global: { ...prev.global, [field]: value }
    }));
  };

  const handleClientChange = (clientId: string, field: keyof ClientData, value: any) => {
    if (mode === 'readonly') return;
    const originalClient = allClients.find(c => c.id === clientId) || simulation.addedClients.find(c => c.id === clientId);
    const prevOverride = simulation.clients[selectedMonth]?.[clientId]?.[field];
    const oldValue = prevOverride !== undefined ? prevOverride : originalClient?.[field];

    logEvent('clientMonthly', field, oldValue, value, clientId);

    setSimulation(prev => ({
      ...prev,
      clients: {
        ...prev.clients,
        [selectedMonth]: {
          ...(prev.clients[selectedMonth] || {}),
          [clientId]: {
            ...(prev.clients[selectedMonth]?.[clientId] || {}),
            [field]: value
          }
        }
      }
    }));
  };

  const handleCostChange = (costId: string, field: keyof CostData, value: any) => {
    if (mode === 'readonly') return;
    const originalCost = allCosts.find(c => c.id === costId) || simulation.addedCosts.find(c => c.id === costId);
    const prevOverride = simulation.costs[selectedMonth]?.[costId]?.[field];
    const oldValue = prevOverride !== undefined ? prevOverride : originalCost?.[field];

    logEvent('costMonthly', field, oldValue, value, costId);

    setSimulation(prev => ({
      ...prev,
      costs: {
        ...prev.costs,
        [selectedMonth]: {
          ...(prev.costs[selectedMonth] || {}),
          [costId]: {
            ...(prev.costs[selectedMonth]?.[costId] || {}),
            [field]: value
          }
        }
      }
    }));
  };

  const handleAddClient = () => {
      const newId = `new-client-${Date.now()}`;
      const newClient: ClientData = {
          id: newId,
          Cliente: newItemName || 'Novo Cliente',
          Mes_Referencia: selectedMonth,
          Status_Cliente: 'Ativo',
          Receita_Mensal_BRL: newItemValue,
          Conteudos_Contratados: 10, // Default
          Conteudos_Entregues: 10,
          Conteudos_Nao_Entregues: 0,
          Receita_Liquida_Apos_Imposto_BRL: newItemValue * (1 - simulation.global.taxRate)
      };

      setSimulation(prev => ({
          ...prev,
          addedClients: [...prev.addedClients, newClient]
      }));
      logEvent('add', 'create', null, newClient.Cliente, newId, 'Created new client');
      setIsAddClientModalOpen(false);
      setNewItemName('');
      setNewItemValue(0);
  };

  const handleAddCost = () => {
      const newId = `new-cost-${Date.now()}`;
      const newCost: CostData = {
          id: newId,
          Tipo_Custo: newItemName || 'Novo Custo',
          Mes_Referencia: selectedMonth,
          Valor_Mensal_BRL: newItemValue,
          Ativo_no_Mes: true
      };

      setSimulation(prev => ({
          ...prev,
          addedCosts: [...prev.addedCosts, newCost]
      }));
      logEvent('add', 'create', null, newCost.Tipo_Custo, newId, 'Created new cost');
      setIsAddCostModalOpen(false);
      setNewItemName('');
      setNewItemValue(0);
  };

  const handleDelete = (type: 'client' | 'cost', id: string) => {
      if(!confirm("Tem certeza que deseja remover este item da simulação?")) return;
      if (type === 'client') {
          setSimulation(prev => ({ ...prev, deletedClientIds: [...prev.deletedClientIds, id] }));
          logEvent('delete', 'status', 'active', 'deleted', id);
      } else {
          setSimulation(prev => ({ ...prev, deletedCostIds: [...prev.deletedCostIds, id] }));
          logEvent('delete', 'status', 'active', 'deleted', id);
      }
  };

  const executeApply = () => {
      const finalClients = [...allClients, ...simulation.addedClients].filter(c => !simulation.deletedClientIds.includes(c.id));
      const appliedClients = finalClients.map(c => {
          const override = simulation.clients[c.Mes_Referencia]?.[c.id];
          if (override) {
             const netRev = (override.Receita_Mensal_BRL !== undefined ? override.Receita_Mensal_BRL : c.Receita_Mensal_BRL) * (1 - simulation.global.taxRate);
             return { ...c, ...override, Receita_Liquida_Apos_Imposto_BRL: netRev };
          }
          return c;
      });

      const finalCosts = [...allCosts, ...simulation.addedCosts].filter(c => !simulation.deletedCostIds.includes(c.id));
      const appliedCosts = finalCosts.map(c => {
          const override = simulation.costs[c.Mes_Referencia]?.[c.id];
          return override ? { ...c, ...override } : c;
      });

      if (onApplyChanges) {
          onApplyChanges(appliedClients, appliedCosts);
      }

      setSimulation({ 
          clients: {}, costs: {}, 
          addedClients: [], addedCosts: [], 
          deletedClientIds: [], deletedCostIds: [], 
          global: { ...DEFAULT_SETTINGS, maxProductionCapacity: simulation.global.maxProductionCapacity } 
      });
      setEvents([]);
      setApplyStep(0);
      setApplyInput('');
      alert("Alterações aplicadas com sucesso!");
  };

  const downloadAudit = () => {
    const report = generateAuditReport(
      snapshotId, 
      currentUser, 
      selectedMonth, 
      allClients, 
      allCosts, 
      simulation, 
      events, 
      realResult.kpis
    );
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_${snapshotId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const resetSimulation = () => {
    if (confirm("Descartar todas as simulações e eventos?")) {
      setSimulation({ clients: {}, costs: {}, addedClients: [], addedCosts: [], deletedClientIds: [], deletedCostIds: [], global: { ...DEFAULT_SETTINGS } });
      setEvents([]);
    }
  };

  const DiffBadge = ({ real, sim, type = 'currency' }: { real: number, sim: number, type?: 'currency'|'percent'|'number'|'cost' }) => {
    const diff = sim - real;
    const pct = real !== 0 ? diff / real : 0;
    
    if (Math.abs(diff) < 0.01) return null;

    const isPositiveGood = type !== 'cost'; 
    
    let colorClass = '';
    if (diff > 0) {
        colorClass = isPositiveGood ? 'text-emerald-600' : 'text-rose-600';
    } else {
        colorClass = isPositiveGood ? 'text-rose-600' : 'text-emerald-600';
    }
    
    const sign = diff > 0 ? '+' : '';
    
    const fmt = (v: number) => 
      type === 'currency' || type === 'cost' ? formatCurrency(v) : 
      type === 'percent' ? formatPercent(v) : 
      v.toFixed(0);

    return (
      <div className={`text-[10px] font-bold flex items-center gap-1 ${colorClass} bg-white/60 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-slate-100`}>
        <span>{sign}{fmt(diff)}</span>
        <span className="opacity-75">({sign}{(pct*100).toFixed(1)}%)</span>
      </div>
    );
  };

  const toggleSection = (sec: string) => setExpandedSection(expandedSection === sec ? null : sec);

  // --- RENDER ---
  return (
    <div className="space-y-8 pb-24 relative">
      <style>{`
        .navy-num { color: #0f172a; font-family: 'JetBrains Mono', monospace; font-weight: 600; }
        .input-sim { 
          background: #ffffff; 
          border: 1px solid #e2e8f0; 
          border-radius: 8px; 
          padding: 4px 8px; 
          font-weight: 600; 
          color: #334155; 
          width: 100%; 
          transition: all 0.2s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .input-sim:focus { 
          outline: none; 
          border-color: #6366f1; 
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); 
        }
        .input-sim:disabled { 
          opacity: 0.7; 
          cursor: not-allowed; 
          background: #f8fafc; 
        }
        .privacy-blur { filter: blur(5px); opacity: 0.7; }
        .input-bare {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          border-radius: 0;
          padding: 4px 0;
          transition: border-color 0.2s;
        }
        .input-bare:focus {
          outline: none;
          box-shadow: none;
          border-bottom-color: #6366f1;
        }
      `}</style>

      {/* HEADER */}
      <div className="glass-panel p-6 rounded-[32px] shadow-lg shadow-slate-200/50 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
                  <Settings size={24} />
               </div>
               <div>
                 <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configurações & Auditoria</h2>
                 <p className="text-xs text-slate-500 font-medium">Controle total sobre parâmetros de simulação</p>
               </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 ml-1">
               <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                 <Shield size={12} className="text-slate-400" /> ID: <span className="font-mono font-bold text-slate-600">{snapshotId}</span>
               </span>
               <span className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
                 <History size={12} className="text-slate-400" /> Eventos: <span className="font-bold text-slate-600">{events.length}</span>
               </span>
            </div>
         </div>

         <div className="flex items-center gap-3">
             <div className="bg-slate-100/80 p-1.5 rounded-2xl flex items-center border border-slate-200">
                <button 
                  onClick={() => setMode('simulation')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'simulation' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Simulação
                </button>
                <button 
                  onClick={() => setMode('readonly')}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === 'readonly' ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Leitura
                </button>
             </div>
             
             {mode === 'simulation' && (
               <button 
                 onClick={resetSimulation}
                 className="p-3.5 rounded-2xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors border border-transparent hover:border-rose-100"
                 title="Resetar Simulação"
               >
                 <RotateCcw size={20} />
               </button>
             )}

             <button 
               onClick={downloadAudit}
               className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-colors shadow-sm"
             >
               <Download size={18} /> JSON
             </button>

             <button 
               onClick={() => setApplyStep(1)}
               disabled={events.length === 0}
               className={`
                 flex items-center gap-2 px-6 py-3 rounded-2xl font-bold shadow-xl shadow-indigo-500/20 transition-all border border-transparent
                 ${events.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
               `}
             >
               <Play size={18} fill="currentColor" /> Apply to Brain
             </button>
         </div>
      </div>

      {/* KPI DELTA SUMMARY */}
      {mode === 'simulation' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {([
             { label: 'Receita Líquida', real: realResult.kpis.netRevenue, sim: simResult.kpis.netRevenue },
             { label: 'Resultado Final', real: realResult.kpis.netResult, sim: simResult.kpis.netResult },
             { label: 'Margem %', real: realResult.kpis.margin, sim: simResult.kpis.margin, type: 'percent' as const },
             { label: 'Custo / Conteúdo', real: realResult.kpis.globalCostPerContent, sim: simResult.kpis.globalCostPerContent, type: 'cost' as const }
           ] as { label: string; real: number; sim: number; type?: 'currency'|'percent'|'number'|'cost' }[]).map((kpi, idx) => (
             <div key={idx} className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-white/60 shadow-sm relative overflow-hidden group hover:border-indigo-100 transition-colors">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</div>
                <div className="text-2xl font-bold navy-num flex flex-col items-start gap-2">
                   <MaskedValue value={kpi.sim} privacyMode={privacyMode} format={kpi.type === 'percent' ? formatPercent : formatCurrency} />
                   {!privacyMode && <DiffBadge real={kpi.real} sim={kpi.sim} type={kpi.type || 'currency'} />}
                </div>
             </div>
           ))}
        </div>
      )}

      {/* CAPACITY & GLOBAL PARAMS */}
      <div className="glass-panel p-8 rounded-[32px] shadow-sm">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
             
             {/* LEFT: PERIOD & CAPACITY */}
             <div className="lg:col-span-1 space-y-8">
                 <div className="bg-white/50 p-6 rounded-3xl border border-white/60 shadow-inner">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Simular Período</label>
                    <div className="flex gap-3">
                       <div className="relative flex-1">
                          <select 
                            value={selMonthName} 
                            onChange={(e) => handleDateChange(e.target.value, selYear)}
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 font-bold text-lg rounded-xl py-3 pl-4 pr-10 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          >
                            {SIM_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                       </div>
                       <div className="relative w-32">
                          <select 
                            value={selYear} 
                            onChange={(e) => handleDateChange(selMonthName, e.target.value)}
                            className="w-full appearance-none bg-white border border-slate-200 text-slate-700 font-bold text-lg rounded-xl py-3 pl-4 pr-10 outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                          >
                            {SIM_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                       </div>
                    </div>
                 </div>

                 {/* CAPACITY VISUAL */}
                 <div className="bg-slate-50/80 rounded-3xl p-6 border border-slate-200">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1.5 tracking-wider">
                           <Battery size={14} className="text-slate-400" /> Ocupação
                        </span>
                        <span className="text-2xl font-black navy-text">{formatPercent(simResult.kpis.capacityUtilization)}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden mb-3 shadow-inner">
                       <div 
                         className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${simResult.kpis.capacityUtilization > 0.9 ? 'bg-rose-500' : simResult.kpis.capacityUtilization > 0.7 ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                         style={{ width: `${Math.min(simResult.kpis.capacityUtilization * 100, 100)}%` }}
                       ></div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 font-medium px-1">
                        <span>Contratado: {simResult.kpis.totalContracted} un</span>
                        <span>Máx: {simResult.kpis.maxCapacity} un</span>
                    </div>
                    
                    <div className="mt-6 pt-5 border-t border-slate-200/80">
                       <label className="text-[10px] font-bold text-indigo-500 uppercase mb-2 block tracking-wider">Capacidade Máxima (Unidades)</label>
                       <input 
                         type="number"
                         value={simulation.global.maxProductionCapacity}
                         onChange={(e) => handleGlobalChange('maxProductionCapacity', parseFloat(e.target.value))}
                         disabled={mode === 'readonly'}
                         className="input-sim py-2 text-lg font-mono"
                       />
                       <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                          Espaço para aprox. <strong className="text-slate-600">{simResult.kpis.potentialClientsSpace.toFixed(1)}</strong> novos clientes médios.
                       </p>
                    </div>
                 </div>
             </div>

             {/* RIGHT: GLOBAL SETTINGS GRID */}
             <div className="lg:col-span-2 grid grid-cols-2 gap-6 content-start bg-white/40 p-6 rounded-3xl border border-white/50">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Taxa Imposto (0.1 = 10%)</label>
                  <input 
                    type="number" step="0.01"
                    disabled={mode === 'readonly'}
                    value={simulation.global.taxRate}
                    onChange={(e) => handleGlobalChange('taxRate', parseFloat(e.target.value))}
                    className="input-sim py-3 text-lg font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Margem (0.2 = 20%)</label>
                  <input 
                    type="number" step="0.01"
                    disabled={mode === 'readonly'}
                    value={simulation.global.targetMargin}
                    onChange={(e) => handleGlobalChange('targetMargin', parseFloat(e.target.value))}
                    className="input-sim py-3 text-lg font-mono"
                  />
                </div>
                
                <div className="space-y-2 col-span-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Método Alocação de Custos</label>
                   <div className="relative">
                     <select 
                       disabled={mode === 'readonly'}
                       value={simulation.global.allocationMethod}
                       onChange={(e) => handleGlobalChange('allocationMethod', e.target.value)}
                       className="input-sim py-3 text-sm appearance-none pr-8"
                     >
                       <option value="perDelivered">Por Entregas Realizadas (Padrão)</option>
                       <option value="perContracted">Por Volume Contratado</option>
                       <option value="equalShare">Divisão Igualitária entre Ativos</option>
                     </select>
                     <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                   </div>
                </div>

                <div className="space-y-3 col-span-2 bg-indigo-50/40 p-5 rounded-2xl border border-indigo-100/60 mt-2">
                    <label className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest flex items-center justify-between">
                       <span>Custo por Conteúdo (Definição Manual)</span>
                       <span className={`text-[9px] px-2 py-0.5 rounded font-bold border ${simResult.kpis.globalCostPerContent === simulation.global.manualCostPerContentOverride ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-400 border-slate-200'}`}>
                         {simResult.kpis.globalCostPerContent === simulation.global.manualCostPerContentOverride ? 'ATIVO' : 'AUTO'}
                       </span>
                    </label>
                    <div className="flex gap-4 items-center">
                       <input 
                         type="number" step="0.10"
                         disabled={mode === 'readonly'}
                         value={simulation.global.manualCostPerContentOverride}
                         onChange={(e) => handleGlobalChange('manualCostPerContentOverride', parseFloat(e.target.value))}
                         className={`input-sim py-3 text-xl font-bold text-indigo-900 font-mono w-40 ${privacyMode ? 'privacy-blur' : ''}`}
                         placeholder="0.00"
                       />
                       <span className="text-xs text-slate-500 leading-tight">
                          {simulation.global.manualCostPerContentOverride > 0 
                            ? 'Sobrescreve cálculo automático de rateio.' 
                            : <span>Auto Calculado:<br/><strong className="font-mono text-slate-700">{privacyMode ? '••••' : formatCurrency(simResult.kpis.totalUnitCostBase / (simResult.kpis.totalContracted || 1))}</strong> / un</span>}
                       </span>
                    </div>
                </div>
             </div>
         </div>
      </div>

      {/* CLIENTS SIMULATION TABLE */}
      <div className="glass-panel rounded-[32px] shadow-sm overflow-hidden border border-white/60">
         <div 
            onClick={() => toggleSection('clients')}
            className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
         >
            <div className="flex items-center gap-3">
               <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                 <Users size={20} />
               </div>
               <h3 className="font-bold text-slate-800 text-lg">Simulação de Clientes</h3>
               <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                 {simResult.clients.length} Clientes
               </span>
            </div>
            {expandedSection === 'clients' ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
         </div>

         {expandedSection === 'clients' && (
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                 <tr>
                   <th className="px-6 py-4">Cliente</th>
                   <th className="px-4 py-4 text-center">Status</th>
                   <th className="px-4 py-4 text-right">Rec. Bruta</th>
                   <th className="px-4 py-4 text-center">Contr.</th>
                   <th className="px-4 py-4 text-center">Entregue</th>
                   <th className="px-4 py-4 text-right">Lucro</th>
                   <th className="px-4 py-4 text-right">GAP</th>
                   <th className="px-4 py-4 text-center">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 bg-white/40">
                 {simResult.clients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-slate-400 font-medium">
                         Nenhum cliente registrado neste mês. Adicione um abaixo.
                      </td>
                    </tr>
                 ) : simResult.clients.map(c => {
                   const hasOverride = simulation.clients[selectedMonth]?.[c.id];
                   const isAdded = c.id.startsWith('new-');
                   return (
                     <tr key={c.id} className={`group hover:bg-white/80 transition-colors ${hasOverride ? 'bg-indigo-50/30' : ''}`}>
                       <td className="px-6 py-3 font-bold text-slate-700">
                         {c.Cliente}
                         {hasOverride && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block ml-2 mb-0.5 shadow-[0_0_4px_#6366f1]"></div>}
                         {isAdded && <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-bold border border-emerald-200">Novo</span>}
                       </td>
                       <td className="px-4 py-3 text-center">
                         <div className="relative inline-block">
                           <select
                             value={c.Status_Cliente}
                             onChange={(e) => handleClientChange(c.id, 'Status_Cliente', e.target.value)}
                             disabled={mode === 'readonly'}
                             className={`text-[10px] font-bold px-2.5 py-1 rounded-full border outline-none cursor-pointer appearance-none pr-6 transition-all ${c.Status_Cliente === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200'}`}
                           >
                              <option value="Ativo">ATIVO</option>
                              <option value="Inativo">INATIVO</option>
                           </select>
                         </div>
                       </td>
                       <td className="px-4 py-3 text-right">
                         <input 
                           type="number"
                           className={`input-bare text-right font-mono font-medium text-slate-700 w-24 ${privacyMode ? 'privacy-blur' : ''}`}
                           value={c.Receita_Mensal_BRL}
                           onChange={(e) => handleClientChange(c.id, 'Receita_Mensal_BRL', parseFloat(e.target.value))}
                           disabled={mode === 'readonly'}
                         />
                       </td>
                       <td className="px-4 py-3 text-center">
                         <input 
                           type="number"
                           className="input-bare text-center w-16 mx-auto font-medium text-slate-600"
                           value={c.Conteudos_Contratados}
                           onChange={(e) => handleClientChange(c.id, 'Conteudos_Contratados', parseFloat(e.target.value))}
                           disabled={mode === 'readonly'}
                         />
                       </td>
                       <td className="px-4 py-3 text-center">
                         <input 
                           type="number"
                           className={`input-bare text-center w-16 mx-auto font-bold ${c.Conteudos_Entregues > c.Conteudos_Contratados ? 'text-amber-600' : 'text-slate-800'}`}
                           value={c.Conteudos_Entregues}
                           onChange={(e) => handleClientChange(c.id, 'Conteudos_Entregues', parseFloat(e.target.value))}
                           disabled={mode === 'readonly'}
                         />
                       </td>
                       <td className="px-4 py-3 text-right font-mono font-bold navy-num">
                          <MaskedValue value={c.Calculated_Profit} privacyMode={privacyMode} format={formatCurrency} />
                       </td>
                       <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold font-mono ${c.Calculated_Gap < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            <MaskedValue value={c.Calculated_Gap} privacyMode={privacyMode} format={formatCurrency} />
                          </span>
                       </td>
                       <td className="px-4 py-3 text-center flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {hasOverride && mode === 'simulation' && (
                            <button 
                              onClick={() => {
                                const newOverrides = { ...simulation.clients[selectedMonth] };
                                delete newOverrides[c.id];
                                setSimulation(prev => ({
                                  ...prev,
                                  clients: { ...prev.clients, [selectedMonth]: newOverrides }
                                }));
                                logEvent('clientMonthly', 'reset', 'override', 'original', c.id);
                              }}
                              className="p-1.5 hover:bg-rose-100 text-rose-500 rounded-lg transition-colors"
                              title="Reverter alterações"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {mode === 'simulation' && (
                              <button 
                                onClick={() => handleDelete('client', c.id)}
                                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                title="Remover da simulação"
                              >
                                <Trash2 size={14} />
                              </button>
                          )}
                       </td>
                     </tr>
                   )
                 })}
               </tbody>
             </table>
             {mode === 'simulation' && (
               <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                  <button 
                    onClick={() => setIsAddClientModalOpen(true)}
                    className="text-xs font-bold text-indigo-600 flex items-center justify-center gap-1.5 hover:bg-indigo-50 py-2.5 px-4 rounded-xl transition-colors mx-auto border border-indigo-100"
                  >
                     <Plus size={14} /> Adicionar Novo Cliente
                  </button>
               </div>
             )}
           </div>
         )}
      </div>

      {/* COSTS SIMULATION TABLE */}
      <div className="glass-panel rounded-[32px] shadow-sm overflow-hidden border border-white/60">
         <div 
            onClick={() => toggleSection('costs')}
            className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
         >
            <div className="flex items-center gap-3">
               <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                 <DollarSign size={20} />
               </div>
               <h3 className="font-bold text-slate-800 text-lg">Simulação de Custos</h3>
               <span className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2.5 py-0.5 rounded-full font-bold shadow-sm">
                 {simResult.costs.length} Itens
               </span>
            </div>
            {expandedSection === 'costs' ? <ChevronDown size={20} className="text-slate-400" /> : <ChevronRight size={20} className="text-slate-400" />}
         </div>

         {expandedSection === 'costs' && (
           <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 overflow-x-auto border-r border-slate-200/60">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/80 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4">Custo</th>
                      <th className="px-4 py-4 text-center">Tipo</th>
                      <th className="px-4 py-4 text-right">Valor (Sim)</th>
                      <th className="px-4 py-4 text-center">Ativo</th>
                      <th className="px-4 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white/40">
                    {simResult.costs.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-4 py-12 text-center text-slate-400 font-medium">
                            Nenhum custo registrado neste mês. Adicione um abaixo.
                         </td>
                       </tr>
                    ) : simResult.costs.map(c => {
                       const hasOverride = simulation.costs[selectedMonth]?.[c.id];
                       const isAdded = c.id.startsWith('new-');
                       return (
                        <tr key={c.id} className="hover:bg-white/80 transition-colors group">
                          <td className="px-6 py-3 font-medium text-slate-700">
                            {c.Tipo_Custo}
                            {isAdded && <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase font-bold border border-emerald-200">Novo</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                             <div className="relative inline-block">
                               <select
                                 value={c.Tipo_Custo.includes('Estorno') ? 'Extra' : (c.Tipo_Custo === 'Imposto' ? 'Imposto' : 'Fixo')}
                                 onChange={(e) => handleCostChange(c.id, 'Tipo_Custo', e.target.value)}
                                 disabled={mode === 'readonly'}
                                 className="text-[10px] uppercase font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg appearance-none outline-none cursor-pointer hover:border-indigo-300 pr-5"
                               >
                                  <option value="Fixo">Fixo</option>
                                  <option value="Extra">Extra</option>
                                  <option value="Imposto">Imposto</option>
                               </select>
                             </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                             <input 
                               type="number"
                               className={`input-bare text-right font-mono w-28 ${privacyMode ? 'privacy-blur' : ''}`}
                               value={c.Valor_Mensal_BRL}
                               onChange={(e) => handleCostChange(c.id, 'Valor_Mensal_BRL', parseFloat(e.target.value))}
                               disabled={mode === 'readonly'}
                             />
                          </td>
                          <td className="px-4 py-3 text-center">
                             <input 
                               type="checkbox"
                               checked={c.Ativo_no_Mes}
                               onChange={(e) => handleCostChange(c.id, 'Ativo_no_Mes', e.target.checked)}
                               disabled={mode === 'readonly'}
                               className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 cursor-pointer"
                             />
                          </td>
                          <td className="px-4 py-3 text-center flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {hasOverride && mode === 'simulation' && (
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mx-auto shadow-[0_0_4px_#6366f1]"></div>
                            )}
                            {mode === 'simulation' && (
                                <button 
                                  onClick={() => handleDelete('cost', c.id)}
                                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="Remover Custo"
                                >
                                  <Trash2 size={14} />
                                </button>
                            )}
                          </td>
                        </tr>
                       )
                    })}
                  </tbody>
                </table>
                {mode === 'simulation' && (
                  <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                    <button 
                      onClick={() => setIsAddCostModalOpen(true)}
                      className="text-xs font-bold text-indigo-600 flex items-center justify-center gap-1.5 hover:bg-indigo-50 py-2.5 px-4 rounded-xl transition-colors mx-auto border border-indigo-100"
                    >
                       <Plus size={14} /> Adicionar Novo Custo
                    </button>
                  </div>
                )}
              </div>
              
              {/* Cost Summary Sidebar */}
              <div className="p-8 bg-slate-50/30">
                 <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6">Resumo de Custos</h4>
                 <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                       <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Total Operacional</span>
                       <div className="text-xl font-bold navy-num">
                          <MaskedValue value={simResult.kpis.totalOperationalCost} privacyMode={privacyMode} format={formatCurrency} />
                       </div>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                       <span className="text-[10px] text-slate-400 font-bold uppercase block mb-1">Não Operacional</span>
                       <div className="text-xl font-bold text-slate-500">
                          <MaskedValue value={simResult.kpis.totalCost - simResult.kpis.totalOperationalCost} privacyMode={privacyMode} format={formatCurrency} />
                       </div>
                    </div>
                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                       <span className="text-[10px] text-indigo-400 font-bold uppercase block mb-1">Custo / Conteúdo (Global)</span>
                       <div className="text-2xl font-black text-indigo-900 font-mono">
                          <MaskedValue value={simResult.kpis.globalCostPerContent} privacyMode={privacyMode} format={formatCurrency} />
                       </div>
                       <div className="text-[10px] text-indigo-400 mt-2 font-medium">
                          Base: <MaskedValue value={simResult.kpis.totalUnitCostBase} privacyMode={privacyMode} format={formatCurrency} />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
         )}
      </div>

      {/* MODALS */}
      {isAddClientModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-white/60">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Adicionar Cliente Simulado</h3>
                  <div className="space-y-5">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Nome do Cliente</label>
                          <input type="text" className="input-sim py-3" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Receita Mensal (R$)</label>
                          <input type="number" className="input-sim py-3" value={newItemValue} onChange={e => setNewItemValue(parseFloat(e.target.value))} />
                      </div>
                      <div className="pt-2 space-y-3">
                        <button onClick={handleAddClient} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all">Adicionar</button>
                        <button onClick={() => setIsAddClientModalOpen(false)} className="w-full text-slate-500 py-3 text-sm hover:bg-slate-50 rounded-xl transition-colors font-bold">Cancelar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isAddCostModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-white/60">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">Adicionar Custo Simulado</h3>
                  <div className="space-y-5">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Descrição do Custo</label>
                          <input type="text" className="input-sim py-3" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">Valor Mensal (R$)</label>
                          <input type="number" className="input-sim py-3" value={newItemValue} onChange={e => setNewItemValue(parseFloat(e.target.value))} />
                      </div>
                      <div className="pt-2 space-y-3">
                        <button onClick={handleAddCost} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition-all">Adicionar</button>
                        <button onClick={() => setIsAddCostModalOpen(false)} className="w-full text-slate-500 py-3 text-sm hover:bg-slate-50 rounded-xl transition-colors font-bold">Cancelar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* APPLY MODAL */}
      {applyStep > 0 && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-md animate-fade-in">
            <div className="bg-white rounded-[32px] shadow-2xl p-10 max-w-md w-full border border-white/60 relative">
               <button onClick={() => setApplyStep(0)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"><X size={20}/></button>
               
               <h3 className="text-2xl font-bold text-slate-800 mb-6">Confirmar Alterações</h3>
               
               {applyStep === 1 && (
                 <div className="space-y-6">
                    <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl flex items-start gap-4">
                       <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0"><AlertTriangle size={20} /></div>
                       <div className="text-sm text-amber-900 leading-relaxed">
                          Você está prestes a aplicar <strong>{events.length} alterações</strong> ao banco de dados real. Esta ação é irreversível via interface e afetará os relatórios.
                       </div>
                    </div>
                    
                    <div className="max-h-48 overflow-y-auto bg-slate-50 p-4 rounded-xl text-xs space-y-3 border border-slate-200 custom-scrollbar">
                       {events.map(e => (
                         <div key={e.id} className="flex justify-between border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                            <span className="font-bold text-slate-600">{e.targetId || 'Global'}: <span className="font-normal text-slate-500">{e.field}</span></span>
                            <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">{String(e.oldValue).slice(0,10)} &rarr; {String(e.newValue).slice(0,10)}</span>
                         </div>
                       ))}
                    </div>

                    <button 
                      onClick={() => setApplyStep(2)}
                      className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
                    >
                      Continuar e Revisar
                    </button>
                 </div>
               )}

               {applyStep === 2 && (
                 <div className="space-y-6">
                    <p className="text-slate-600 text-center font-medium">
                       Para confirmar segurança, digite <span className="font-black text-slate-800">APLICAR</span> abaixo.
                    </p>
                    <input 
                      type="text" 
                      className="w-full border-2 border-slate-200 rounded-2xl p-4 font-black text-xl text-center uppercase focus:ring-4 focus:ring-rose-100 focus:border-rose-500 outline-none transition-all tracking-widest text-slate-800 placeholder:text-slate-300"
                      placeholder="APLICAR"
                      value={applyInput}
                      onChange={(e) => setApplyInput(e.target.value)}
                      autoFocus
                    />
                    <button 
                      disabled={applyInput !== 'APLICAR'}
                      className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                      onClick={executeApply}
                    >
                      CONFIRMAR APLICAÇÃO
                    </button>
                 </div>
               )}
            </div>
         </div>
      )}

    </div>
  );
};