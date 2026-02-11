import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? '').trim();

const NOT_CONFIGURED_MSG =
  'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel (Settings → Environment Variables) e faça um novo deploy.';

function createStubClient(): SupabaseClient {
  const reject = () => Promise.reject(new Error(NOT_CONFIGURED_MSG));
  return {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signInWithPassword: reject,
      signUp: reject,
      signOut: () => Promise.resolve({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: reject, maybeSingle: reject, order: () => reject }),
        order: () => reject,
      }),
      insert: () => ({ select: () => ({ single: reject }), upsert: () => ({ select: () => ({ single: reject }) }) }),
      update: () => ({ eq: () => ({ select: () => ({ single: reject }) }) }),
      delete: () => ({ eq: () => reject }),
    }),
  } as unknown as SupabaseClient;
}

let _isConfigured = Boolean(supabaseUrl && supabaseAnonKey);
let _supabase: SupabaseClient;

try {
  _supabase = _isConfigured ? createClient(supabaseUrl, supabaseAnonKey) : createStubClient();
} catch (e) {
  console.error('Supabase createClient failed:', e);
  _isConfigured = false;
  _supabase = createStubClient();
}

export const isSupabaseConfigured = _isConfigured;
export const supabase: SupabaseClient = _supabase;

export interface Profile {
  id: string;
  email: string | null;
  company_name: string | null;
  cnpj?: string | null;
  phone?: string | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  logo_url?: string | null;
  // alternativa (nomes usados em algumas versões/BD)
  company_logo?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  company_cnpj?: string | null;
  updated_at?: string;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // normaliza campos alternativos (company_* -> canonical)
  const profileRaw: any = data;
  const normalized: Profile = {
    id: profileRaw.id,
    email: profileRaw.email ?? profileRaw.company_email ?? null,
    company_name: profileRaw.company_name ?? profileRaw.company_name ?? null,
    cnpj: profileRaw.cnpj ?? profileRaw.company_cnpj ?? null,
    phone: profileRaw.phone ?? profileRaw.company_phone ?? null,
    cep: profileRaw.cep ?? null,
    street: profileRaw.street ?? null,
    number: profileRaw.number ?? null,
    complement: profileRaw.complement ?? null,
    district: profileRaw.district ?? null,
    city: profileRaw.city ?? null,
    state: profileRaw.state ?? null,
    logo_url: profileRaw.logo_url ?? profileRaw.company_logo ?? null,
    company_logo: profileRaw.company_logo ?? null,
    company_phone: profileRaw.company_phone ?? null,
    company_address: profileRaw.company_address ?? null,
    company_cnpj: profileRaw.company_cnpj ?? null,
    updated_at: profileRaw.updated_at ?? profileRaw.created_at ?? null,
  };

  // Se address estiver como JSON/text em company_address, tente desserializar
  if ((!normalized.street || !normalized.city) && profileRaw.company_address) {
    try {
      const parsed = typeof profileRaw.company_address === 'string' ? JSON.parse(profileRaw.company_address) : profileRaw.company_address;
      if (parsed) {
        normalized.cep = normalized.cep ?? parsed.cep ?? parsed.zip ?? null;
        normalized.street = normalized.street ?? parsed.street ?? parsed.rua ?? null;
        normalized.number = normalized.number ?? parsed.number ?? parsed.numero ?? null;
        normalized.complement = normalized.complement ?? parsed.complement ?? parsed.complemento ?? null;
        normalized.district = normalized.district ?? parsed.district ?? parsed.bairro ?? null;
        normalized.city = normalized.city ?? parsed.city ?? parsed.cidade ?? null;
        normalized.state = normalized.state ?? parsed.state ?? parsed.estado ?? null;
      }
    } catch {
      // ignora se não for JSON
    }
  }

  return normalized as Profile;
}

