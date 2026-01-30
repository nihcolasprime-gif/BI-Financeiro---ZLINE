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
  <span className={`text-[#06283D] ${className}`} style={{ color: 'var(--zline-number-color, #06283D)' }}>{children}</span>
);

interface ConfigurationsPanelProps {
  allClients: ClientData[];
  allCosts: CostData[];
  months: string[]; // Still accepted but we will use generated ones for flexibility
  currentMonth: string;
  onApplyChanges?: (clients: ClientData[], costs: CostData[]) => void;
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
  maxProductionCapacity: 140, // CORRECTED TO 140 (7 Clients * ~20 contents)
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
  onApplyChanges
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
    
    // Find original value for diff
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
      // 1. Construct Final Lists to send back to App
      
      // Merge Clients
      const finalClients = [...allClients, ...simulation.addedClients].filter(c => !simulation.deletedClientIds.includes(c.id));
      // Apply field overrides permanently
      const appliedClients = finalClients.map(c => {
          // If there's an override for ANY month, apply it. 
          // Note: In a real DB, we'd update specific rows. Here we simplify by updating the object in memory.
          // Since our simulation state is structured by Month -> ID, we need to apply the override if the client belongs to that month.
          const override = simulation.clients[c.Mes_Referencia]?.[c.id];
          if (override) {
             // Recalculate derivative fields if needed (like Net Revenue)
             const netRev = (override.Receita_Mensal_BRL !== undefined ? override.Receita_Mensal_BRL : c.Receita_Mensal_BRL) * (1 - simulation.global.taxRate);
             return { ...c, ...override, Receita_Liquida_Apos_Imposto_BRL: netRev };
          }
          return c;
      });

      // Merge Costs
      const finalCosts = [...allCosts, ...simulation.addedCosts].filter(c => !simulation.deletedCostIds.includes(c.id));
      const appliedCosts = finalCosts.map(c => {
          const override = simulation.costs[c.Mes_Referencia]?.[c.id];
          return override ? { ...c, ...override } : c;
      });

      if (onApplyChanges) {
          onApplyChanges(appliedClients, appliedCosts);
      }

