import { supabase } from './lib/supabase';
import { ClientContract, ClientMonthlyResult, CostData, GlobalSettings, MonthlyGrowthData } from './types';
import { INITIAL_CONTRACTS, INITIAL_MONTHLY_RESULTS, ALL_COSTS, INITIAL_GROWTH_DATA } from './constants';

// --- FUNÇÕES DE TRADUÇÃO (DB -> APP) ---

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

// --- FUNÇÕES DE BUSCA (FETCH) ---

export const fetchDashboardData = async () => {
  console.log("🔄 Iniciando sincronização com Supabase...");

  try {
    // 1. Buscar Contratos
    const { data: contractsData, error: contractsError } = await supabase
      .from('contracts')
      .select('*');
    
    if (contractsError) throw contractsError;

    // 2. Buscar Resultados Mensais
    const { data: resultsData, error: resultsError } = await supabase
      .from('monthly_results')
      .select('*');

    if (resultsError) throw resultsError;

    // 3. Buscar Custos
    const { data: costsData, error: costsError } = await supabase
      .from('costs')
      .select('*');

    if (costsError) throw costsError;

    // 4. Buscar Configurações Globais
    const { data: settingsData, error: settingsError } = await supabase
      .from('global_settings')
      .select('*')
      .limit(1)
      .single();

    // Se não tiver settings no banco, não é erro crítico, usamos o padrão.
    if (settingsError && settingsError.code !== 'PGRST116') {
        console.warn("Aviso ao buscar settings:", settingsError.message);
    }

    // 5. Buscar Growth Data
    const { data: growthData, error: growthError } = await supabase
      .from('growth_metrics')
      .select('*');
    
    if (growthError) throw growthError;

    // --- RETORNO TRADUZIDO ---
    // Se o banco estiver vazio (array vazio), retornamos os dados INICIAIS (demo) 
    // para você não ver uma tela em branco na primeira vez.
    
    return {
      contracts: contractsData && contractsData.length > 0 
        ? contractsData.map(mapContractFromDB) 
        : INITIAL_CONTRACTS, // Fallback para dados de teste se DB vazio

      monthlyResults: resultsData && resultsData.length > 0 
        ? resultsData.map(mapResultFromDB) 
        : INITIAL_MONTHLY_RESULTS,

      costs: costsData && costsData.length > 0 
        ? costsData.map(mapCostFromDB) 
        : ALL_COSTS,

      settings: settingsData?.settings_json || null, // Se null, o App usa o default

      growthData: growthData && growthData.length > 0
        ? growthData.map((d: any) => ({ month: d.reference_month, adSpend: d.ad_spend, leads: d.leads }))
        : INITIAL_GROWTH_DATA
    };

  } catch (error) {
    console.error("❌ Erro fatal ao buscar dados:", error);
    // Em caso de erro, retornamos NULL para o App saber que falhou
    return null;
  }
};