export async function upsertProfile(data: {
  id?: string;
  email?: string | null;
  company_name?: string | null;
  cnpj?: string | null;
  phone?: string | null;
  cep?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  logo_url?: string | null;
  // alternativas
  company_logo?: string | null;
  company_phone?: string | null;
  company_address?: string | null;
  company_cnpj?: string | null;
}) {
  // Obtém o usuário autenticado de forma segura
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error('Erro ao obter usuário:', userError);
    throw new Error('Erro ao verificar autenticação.');
  }

  if (!user) {
    throw new Error('Usuário não autenticado. Faça login primeiro.');
  }

  // Prepara os dados para inserção/atualização (força o id a ser o do usuário autenticado)
  const profileData: Record<string, unknown> = {
    id: user.id,
    email: data.email ?? user.email ?? null,
    company_name: data.company_name ?? null,
    // campos adicionais possíveis
    cnpj: (data as any).cnpj ?? null,
    phone: (data as any).phone ?? null,
    cep: (data as any).cep ?? null,
    street: (data as any).street ?? null,
    number: (data as any).number ?? null,
    complement: (data as any).complement ?? null,
    district: (data as any).district ?? null,
    city: (data as any).city ?? null,
    state: (data as any).state ?? null,
    logo_url: (data as any).logo_url ?? null,
    updated_at: new Date().toISOString(),
  };

  // Também escribe colunas alternativas usadas em algumas bases (company_*)
  try {
    const companyAddress = {
      cep: profileData.cep,
      street: profileData.street,
      number: profileData.number,
      complement: profileData.complement,
      district: profileData.district,
      city: profileData.city,
      state: profileData.state,
    };
    (profileData as any).company_logo = profileData.logo_url ?? null;
    (profileData as any).company_phone = profileData.phone ?? null;
    (profileData as any).company_cnpj = profileData.cnpj ?? null;
    // armazena como JSON string para compatibilidade com company_address
    (profileData as any).company_address = JSON.stringify(companyAddress);
  } catch {
    // silencioso
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .upsert(profileData, { onConflict: 'id' })
    .select()
    .single();
    
  if (error) {
    console.error('Erro ao salvar perfil no Supabase:', error);
    throw error;
  }

  return profile;
}

// ============================================
// FUNÇÕES PARA GERENCIAR CLIENTES
// ============================================

export interface CustomerDB {
  id: string;
  user_id: string;
  tipo: 'pessoa_fisica' | 'pessoa_juridica';
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string | null;
  observacoes: string | null;
  data_cadastro: string;
  endereco: {
    rua: string;
    numero: string;
    complemento: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  created_at?: string;
  updated_at?: string;
}

export async function getCustomers(userId: string): Promise<CustomerDB[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Erro ao buscar clientes:', error);
    throw new Error(`Erro ao buscar clientes: ${error.message}`);
  }
  
  return (data || []) as CustomerDB[];
}

export async function createCustomer(
  userId: string,
  customerData: {
    tipo: 'pessoa_fisica' | 'pessoa_juridica';
    nome: string;
    cpf_cnpj: string;
    telefone: string;
    email: string;
    observacoes: string;
    data_cadastro: string;
    endereco: {
      rua: string;
      numero: string;
      complemento: string;
      bairro: string;
      cidade: string;
      estado: string;
      cep: string;
    };
  }
): Promise<CustomerDB> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      user_id: userId,
      ...customerData,
      endereco: customerData.endereco as any,
    })
    .select()
    .single();
    
  if (error) {
    console.error('Erro ao criar cliente:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao criar cliente: ${error.message || 'Erro desconhecido'}`);
  }
  
  return customer as CustomerDB;
}

export async function updateCustomer(
  userId: string,
  customerId: string,
  customerData: Partial<{
    tipo: 'pessoa_fisica' | 'pessoa_juridica';
    nome: string;
    cpf_cnpj: string;
    telefone: string;
    email: string;
    observacoes: string;
    endereco: {
      rua: string;
      numero: string;
      complemento: string;
      bairro: string;
      cidade: string;
      estado: string;
      cep: string;
    };
  }>
): Promise<CustomerDB> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const updateData: any = { ...customerData };
  if (customerData.endereco) {
    updateData.endereco = customerData.endereco as any;
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .update(updateData)
    .eq('id', customerId)
    .eq('user_id', userId)
    .select()
    .single();
    
  if (error) {
    console.error('Erro ao atualizar cliente:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao atualizar cliente: ${error.message || 'Erro desconhecido'}`);
  }
  
  if (!customer) {
    throw new Error('Cliente não encontrado ou não autorizado.');
  }
  
  return customer as CustomerDB;
}

export async function deleteCustomer(userId: string, customerId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', customerId)
    .eq('user_id', userId);
    
  if (error) {
    console.error('Erro ao deletar cliente:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao deletar cliente: ${error.message || 'Erro desconhecido'}`);
  }
}

// ============================================
// FUNÇÕES PARA GERENCIAR ORÇAMENTOS (QUOTES)
// ============================================

export interface QuoteItemDB {
  id: string;
  tipo: 'produto' | 'servico';
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  subtotal: number;
}

export interface QuoteDB {
  id: string;
  user_id: string;
  customer_id: string;
  quote_number: string;
  total_value: number;
  items: QuoteItemDB[];
  status: string;
  created_at?: string;
  updated_at?: string;
}

export async function getQuotes(userId: string): Promise<QuoteDB[]> {
  const { data, error } = await supabase
    .from('quotes')
    .select('*')
    .eq('user_id', userId)
    .order('number', { ascending: false });

  if (error) {
    console.error('Erro ao buscar orçamentos:', error);
    throw new Error(`Erro ao buscar orçamentos: ${error.message}`);
  }

  return (data || []) as QuoteDB[];
}

export async function createQuote(
  userId: string,
  data: {
    customer_id: string;
    total_value: number;
    items: QuoteItemDB[];
    status: string;
  }
): Promise<QuoteDB> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }
  // Gera o número no backend de forma atômica usando função RPC (Postgres).
  // Crie a função SQL 'insert_quote_with_number' no Supabase (veja SQL a seguir).
  try {
    const rpcParams = {
      p_user_id: userId,
      p_customer_id: data.customer_id,
      p_total_value: data.total_value,
      p_items: data.items as unknown as Record<string, unknown>[],
      p_status: data.status,
    };

    console.log('[createQuote] Chamando RPC insert_quote_with_number para user:', userId);

    const { data: rpcData, error: rpcError } = await supabase.rpc('insert_quote_with_number', rpcParams);

    if (rpcError) {
      console.error('Erro RPC ao criar orçamento:', rpcError);
      if (rpcError.code === '42501') {
        throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
      }
      throw new Error(`Erro ao criar orçamento: ${rpcError.message || 'Erro desconhecido'}`);
    }

    const quote = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    return quote as QuoteDB;
  } catch (error) {
    console.error('Erro inesperado ao criar orçamento via RPC:', error);
    throw error;
  }
}

