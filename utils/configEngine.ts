/**
 * configEngine.ts
 *
 * Módulo TypeScript único e auto-contido que você pode colar no repositório do dashboard
 * (ex: /src/lib/configEngine.ts) e integrar com as rotas/api do seu backend (Vercel).
 *
 * Objetivo: permitir edição real (add/update/delete) de clientes, custos, meses e regras,
 * com histórico auditável (events), snapshot/export JSON e "linkagem" clara entre
 * menus de configuração e os calculos do dashboard (KPIs).
 *
 * INSTRUÇÕES RÁPIDAS:
 * 1. Adicione esse arquivo ao repo (src/lib/configEngine.ts).
 * 2. Importe as funções no frontend (React) para popular as views e nos handlers de edição.
 * 3. Implemente endpoints REST simples (POST /api/saveSnapshot, GET /api/loadSnapshot, POST /api/importCsv)
 *    que chamem as funções de persistência aqui ou façam persistência em DB (recommended).
 * 4. Ao deployar no Vercel, assegure que o frontend use os getters abaixo (getKPIsForMonth, getClientDetailForMonth)
 *    para renderizar TODOS os gráficos/valores do dashboard.
 *
 * NÃO remove ou sobrescreve dados reais sem que você decida — por padrão este engine grava via persistSnapshot()
 * que você deve mapear para sua API (ex: persiste no firestore, supabase, sheets ou JSON file no S3).
 *
 * ---------------------------------------
 * AVISO: Este documento fornece lógica e contratos (schema). Ajuste conforme arquitetura do seu projeto.
 * ---------------------------------------
 */

/* ============================
   TYPES / SCHEMA (TypeScript)
   ============================ */

type ISODate = string;

type MonthKey = string; // ex: "2026-01" (YYYY-MM)

export type UserInfo = {
  id: string;
  name: string;
};

export type ClientMonthly = {
  clientId: string;
  month: MonthKey;
  grossRevenue: number; // receita bruta no mês
  delivered: number; // entregues no mês
  contracted: number; // contratado total (padrão - referência)
  status: "active" | "inactive" | "prospect";
  notes?: string;
};

export type Client = {
  id: string;
  name: string;
  tags?: string[]; // ex: "priority", "trial"
  defaultContracted?: number; // valor padrão se não informado por mês
  createdAt: ISODate;
  archived?: boolean;
};

export type CostMonthly = {
  costId: string;
  month: MonthKey;
  value: number;
  type: "fixed" | "variable" | "extra";
  category: "operational" | "admin" | "other";
  recurring?: boolean;
  note?: string;
  active?: boolean;
};

export type Cost = {
  id: string;
  name: string;
  type: CostMonthly["type"];
  category: CostMonthly["category"];
  defaultValue: number;
  recurring: boolean;
  createdAt: ISODate;
};

export type Estorno = {
  id: string;
  month: MonthKey;
  amount: number;
  reason: string;
  linkedCostId?: string | null;
  createdAt: ISODate;
};

export type SystemSettings = {
  taxRate: number; // 0..1
  targetMargin: number; // 0..1
  allocationMethod: "byDeliveries" | "byContracted" | "byHours" | "manual";
  manualAllocationWeights?: Record<string, number>; // clientId -> weight
  inflationFactor?: number;
  seasonalityMultiplier?: number;
  toleranceErrorPct?: number; // ex 0.01 = 1%
  uiNumberColor?: string; // hex (#0b2545)
  monthsAvailable: MonthKey[]; // garante meses mesmo vazios
};

export type SimulationEvent = {
  id: string;
  ts: ISODate;
  userId: string;
  action: "add" | "update" | "delete";
  targetType: "client" | "clientMonthly" | "cost" | "costMonthly" | "estorno" | "setting" | "formula";
  targetId?: string;
  month?: MonthKey;
  field?: string;
  oldValue?: any;
  newValue?: any;
  note?: string;
};

