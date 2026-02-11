import { supabase } from './lib/supabase';
import { ClientContract, ClientMonthlyResult, CostData, GlobalSettings, MonthlyGrowthData } from './types';

// --- TRADUTORES: DO BANCO PARA O APP (READ) ---

const mapContractFromDB = (data: any): ClientContract => ({
  id: data.id,
  Cliente: data.client_name,
  Status_Contrato: data.status,
  Data_Inicio: data.start_date,
  Data_Renovacao: data.renewal_date,
  Dia_Pagamento: data.payment_day,
  Descricao_Servico: data.service_description,
  Valor_Sugerido_Renovacao: data.suggested_renewal_value,
  Origem: data.origin,
  Tipo_Servico: data.service_type || 'Agency',
  UIZ_Setup_Fee: data.uiz_setup_fee || 0,
  UIZ_Valor_Mensal: data.uiz_monthly_price || 0
});

const mapResultFromDB = (data: any): ClientMonthlyResult => ({
  id: data.id,
  contractId: data.contract_id,
  Mes_Referencia: data.reference_month,
  Receita_Mensal_BRL: data.revenue,
  Conteudos_Contratados: data.contracted_content,
  Conteudos_Entregues: data.delivered_content,
  Conteudos_Nao_Entregues: data.not_delivered_content,
  Status_Mensal: data.status,
  Status_Detalhe: data.details
});

const mapCostFromDB = (data: any): CostData => ({
  id: data.id,
  Tipo_Custo: data.description,
  Mes_Referencia: data.reference_month,
  Valor_Mensal_BRL: data.amount,
  Ativo_no_Mes: data.is_active,
  Categoria: data.category,
  Tipo: data.type
});

// --- TRADUTORES: DO APP PARA O BANCO (WRITE) ---

const mapContractToDB = (c: ClientContract) => ({
  id: c.id.length < 10 ? undefined : c.id, // Se for ID temporário curto, deixa undefined pro banco criar UUID
  client_name: c.Cliente,
  status: c.Status_Contrato,
  start_date: c.Data_Inicio,
  renewal_date: c.Data_Renovacao,
  payment_day: c.Dia_Pagamento,
  service_description: c.Descricao_Servico,
  suggested_renewal_value: c.Valor_Sugerido_Renovacao,
  origin: c.Origem,
  service_type: c.Tipo_Servico || 'Agency',
  uiz_setup_fee: c.UIZ_Setup_Fee || 0,
  uiz_monthly_price: c.UIZ_Valor_Mensal || 0
});

const mapResultToDB = (r: ClientMonthlyResult) => ({
  id: r.id.includes('temp') ? undefined : r.id,
  contract_id: r.contractId,
  reference_month: r.Mes_Referencia,
  revenue: r.Receita_Mensal_BRL,
  contracted_content: r.Conteudos_Contratados,
  delivered_content: r.Conteudos_Entregues,
  not_delivered_content: r.Conteudos_Nao_Entregues,
  status: r.Status_Mensal,
  details: r.Status_Detalhe
});

const mapCostToDB = (c: CostData) => ({
  id: c.id.includes('temp') ? undefined : c.id,
  description: c.Tipo_Custo,
  reference_month: c.Mes_Referencia,
  amount: c.Valor_Mensal_BRL,
  is_active: c.Ativo_no_Mes,
  category: c.Categoria,
  type: c.Tipo
});

// --- FUNÇÕES DE LEITURA (FETCH) ---

export const fetchDashboardData = async () => {
  console.log("🔄 Sincronizando dados...");
  try {
    const [contracts, results, costs, settings, growth] = await Promise.all([
      supabase.from('contracts').select('*'),
      supabase.from('monthly_results').select('*'),
      supabase.from('costs').select('*'),
      supabase.from('global_settings').select('*').limit(1).single(),
      supabase.from('growth_metrics').select('*')
    ]);

    if (contracts.error) throw contracts.error;

    return {
      // CORREÇÃO AQUI: Se não houver dados, retorna array vazio [] em vez de dados falsos
      contracts: contracts.data?.length ? contracts.data.map(mapContractFromDB) : [],
      monthlyResults: results.data?.length ? results.data.map(mapResultFromDB) : [],
      costs: costs.data?.length ? costs.data.map(mapCostFromDB) : [],
      settings: settings.data?.settings_json || null,
      growthData: growth.data?.length 
        ? growth.data.map((d: any) => ({ month: d.reference_month, adSpend: d.ad_spend, leads: d.leads })) 
        : []
    };
  } catch (error) {
    console.error("❌ Erro ao buscar dados:", error);
    return null;
  }
};

// --- FUNÇÕES DE ESCRITA (WRITE) ---

// 1. Contratos
export const upsertContract = async (contract: ClientContract) => {
  const payload = mapContractToDB(contract);
  if (!payload.id) delete payload.id; 

  const { data, error } = await supabase
    .from('contracts')
    .upsert(payload)
    .select()
    .single();

  if (error) {
    console.error("Erro ao salvar contrato:", error);
    throw error;
  }
  return mapContractFromDB(data);
};

export const deleteContract = async (id: string) => {
  const { error } = await supabase.from('contracts').delete().eq('id', id);
  if (error) throw error;
};

// 2. Resultados Mensais
export const upsertMonthlyResult = async (result: ClientMonthlyResult) => {
  const payload = mapResultToDB(result);
  if (!payload.id) delete payload.id;

  const { data, error } = await supabase
    .from('monthly_results')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return mapResultFromDB(data);
};

// 3. Custos
export const upsertCost = async (cost: CostData) => {
  const payload = mapCostToDB(cost);
  if (!payload.id) delete payload.id;

  const { data, error } = await supabase
    .from('costs')
    .upsert(payload)
    .select()
    .single();

  if (error) throw error;
  return mapCostFromDB(data);
};

export const deleteCost = async (id: string) => {
  const { error } = await supabase.from('costs').delete().eq('id', id);
  if (error) throw error;
};

// 4. Configurações
export const saveSettings = async (settings: GlobalSettings) => {
  const { data: existing } = await supabase.from('global_settings').select('id').limit(1).single();
  
  const payload = {
    settings_json: settings,
    id: existing?.id
  };

  const { error } = await supabase.from('global_settings').upsert(payload);
  if (error) console.error("Erro ao salvar settings:", error);
};

// 5. Growth Data
export const saveGrowthData = async (month: string, adSpend: number) => {
  const { error } = await supabase
    .from('growth_metrics')
    .upsert({ reference_month: month, ad_spend: adSpend }, { onConflict: 'reference_month' });
  
  if (error) console.error("Erro growth:", error);
};