export async function updateQuote(
  userId: string,
  quoteId: string,
  data: Partial<{
    status: string;
    total_value: number;
    items: QuoteItemDB[];
  }>
): Promise<QuoteDB> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const updatePayload: Record<string, unknown> = {};
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.total_value !== undefined) updatePayload.total_value = data.total_value;
  if (data.items !== undefined) updatePayload.items = data.items as unknown as Record<string, unknown>[];

  if (Object.keys(updatePayload).length === 0) return {} as QuoteDB;

  const { data: quote, error } = await supabase
    .from('quotes')
    .update(updatePayload)
    .eq('id', quoteId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar orçamento:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao atualizar orçamento: ${error.message || 'Erro desconhecido'}`);
  }

  if (!quote) {
    throw new Error('Orçamento não encontrado ou não autorizado.');
  }

  return quote as QuoteDB;
}

export async function deleteQuote(userId: string, quoteId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao deletar orçamento:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao deletar orçamento: ${error.message || 'Erro desconhecido'}`);
  }
}

// ============================================
// FUNÇÕES PARA CATÁLOGO DE ITENS (ITEMS_CATALOG)
// ============================================

export interface ItemCatalogDB {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  unit_price: number;
  unit_type: string;
  created_at?: string;
  updated_at?: string;
}

export async function getItemsCatalog(userId: string): Promise<ItemCatalogDB[]> {
  const { data, error } = await supabase
    .from('items_catalog')
    .select('*')
    .eq('user_id', userId)
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar catálogo:', error);
    throw new Error(`Erro ao buscar catálogo: ${error.message}`);
  }

  return (data || []) as ItemCatalogDB[];
}

export async function createItemCatalog(
  userId: string,
  data: { name: string; description?: string | null; unit_price: number; unit_type: string }
): Promise<ItemCatalogDB> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const { data: item, error } = await supabase
    .from('items_catalog')
    .insert({
      user_id: userId,
      name: data.name,
      description: data.description || null,
      unit_price: data.unit_price,
      unit_type: data.unit_type,
    })
    .select()
    .single();

  if (error) {
    console.error('Erro ao criar item no catálogo:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao criar item: ${error.message || 'Erro desconhecido'}`);
  }

  return item as ItemCatalogDB;
}

export async function updateItemCatalog(
  userId: string,
  itemId: string,
  data: Partial<{ name: string; description: string | null; unit_price: number; unit_type: string }>
): Promise<ItemCatalogDB> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const { data: item, error } = await supabase
    .from('items_catalog')
    .update(data)
    .eq('id', itemId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Erro ao atualizar item:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao atualizar item: ${error.message || 'Erro desconhecido'}`);
  }

  if (!item) {
    throw new Error('Item não encontrado ou não autorizado.');
  }

  return item as ItemCatalogDB;
}

export async function deleteItemCatalog(userId: string, itemId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || session.user.id !== userId) {
    throw new Error('Usuário não autenticado ou não autorizado.');
  }

  const { error } = await supabase
    .from('items_catalog')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao deletar item:', error);
    if (error.code === '42501') {
      throw new Error('Erro de permissão. Verifique as políticas RLS no Supabase.');
    }
    throw new Error(`Erro ao deletar item: ${error.message || 'Erro desconhecido'}`);
  }
}