export type Formulas = {
  // strings saved for audit and editable in UI
  netRevenueFormula: string; // ex: "grossRevenue * (1 - taxRate)"
  totalOperationalCostFormula: string; // ex: "sum(costs where category='operational' && active)"
  costPerContentFormula: string; // ex: "totalOperationalCost / totalDelivered"
  idealPriceUnitFormula: string; // ex: "costPerContent / (1 - targetMargin)"
  roiFormula: string; // ex: "netProfit / totalOperationalCost"
  lerFormula: string; // ex: "netRevenue / totalLaborCost"
};

export type SimulationSnapshot = {
  id: string;
  createdAt: ISODate;
  createdBy: UserInfo;
  description?: string;
  settings: SystemSettings;
  clients: Client[]; // metadata
  clientMonthly: ClientMonthly[];
  costs: Cost[]; // metadata
  costMonthly: CostMonthly[];
  estornos: Estorno[];
  formulas: Formulas;
  events: SimulationEvent[];
};

/* ============================
   UTIL / HELPERS
   ============================ */

const uid = (prefix = "") => `${prefix}${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

const nowISO = () => new Date().toISOString();

/* ============================
   DEFAULTS
   ============================ */

export const defaultFormulas: Formulas = {
  netRevenueFormula: "grossRevenue * (1 - settings.taxRate)",
  totalOperationalCostFormula: "sum(costs.filter(c => c.category==='operational' && c.active).map(c => c.value))",
  costPerContentFormula: "totalOperationalCost / Math.max(1, totalDelivered)",
  idealPriceUnitFormula: "costPerContent / (1 - settings.targetMargin)",
  roiFormula: "(netRevenue - totalOperationalCost) / Math.max(1, totalOperationalCost)",
  lerFormula: "netRevenue / Math.max(1, totalLaborCost)",
};

export const defaultSettings = (): SystemSettings => ({
  taxRate: 0.10,
  targetMargin: 0.20,
  allocationMethod: "byDeliveries",
  manualAllocationWeights: {},
  inflationFactor: 1.0,
  seasonalityMultiplier: 1.0,
  toleranceErrorPct: 0.05,
  uiNumberColor: "#0b2545",
  monthsAvailable: ["2025-12", "2026-01", "2026-02"],
});

/* ============================
   IN-MEMORY STORE (pluggable persistence)
   ============================ */

/**
 * IMPORTANT:
 * - Esse store é apenas fallback em memória / localStorage.
 * - Implemente persistSnapshot e loadSnapshot para conectar ao seu backend.
 */

let currentSnapshot: SimulationSnapshot | null = null;

const LOCALSTORAGE_KEY = "zline_simulation_snapshot_v1";

export const loadFromLocalStorage = (): SimulationSnapshot | null => {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SimulationSnapshot;
    currentSnapshot = parsed;
    return parsed;
  } catch (e) {
    console.error("loadFromLocalStorage error", e);
    return null;
  }
};

export const saveToLocalStorage = (snap: SimulationSnapshot) => {
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(snap));
  currentSnapshot = snap;
};

/* ============================
   CORE: create / snapshot / load / persist
   ============================ */

export const createInitialSnapshot = (createdBy: UserInfo, opts?: Partial<{ months: MonthKey[] }>): SimulationSnapshot => {
  const snap: SimulationSnapshot = {
    id: uid("snap-"),
    createdAt: nowISO(),
    createdBy,
    description: "Initial snapshot",
    settings: defaultSettings(),
    clients: [],
    clientMonthly: [],
    costs: [],
    costMonthly: [],
    estornos: [],
    formulas: defaultFormulas,
    events: [],
  };
  if (opts?.months) snap.settings.monthsAvailable = opts.months;
  saveToLocalStorage(snap);
  return snap;
};

export const loadSnapshot = async (id?: string): Promise<SimulationSnapshot | null> => {
  // Hook point: implement server API call to load snapshot by id
  // Example:
  // const res = await fetch(`/api/snapshots/${id}`)...
  // For now, fallback to localStorage
  const local = loadFromLocalStorage();
  return local;
};

export const persistSnapshot = async (snap: SimulationSnapshot) => {
  // Hook point: envia para API / banco.
  // For example:
  // await fetch("/api/saveSnapshot", { method: "POST", body: JSON.stringify(snap) })
  // Depois de salvar, atualiza localStorage também.
  saveToLocalStorage(snap);
  // Return saved snapshot id or response
  return { ok: true, id: snap.id };
};

/* ============================
   EVENTS (audit)
   ============================ */

const pushEvent = (snap: SimulationSnapshot, ev: SimulationEvent) => {
  snap.events = snap.events || [];
  snap.events.push(ev);
};

/* ============================
   CRUD: Clients / ClientMonthly
   ============================ */

export const addClient = (snap: SimulationSnapshot, user: UserInfo, clientData: Partial<Client>) => {
  const client: Client = {
    id: clientData.id ?? uid("client-"),
    name: clientData.name ?? "New Client",
    tags: clientData.tags ?? [],
    defaultContracted: clientData.defaultContracted ?? 0,
    createdAt: nowISO(),
    archived: false,
  };
  snap.clients.push(client);
  pushEvent(snap, {
    id: uid("evt-"),
    ts: nowISO(),
    userId: user.id,
    action: "add",
    targetType: "client",
    targetId: client.id,
    newValue: client,
  });
  return client;
};

export const deleteClient = (snap: SimulationSnapshot, user: UserInfo, clientId: string) => {
  // Soft-delete: marca archived=true
  const client = snap.clients.find((c) => c.id === clientId);
  if (!client) throw new Error("client not found");
  const old = { ...client };
  client.archived = true;
  pushEvent(snap, {
    id: uid("evt-"),
    ts: nowISO(),
    userId: user.id,
    action: "update",
    targetType: "client",
    targetId: clientId,
    oldValue: old,
    newValue: { ...client },
    note: "archived via deleteClient",
  });
  // Opcional: remove monthly entries? prefer keep for audit; you can implement hard delete if desired.
  return client;
};

export const restoreClient = (snap: SimulationSnapshot, user: UserInfo, clientId: string) => {
  const client = snap.clients.find((c) => c.id === clientId);
  if (!client) throw new Error("client not found");
  const old = { ...client };
  client.archived = false;
  pushEvent(snap, {
    id: uid("evt-"),
    ts: nowISO(),
    userId: user.id,
    action: "update",
    targetType: "client",
    targetId: clientId,
    oldValue: old,
    newValue: { ...client },
    note: "restore client",
  });
  return client;
};

export const upsertClientMonthly = (
  snap: SimulationSnapshot,
  user: UserInfo,
  payload: { clientId: string; month: MonthKey; grossRevenue?: number; delivered?: number; contracted?: number; status?: ClientMonthly["status"]; note?: string }
) => {
  const { clientId, month } = payload;
  let row = snap.clientMonthly.find((r) => r.clientId === clientId && r.month === month);
  if (!row) {
    row = {
      clientId,
      month,
      grossRevenue: payload.grossRevenue ?? 0,
      delivered: payload.delivered ?? 0,
      contracted: payload.contracted ?? 0,
      status: payload.status ?? "active",
      notes: payload.note,
    };
    snap.clientMonthly.push(row);
    pushEvent(snap, {
      id: uid("evt-"),
      ts: nowISO(),
      userId: user.id,
      action: "add",
      targetType: "clientMonthly",
      targetId: `${clientId}:${month}`,
      month,
      newValue: row,
    });
  } else {
    const old = { ...row };
    row.grossRevenue = payload.grossRevenue ?? row.grossRevenue;
    row.delivered = payload.delivered ?? row.delivered;
    row.contracted = payload.contracted ?? row.contracted;
    row.status = payload.status ?? row.status;
    row.notes = payload.note ?? row.notes;
    pushEvent(snap, {
      id: uid("evt-"),
      ts: nowISO(),
      userId: user.id,
      action: "update",
      targetType: "clientMonthly",
      targetId: `${clientId}:${month}`,
      month,
      oldValue: old,
      newValue: { ...row },
    });
  }
  // Ensure month known
  if (!snap.settings.monthsAvailable.includes(month)) snap.settings.monthsAvailable.push(month);
  return row;
};

export const deleteClientMonthly = (snap: SimulationSnapshot, user: UserInfo, clientId: string, month: MonthKey) => {
  const idx = snap.clientMonthly.findIndex((r) => r.clientId === clientId && r.month === month);
  if (idx === -1) throw new Error("clientMonthly not found");
  const old = snap.clientMonthly[idx];
  snap.clientMonthly.splice(idx, 1);
  pushEvent(snap, {
    id: uid("evt-"),
    ts: nowISO(),
    userId: user.id,
    action: "delete",
    targetType: "clientMonthly",
    targetId: `${clientId}:${month}`,
    month,
    oldValue: old,
  });
  return old;
};

/* ============================
   CRUD: Costs / CostMonthly / Estornos
   ============================ */

export const addCost = (snap: SimulationSnapshot, user: UserInfo, costData: Partial<Cost>) => {
  const cost: Cost = {
    id: costData.id ?? uid("cost-"),
    name: costData.name ?? "Novo custo",
    type: costData.type ?? "fixed",
    category: costData.category ?? "operational",
    defaultValue: costData.defaultValue ?? 0,
    recurring: costData.recurring ?? true,
    createdAt: nowISO(),
  };
  snap.costs.push(cost);
  pushEvent(snap, {
    id: uid("evt-"),
    ts: nowISO(),
    userId: user.id,
    action: "add",
    targetType: "cost",
    targetId: cost.id,
    newValue: cost,
  });
  return cost;
};

export const upsertCostMonthly = (snap: SimulationSnapshot, user: UserInfo, payload: { costId: string; month: MonthKey; value?: number; active?: boolean; note?: string }) => {
  const { costId, month } = payload;
  let row = snap.costMonthly.find((r) => r.costId === costId && r.month === month);
  if (!row) {
    row = {
      costId,
      month,
      value: payload.value ?? 0,
      type: (snap.costs.find((c) => c.id === costId)?.type) ?? "fixed",
      category: (snap.costs.find((c) => c.id === costId)?.category) ?? "operational",
      recurring: snap.costs.find((c) => c.id === costId)?.recurring ?? false,
      note: payload.note,
      active: payload.active ?? true,
    } as CostMonthly;
    snap.costMonthly.push(row);
    pushEvent(snap, {
      id: uid("evt-"),
      ts: nowISO(),
      userId: user.id,
      action: "add",
      targetType: "costMonthly",
      targetId: `${costId}:${month}`,
      month,
      newValue: row,
    });
  } else {
    const old = { ...row };
    row.value = payload.value ?? row.value;
    row.active = payload.active ?? row.active;
    row.note = payload.note ?? row.note;
    pushEvent(snap, {
      id: uid("evt-"),
      ts: nowISO(),
      userId: user.id,
      action: "update",
      targetType: "costMonthly",
      targetId: `${costId}:${month}`,
      month,
      oldValue: old,
      newValue: { ...row },
    });
  }
  // ensure month known
  if (!snap.settings.monthsAvailable.includes(month)) snap.settings.monthsAvailable.push(month);
  return row;
};

export const addEstorno = (snap: SimulationSnapshot, user: UserInfo, estorno: Omit<Estorno, "id" | "createdAt">) => {
  const e: Estorno = { ...estorno, id: uid("est-"), createdAt: nowISO() };
  snap.estornos.push(e);
  pushEvent(snap, {
    id: uid("evt-"),
    ts: nowISO(),
    userId: user.id,
    action: "add",
    targetType: "estorno",
    targetId: e.id,
    month: e.month,
    newValue: e,
  });
  if (!snap.settings.monthsAvailable.includes(e.month)) snap.settings.monthsAvailable.push(e.month);
  return e;
};

/* ============================
   FORMULAS: editable and preview
   ============================ */

/**
 * evaluateFormula:
 * - Executa uma fórmula (string) em contexto controlado (sem acesso global)
 * - Contexto disponibilizado: settings, clientsMonthly, costsMonthly, estornos, helpers
 *
 * IMPORTANTE: por segurança, não execute "eval" diretamente em produção sem sandboxing.
 * Aqui usamos Function(...) para gerar sandbox mínimo — adaptar conforme segurança do projeto.
 */
type EvalContext = {
  settings: SystemSettings;
  clientsMonthly: ClientMonthly[];
  costsMonthly: CostMonthly[];
  estornos: Estorno[];
  helpers: {
    sum: (arr: number[]) => number;
    totalDelivered: () => number;
    totalOperationalCost: () => number;
    totalLaborCost: () => number; // placeholder - integrate com sua tabela de labor
  };
  month: MonthKey;
};

const safeEval = (expr: string, ctx: EvalContext) => {
  // Cria uma Function com os nomes do contexto como parâmetros
  // Atenção: revisão de segurança necessária antes de aceitar input de usuários não confiáveis.
  const func = new Function(
    "settings",
    "clientsMonthly",
    "costsMonthly",
    "estornos",
    "helpers",
    "month",
    `try { return (${expr}); } catch(e) { return { __error: e.message }; }`
  );
  return func(ctx.settings, ctx.clientsMonthly, ctx.costsMonthly, ctx.estornos, ctx.helpers, ctx.month);
};

export const previewFormula = (snap: SimulationSnapshot, formulaKey: keyof Formulas, month: MonthKey) => {
  const formula = snap.formulas[formulaKey];
  const clientsMonthly = snap.clientMonthly.filter((r) => r.month === month);
  const costsMonthly = snap.costMonthly.filter((r) => r.month === month);
  const estornos = snap.estornos.filter((e) => e.month === month);
  const helpers = {
    sum: (arr: number[]) => arr.reduce((a, b) => a + b, 0),
    totalDelivered: () => clientsMonthly.reduce((a, c) => a + (c.delivered || 0), 0),
    totalOperationalCost: () => costsMonthly.filter((c) => c.category === "operational" && c.active).reduce((a, c) => a + (c.value || 0), 0),
    totalLaborCost: () => 0, // TODO: integrar com tabela de labor
  };
  const ctx: EvalContext = { settings: snap.settings, clientsMonthly, costsMonthly, estornos, helpers, month };
  return safeEval(formula, ctx);
};

/* ============================
   KPI Calculation
   ============================ */

export type KPIResult = {
  month: MonthKey;
  grossRevenue: number;
  netRevenue: number;
  totalOperationalCost: number;
  totalNonOperationalCost: number;
  totalEstornos: number;
  profit: number; // netRevenue - totalOperationalCost + estornos?
  margin: number; // profit / netRevenue
  ler: number;
  roi: number;
  costPerContent: number;
};

export const calculateKPIsForMonth = (snap: SimulationSnapshot, month: MonthKey): KPIResult => {
  const clientsMonthly = snap.clientMonthly.filter((r) => r.month === month && !snap.clients.find((c) => c.id === r.clientId)?.archived);
  const costsMonthly = snap.costMonthly.filter((r) => r.month === month);
  const estornos = snap.estornos.filter((e) => e.month === month);

  const grossRevenue = clientsMonthly.reduce((s, c) => s + (c.grossRevenue || 0), 0);
  const netRevenue = grossRevenue * (1 - snap.settings.taxRate);
  const totalOperationalCost = costsMonthly.filter((c) => c.category === "operational" && c.active !== false).reduce((s, c) => s + (c.value || 0), 0);
  const totalNonOperationalCost = costsMonthly.filter((c) => c.category !== "operational" && c.active !== false).reduce((s, c) => s + (c.value || 0), 0);
  const totalEstornos = estornos.reduce((s, e) => s + (e.amount || 0), 0);

  const totalDelivered = clientsMonthly.reduce((s, c) => s + (c.delivered || 0), 0);
  const costPerContent = totalDelivered > 0 ? totalOperationalCost / totalDelivered : totalOperationalCost;

  const profit = netRevenue - totalOperationalCost + totalEstornos;
  const margin = netRevenue > 0 ? profit / netRevenue : profit === 0 ? 0 : -1;
  const ler = (() => {
    // Placeholder: if you have labor costs as part of costs table, compute.
    const laborCost = costsMonthly.filter((c) => c.category === "admin").reduce((s, c) => s + (c.value || 0), 0); // adjust category mapping
    return laborCost > 0 ? netRevenue / laborCost : 0;
  })();
  const roi = totalOperationalCost > 0 ? profit / totalOperationalCost : 0;

  return {
    month,
    grossRevenue,
    netRevenue,
    totalOperationalCost,
    totalNonOperationalCost,
    totalEstornos,
    profit,
    margin,
    ler,
    roi,
    costPerContent,
  };
};

/* ============================
   Helpers: link dashboard -> config
   ============================ */

/**
 * getKPIsForRange
 * - Use essa função no front para popular todos os cards/indicadores/benchmarks.
 * - TODOS os componentes do dashboard devem usar essas funções em vez de "ler variáveis soltas".
 */
export const getKPIsForRange = (snap: SimulationSnapshot, months: MonthKey[]) => {
  return months.map((m) => calculateKPIsForMonth(snap, m));
};

export const getClientDetailForMonth = (snap: SimulationSnapshot, clientId: string, month: MonthKey) => {
  const client = snap.clients.find((c) => c.id === clientId);
  const clientMonthly = snap.clientMonthly.find((r) => r.clientId === clientId && r.month === month);
  const kpi = calculateKPIsForMonth(snap, month);
  return { client, clientMonthly, kpi };
};

/* ============================
   Validation before commit (formerly "apply")
   ============================ */

export const validateSnapshotForCommit = (snap: SimulationSnapshot) => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // basic checks
  if (snap.clientMonthly.some((r) => r.delivered < 0)) errors.push("Delivered cannot be negative");
  if (snap.costMonthly.some((c) => c.value < 0)) errors.push("Cost value cannot be negative");
  // toleranciaErro: big KPI differences compared to baseline (if baseline exists)
  // For demo: check months with negative margin
  for (const m of snap.settings.monthsAvailable) {
    const k = calculateKPIsForMonth(snap, m);
    if (k.margin < 0) warnings.push(`Negative margin in ${m} (${(k.margin * 100).toFixed(1)}%)`);
    if (k.totalOperationalCost > k.netRevenue * 5) warnings.push(`Operational cost is >5x net revenue in ${m}`);
  }

  return { ok: errors.length === 0, errors, warnings };
};

/* ============================
   Export / Import
   ============================ */

export const exportAuditJson = (snap: SimulationSnapshot) => {
  // build compact export respecting required schema
  const payload = {
    snapshotId: snap.id,
    createdAt: snap.createdAt,
    createdBy: snap.createdBy,
    clients: snap.clients,
    clientMonthly: snap.clientMonthly,
    costs: snap.costs,
    costMonthly: snap.costMonthly,
    estornos: snap.estornos,
    formulas: snap.formulas,
    globalParams: snap.settings,
    events: snap.events,
    // preview KPIs optional: include for first/last months
    previewKPIs: snap.settings.monthsAvailable.map((m) => ({ month: m, kpi: calculateKPIsForMonth(snap, m) })),
  };
  return JSON.stringify(payload, null, 2);
};

export const importCsvToEvents = (snap: SimulationSnapshot, user: UserInfo, csv: string) => {
  // Implement CSV parsing: map columns (clientId, month(YYYY-MM), grossRevenue, delivered, contracted)
  // For demo: simple parser
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = lines.shift()?.split(",").map((h) => h.trim()) ?? [];
  const idx = (col: string) => header.indexOf(col);
  for (const line of lines) {
    const cols = line.split(",").map((c) => c.trim());
    const clientId = cols[idx("clientId")] ?? cols[0];
    const month = cols[idx("month")] ?? cols[1] ?? "2026-01";
    const grossRevenue = Number(cols[idx("grossRevenue")] ?? cols[2] ?? 0);
    const delivered = Number(cols[idx("delivered")] ?? cols[3] ?? 0);
    upsertClientMonthly(snap, user, { clientId, month, grossRevenue, delivered });
  }
  return true;
};