      // Reset Simulation
      setSimulation({ 
          clients: {}, costs: {}, 
          addedClients: [], addedCosts: [], 
          deletedClientIds: [], deletedCostIds: [], 
          global: { ...DEFAULT_SETTINGS, maxProductionCapacity: simulation.global.maxProductionCapacity } // Keep capacity setting
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

  // --- SUB-COMPONENTS ---
  
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
      <div className={`text-[10px] font-bold flex items-center gap-1 ${colorClass} bg-white/50 px-1 rounded`}>
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
        :root { --zline-number-color: #06283D; }
        .navy-num { color: var(--zline-number-color); font-family: monospace; font-weight: 700; }
        .input-sim { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 2px 6px; font-weight: 600; color: #06283D; width: 100%; transition: all 0.2s; }
        .input-sim:focus { outline: 2px solid #6366f1; border-color: #6366f1; background: #fff; }
        .input-sim:disabled { opacity: 0.6; cursor: not-allowed; background: #f1f5f9; }
        .input-sim-sm { padding: 1px 4px; font-size: 0.75rem; }
      `}</style>

      {/* HEADER */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
         <div>
            <div className="flex items-center gap-3 mb-2">
               <div className="p-2 bg-indigo-100 rounded-lg text-indigo-700">
                  <Settings size={20} />
               </div>
               <h2 className="text-2xl font-bold text-slate-800">Configurações & Auditoria</h2>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
               <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                 <Shield size={12} /> Snapshot: <span className="font-mono text-slate-700">{snapshotId}</span>
               </span>
               <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                 <History size={12} /> Eventos: <span className="font-bold text-slate-700">{events.length}</span>
               </span>
            </div>
         </div>

         <div className="flex items-center gap-3">
             <div className="bg-slate-100 p-1 rounded-xl flex items-center">
                <button 
                  onClick={() => setMode('simulation')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'simulation' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Simulação
                </button>
                <button 
                  onClick={() => setMode('readonly')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'readonly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Leitura
                </button>
             </div>
             
             {mode === 'simulation' && (
               <button 
                 onClick={resetSimulation}
                 className="p-3 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-colors"
                 title="Resetar Simulação"
               >
                 <RotateCcw size={18} />
               </button>
             )}

             <button 
               onClick={downloadAudit}
               className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
             >
               <Download size={18} /> JSON
             </button>

             <button 
               onClick={() => setApplyStep(1)}
               disabled={events.length === 0}
               className={`
                 flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all
                 ${events.length > 0 ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
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
             <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">{kpi.label}</div>
                <div className="text-xl font-bold navy-num flex flex-col items-start">
                   {kpi.type === 'percent' ? formatPercent(kpi.sim) : formatCurrency(kpi.sim)}
                   <DiffBadge real={kpi.real} sim={kpi.sim} type={kpi.type || 'currency'} />
                </div>
             </div>
           ))}
        </div>
      )}

      {/* CAPACITY & GLOBAL PARAMS */}
      <div className="glass-panel p-6 rounded-3xl shadow-sm">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
             
             {/* LEFT: PERIOD & CAPACITY */}
             <div className="lg:col-span-1 space-y-6">
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Simular Período</label>
                    <div className="flex gap-2">
                       <div className="relative flex-1">
                          <select 
                            value={selMonthName} 
                            onChange={(e) => handleDateChange(e.target.value, selYear)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-bold text-lg rounded-xl py-3 pl-4 pr-8 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {SIM_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                       </div>
                       <div className="relative w-28">
                          <select 
                            value={selYear} 
                            onChange={(e) => handleDateChange(selMonthName, e.target.value)}
                            className="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-700 font-bold text-lg rounded-xl py-3 pl-4 pr-8 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            {SIM_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                       </div>
                    </div>
                 </div>

                 {/* CAPACITY VISUAL */}
                 <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                           <Battery size={14} /> Ocupação
                        </span>
                        <span className="text-lg font-black navy-text">{formatPercent(simResult.kpis.capacityUtilization)}</span>
                    </div>
                    <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden mb-2">
                       <div 
                         className={`h-full rounded-full transition-all duration-500 ${simResult.kpis.capacityUtilization > 0.9 ? 'bg-rose-500' : simResult.kpis.capacityUtilization > 0.7 ? 'bg-amber-400' : 'bg-emerald-500'}`} 
                         style={{ width: `${Math.min(simResult.kpis.capacityUtilization * 100, 100)}%` }}
                       ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                        <span>Contratado: {simResult.kpis.totalContracted} un</span>
                        <span>Máx: {simResult.kpis.maxCapacity} un</span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-200">
                       <label className="text-[10px] font-bold text-indigo-500 uppercase mb-1 block">Definir Capacidade Máxima</label>
                       <input 
                         type="number"
                         value={simulation.global.maxProductionCapacity}
                         onChange={(e) => handleGlobalChange('maxProductionCapacity', parseFloat(e.target.value))}
                         disabled={mode === 'readonly'}
                         className="input-sim py-1.5"
                       />
                       <p className="text-[10px] text-slate-400 mt-1">
                          Espaço para aprox. <strong>{simResult.kpis.potentialClientsSpace.toFixed(1)}</strong> novos clientes médios.
                       </p>
                    </div>
                 </div>
             </div>

             {/* RIGHT: GLOBAL SETTINGS GRID */}
             <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Taxa Imposto</label>
                  <input 
                    type="number" step="0.01"
                    disabled={mode === 'readonly'}
                    value={simulation.global.taxRate}
                    onChange={(e) => handleGlobalChange('taxRate', parseFloat(e.target.value))}
                    className="input-sim py-2 text-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Meta Margem</label>
                  <input 
                    type="number" step="0.01"
                    disabled={mode === 'readonly'}
                    value={simulation.global.targetMargin}
                    onChange={(e) => handleGlobalChange('targetMargin', parseFloat(e.target.value))}
                    className="input-sim py-2 text-lg"
                  />
                </div>
                
                <div className="space-y-1 col-span-2">
                   <label className="text-[10px] font-bold text-slate-400 uppercase">Método Alocação de Custos</label>
                   <select 
                     disabled={mode === 'readonly'}
                     value={simulation.global.allocationMethod}
                     onChange={(e) => handleGlobalChange('allocationMethod', e.target.value)}
                     className="input-sim py-2 text-sm h-[42px]"
                   >
                     <option value="perDelivered">Por Entregas Realizadas (Padrão)</option>
                     <option value="perContracted">Por Volume Contratado</option>
                     <option value="equalShare">Divisão Igualitária entre Ativos</option>
                   </select>
                </div>

                <div className="space-y-1 col-span-2 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                    <label className="text-[10px] font-bold text-indigo-500 uppercase flex items-center justify-between">
                       <span>Custo por Conteúdo (Definição Manual)</span>
                       <span className="text-[9px] bg-white px-2 rounded border border-indigo-100">{simResult.kpis.globalCostPerContent === simulation.global.manualCostPerContentOverride ? 'ATIVO' : 'AUTO'}</span>
                    </label>
                    <div className="flex gap-2 items-center">
                       <input 
                         type="number" step="0.10"
                         disabled={mode === 'readonly'}
                         value={simulation.global.manualCostPerContentOverride}
                         onChange={(e) => handleGlobalChange('manualCostPerContentOverride', parseFloat(e.target.value))}
                         className="input-sim py-2 text-lg font-bold text-indigo-800"
                         placeholder="0.00 = Auto"
                       />
                       <span className="text-xs text-slate-500 whitespace-nowrap">
                          {simulation.global.manualCostPerContentOverride > 0 ? 'Sobrescreve cálculo automático' : `Auto: ${formatCurrency(simResult.kpis.totalUnitCostBase / (simResult.kpis.totalContracted || 1))}`}
                       </span>
                    </div>
                </div>
             </div>
         </div>
      </div>

      {/* CLIENTS SIMULATION */}
      <div className="glass-panel rounded-3xl shadow-sm overflow-hidden border border-white/60">
         <div 
            onClick={() => toggleSection('clients')}
            className="p-5 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
         >
            <div className="flex items-center gap-2">
               <Users size={18} className="text-indigo-600" />
               <h3 className="font-bold text-slate-800">Simulação de Clientes</h3>
               <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                 {simResult.clients.length}
               </span>
            </div>
            {expandedSection === 'clients' ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
         </div>

         {expandedSection === 'clients' && (
           <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                 <tr>
                   <th className="px-4 py-3">Cliente</th>
                   <th className="px-4 py-3 text-center">Status</th>
                   <th className="px-4 py-3 text-right">Rec. Bruta</th>
                   <th className="px-4 py-3 text-center">Contr.</th>
                   <th className="px-4 py-3 text-center">Entregue</th>
                   <th className="px-4 py-3 text-right">Lucro</th>
                   <th className="px-4 py-3 text-right">GAP</th>
                   <th className="px-4 py-3 text-center">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {simResult.clients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                         Nenhum cliente registrado neste mês. Adicione um abaixo.
                      </td>
                    </tr>
                 ) : simResult.clients.map(c => {
                   const hasOverride = simulation.clients[selectedMonth]?.[c.id];
                   const isAdded = c.id.startsWith('new-');
                   return (
                     <tr key={c.id} className={`group hover:bg-slate-50 transition-colors ${hasOverride ? 'bg-indigo-50/30' : ''}`}>
                       <td className="px-4 py-2 font-bold text-slate-700">
                         {c.Cliente}
                         {hasOverride && <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full inline-block ml-2 mb-0.5"></div>}
                         {isAdded && <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded uppercase">Novo</span>}
                       </td>
                       <td className="px-4 py-2 text-center">
                         <select
                           value={c.Status_Cliente}
                           onChange={(e) => handleClientChange(c.id, 'Status_Cliente', e.target.value)}
                           disabled={mode === 'readonly'}
                           className={`text-[10px] font-bold px-2 py-0.5 rounded border outline-none cursor-pointer appearance-none ${c.Status_Cliente === 'Ativo' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-500'}`}
                         >
                            <option value="Ativo">ATIVO</option>
                            <option value="Inativo">INATIVO</option>
                         </select>
                       </td>
                       <td className="px-4 py-2 text-right">
                         <input 
                           type="number"
                           className="input-sim text-right"
                           value={c.Receita_Mensal_BRL}
                           onChange={(e) => handleClientChange(c.id, 'Receita_Mensal_BRL', parseFloat(e.target.value))}
                           disabled={mode === 'readonly'}
                         />
                       </td>
                       <td className="px-4 py-2 text-center">
                         <input 
                           type="number"
                           className="input-sim text-center w-16 mx-auto"
                           value={c.Conteudos_Contratados}
                           onChange={(e) => handleClientChange(c.id, 'Conteudos_Contratados', parseFloat(e.target.value))}
                           disabled={mode === 'readonly'}
                         />
                       </td>
                       <td className="px-4 py-2 text-center">
                         <input 
                           type="number"
                           className={`input-sim text-center w-16 mx-auto ${c.Conteudos_Entregues > c.Conteudos_Contratados ? 'text-amber-600 border-amber-200 bg-amber-50' : ''}`}
                           value={c.Conteudos_Entregues}
                           onChange={(e) => handleClientChange(c.id, 'Conteudos_Entregues', parseFloat(e.target.value))}
                           disabled={mode === 'readonly'}
                         />
                       </td>
                       <td className="px-4 py-2 text-right font-mono font-bold navy-num">
                          {formatCurrency(c.Calculated_Profit)}
                       </td>
                       <td className="px-4 py-2 text-right">
                          <span className={`text-xs font-bold ${c.Calculated_Gap < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                            {formatCurrency(c.Calculated_Gap)}
                          </span>
                       </td>
                       <td className="px-4 py-2 text-center flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                              className="p-1.5 hover:bg-rose-100 text-rose-500 rounded"
                              title="Reverter alterações"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                          {mode === 'simulation' && (
                              <button 
                                onClick={() => handleDelete('client', c.id)}
                                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded"
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
               <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                  <button 
                    onClick={() => setIsAddClientModalOpen(true)}
                    className="text-xs font-bold text-indigo-600 flex items-center justify-center gap-1 hover:underline py-2 w-full"
                  >
                     <Plus size={14} /> Adicionar Novo Cliente
                  </button>
               </div>
             )}
           </div>
         )}
      </div>

      {/* COSTS SIMULATION */}
      <div className="glass-panel rounded-3xl shadow-sm overflow-hidden border border-white/60">
         <div 
            onClick={() => toggleSection('costs')}
            className="p-5 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors"
         >
            <div className="flex items-center gap-2">
               <DollarSign size={18} className="text-indigo-600" />
               <h3 className="font-bold text-slate-800">Simulação de Custos</h3>
               <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                 {simResult.costs.length}
               </span>
            </div>
            {expandedSection === 'costs' ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
         </div>

         {expandedSection === 'costs' && (
           <div className="grid grid-cols-1 lg:grid-cols-3">
              <div className="lg:col-span-2 overflow-x-auto border-r border-slate-100">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Custo</th>
                      <th className="px-4 py-3 text-center">Tipo</th>
                      <th className="px-4 py-3 text-right">Valor (Sim)</th>
                      <th className="px-4 py-3 text-center">Ativo</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {simResult.costs.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                            Nenhum custo registrado neste mês. Adicione um abaixo.
                         </td>
                       </tr>
                    ) : simResult.costs.map(c => {
                       const hasOverride = simulation.costs[selectedMonth]?.[c.id];
                       const isAdded = c.id.startsWith('new-');
                       return (
                        <tr key={c.id} className="hover:bg-slate-50 group">
                          <td className="px-4 py-2 font-medium text-slate-700">
                            {c.Tipo_Custo}
                            {isAdded && <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded uppercase">Novo</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                             <select
                               value={c.Tipo_Custo.includes('Estorno') ? 'Extra' : (c.Tipo_Custo === 'Imposto' ? 'Imposto' : 'Fixo')}
                               onChange={(e) => handleCostChange(c.id, 'Tipo_Custo', e.target.value)}
                               disabled={mode === 'readonly'}
                               className="text-[10px] uppercase text-slate-700 bg-white border border-slate-200 px-1.5 py-0.5 rounded appearance-none outline-none cursor-pointer hover:border-indigo-300"
                             >
                                <option value="Fixo">Fixo</option>
                                <option value="Extra">Extra</option>
                                <option value="Imposto">Imposto</option>
                             </select>
                          </td>
                          <td className="px-4 py-2 text-right">
                             <input 
                               type="number"
                               className="input-sim text-right"
                               value={c.Valor_Mensal_BRL}
                               onChange={(e) => handleCostChange(c.id, 'Valor_Mensal_BRL', parseFloat(e.target.value))}
                               disabled={mode === 'readonly'}
                             />
                          </td>
                          <td className="px-4 py-2 text-center">
                             <input 
                               type="checkbox"
                               checked={c.Ativo_no_Mes}
                               onChange={(e) => handleCostChange(c.id, 'Ativo_no_Mes', e.target.checked)}
                               disabled={mode === 'readonly'}
                               className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                             />
                          </td>
                          <td className="px-4 py-2 text-center flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {hasOverride && mode === 'simulation' && (
                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full mx-auto"></div>
                            )}
                            {mode === 'simulation' && (
                                <button 
                                  onClick={() => handleDelete('cost', c.id)}
                                  className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-rose-600 rounded"
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
                  <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                    <button 
                      onClick={() => setIsAddCostModalOpen(true)}
                      className="text-xs font-bold text-indigo-600 flex items-center justify-center gap-1 hover:underline py-2 w-full"
                    >
                       <Plus size={14} /> Adicionar Novo Custo
                    </button>
                  </div>
                )}
              </div>
              
              {/* Cost Summary Sidebar */}
              <div className="p-6 bg-slate-50/50">
                 <h4 className="text-xs font-bold text-slate-400 uppercase mb-4">Métricas de Custo</h4>
                 <div className="space-y-4">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                       <span className="text-[10px] text-slate-400 uppercase block mb-1">Total Operacional</span>
                       <div className="text-lg font-bold navy-num">{formatCurrency(simResult.kpis.totalOperationalCost)}</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                       <span className="text-[10px] text-slate-400 uppercase block mb-1">Não Operacional</span>
                       <div className="text-lg font-bold text-slate-500">{formatCurrency(simResult.kpis.totalCost - simResult.kpis.totalOperationalCost)}</div>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 shadow-sm">
                       <span className="text-[10px] text-indigo-400 uppercase block mb-1">Custo / Conteúdo (Global)</span>
                       <div className="text-xl font-black text-indigo-900">{formatCurrency(simResult.kpis.globalCostPerContent)}</div>
                       <div className="text-[10px] text-indigo-400 mt-1">Base: {formatCurrency(simResult.kpis.totalUnitCostBase)}</div>
                    </div>
                 </div>
              </div>
           </div>
         )}
      </div>

      {/* MODALS */}
      {isAddClientModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Cliente Simulado</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Nome do Cliente</label>
                          <input type="text" className="input-sim py-2" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Receita Mensal (R$)</label>
                          <input type="number" className="input-sim py-2" value={newItemValue} onChange={e => setNewItemValue(parseFloat(e.target.value))} />
                      </div>
                      <button onClick={handleAddClient} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700">Adicionar</button>
                      <button onClick={() => setIsAddClientModalOpen(false)} className="w-full text-slate-500 py-2 text-sm">Cancelar</button>
                  </div>
              </div>
          </div>
      )}

      {isAddCostModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Adicionar Custo Simulado</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Descrição do Custo</label>
                          <input type="text" className="input-sim py-2" value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase">Valor Mensal (R$)</label>
                          <input type="number" className="input-sim py-2" value={newItemValue} onChange={e => setNewItemValue(parseFloat(e.target.value))} />
                      </div>
                      <button onClick={handleAddCost} className="w-full bg-indigo-600 text-white font-bold py-2 rounded-lg hover:bg-indigo-700">Adicionar</button>
                      <button onClick={() => setIsAddCostModalOpen(false)} className="w-full text-slate-500 py-2 text-sm">Cancelar</button>
                  </div>
              </div>
          </div>
      )}

      {/* APPLY MODAL (Overlay) */}
      {applyStep > 0 && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-white/50">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Confirmar Alterações</h3>
                  <button onClick={() => setApplyStep(0)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
               </div>
               
               {applyStep === 1 && (
                 <div className="space-y-4">
                    <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-start gap-3">
                       <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                       <div className="text-sm text-amber-800">
                          Você está prestes a aplicar <strong>{events.length} alterações</strong> ao banco de dados real. Esta ação afetará os relatórios de todos os usuários.
                       </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-slate-50 p-3 rounded-lg text-xs space-y-2 border border-slate-100">
                       {events.map(e => (
                         <div key={e.id} className="flex justify-between border-b border-slate-200 pb-1">
                            <span>{e.targetId || 'Global'}: {e.field}</span>
                            <span className="font-mono">{String(e.oldValue)} &rarr; {String(e.newValue)}</span>
                         </div>
                       ))}
                    </div>
                    <button 
                      onClick={() => setApplyStep(2)}
                      className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors"
                    >
                      Continuar
                    </button>
                 </div>
               )}

               {applyStep === 2 && (
                 <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                       Para confirmar, digite <strong>APLICAR</strong> no campo abaixo.
                    </p>
                    <input 
                      type="text" 
                      className="w-full border border-slate-300 rounded-lg p-2 font-bold text-center uppercase focus:ring-2 focus:ring-rose-500 outline-none"
                      placeholder="APLICAR"
                      value={applyInput}
                      onChange={(e) => setApplyInput(e.target.value)}
                    />
                    <button 
                      disabled={applyInput !== 'APLICAR'}
                      className="w-full py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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