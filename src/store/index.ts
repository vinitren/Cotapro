import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Customer, Quote, Company, Settings, QuoteStatus } from '../types';
import { generateId, isExpired, addDays } from '../lib/utils';
import { supabase, getCustomers, createCustomer, updateCustomer as updateCustomerDB, deleteCustomer as deleteCustomerDB, getQuotes, createQuote as createQuoteDB, updateQuote as updateQuoteDB, deleteQuote as deleteQuoteDB, buildQuoteUpdatePayload } from '../lib/supabase';
import type { Profile } from '../lib/supabase';

const defaultCompany: Company = {
  id: '1',
  nome: 'Minha Empresa LTDA',
  cnpj: '12.345.678/0001-90',
  telefone: '(41) 99999-9999',
  email: 'contato@minhaempresa.com',
  endereco: {
    rua: 'Rua Exemplo',
    numero: '123',
    complemento: '',
    bairro: 'Centro',
    cidade: 'Curitiba',
    estado: 'PR',
    cep: '80000-000',
  },
  logo_url: '',
};

const defaultSettings: Settings = {
  validade_padrao: 15,
  observacoes_padrao: 'Pagamento: 50% entrada + 50% na entrega',
  unidades_customizadas: ['UN', 'M', 'M2', 'KG', 'HORA', 'SERVICO'],
};

const defaultCustomers: Customer[] = [
  {
    id: '1',
    tipo: 'pessoa_fisica',
    nome: 'Joao Silva',
    cpf_cnpj: '123.456.789-00',
    telefone: '(41) 98888-8888',
    email: 'joao@email.com',
    endereco: {
      rua: 'Rua das Flores',
      numero: '456',
      complemento: 'Apto 101',
      bairro: 'Jardim',
      cidade: 'Curitiba',
      estado: 'PR',
      cep: '80050-000',
    },
    observacoes: '',
    data_cadastro: '2025-01-15',
  },
  {
    id: '2',
    tipo: 'pessoa_juridica',
    nome: 'Tech Solutions LTDA',
    cpf_cnpj: '98.765.432/0001-10',
    telefone: '(41) 97777-7777',
    email: 'contato@techsolutions.com',
    endereco: {
      rua: 'Av. Brasil',
      numero: '1000',
      complemento: 'Sala 501',
      bairro: 'Centro',
      cidade: 'Curitiba',
      estado: 'PR',
      cep: '80060-000',
    },
    observacoes: 'Cliente desde 2024',
    data_cadastro: '2025-01-10',
  },
  {
    id: '3',
    tipo: 'pessoa_fisica',
    nome: 'Maria Santos',
    cpf_cnpj: '987.654.321-00',
    telefone: '(41) 96666-6666',
    email: 'maria@email.com',
    endereco: {
      rua: 'Rua XV de Novembro',
      numero: '789',
      complemento: '',
      bairro: 'Centro',
      cidade: 'Curitiba',
      estado: 'PR',
      cep: '80070-000',
    },
    observacoes: '',
    data_cadastro: '2025-01-20',
  },
];

const defaultQuotes: Quote[] = [
  {
    id: '1',
    numero: 1,
    cliente_id: '1',
    cliente: defaultCustomers[0],
    data_emissao: '2025-01-28',
    data_validade: '2025-02-12',
    status: 'enviado',
    itens: [
      {
        id: '1',
        tipo: 'servico',
        descricao: 'Instalacao eletrica completa',
        quantidade: 1,
        unidade: 'SERVICO',
        valor_unitario: 1500,
        subtotal: 1500,
      },
      {
        id: '2',
        tipo: 'produto',
        descricao: 'Material eletrico',
        quantidade: 1,
        unidade: 'UN',
        valor_unitario: 500,
        subtotal: 500,
      },
    ],
    subtotal: 2000,
    desconto_tipo: 'percentual',
    desconto_valor: 10,
    total: 1800,
    observacoes: 'Pagamento: 50% entrada + 50% na entrega',
    data_criacao: '2025-01-28',
  },
  {
    id: '2',
    numero: 2,
    cliente_id: '2',
    cliente: defaultCustomers[1],
    data_emissao: '2025-01-30',
    data_validade: '2025-02-14',
    status: 'aprovado',
    itens: [
      {
        id: '1',
        tipo: 'servico',
        descricao: 'Consultoria tecnica',
        quantidade: 10,
        unidade: 'HORA',
        valor_unitario: 200,
        subtotal: 2000,
      },
    ],
    subtotal: 2000,
    desconto_tipo: 'fixo',
    desconto_valor: 0,
    total: 2000,
    observacoes: 'Pagamento a vista',
    data_criacao: '2025-01-30',
  },
];

interface AppState {
  company: Company;
  customers: Customer[];
  quotes: Quote[];
  settings: Settings;
  isAuthenticated: boolean;
  userName: string;
  userId: string | null;

  login: (email: string, name: string) => void;
  logout: () => void;
  clearSession: () => void;
  setSessionFromUser: (userId: string, email: string, profile?: Profile | null) => void;
  loadCustomers: () => Promise<void>;
  loadQuotes: () => Promise<void>;

  setCompany: (company: Company) => void;
  setSettings: (settings: Settings) => void;

  addCustomer: (customer: Omit<Customer, 'id' | 'data_cadastro'>) => Promise<Customer>;
  updateCustomer: (id: string, customer: Partial<Customer>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;

  addQuote: (quote: Omit<Quote, 'id' | 'numero' | 'data_emissao' | 'data_criacao'>) => Promise<Quote>;
  updateQuote: (id: string, quote: Partial<Quote>) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  getQuote: (id: string) => Quote | undefined;
  updateQuoteStatus: (id: string, status: QuoteStatus) => Promise<void>;
  getNextQuoteNumber: () => number;

  checkExpiredQuotes: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      company: defaultCompany,
      customers: defaultCustomers,
      quotes: defaultQuotes,
      settings: defaultSettings,
      isAuthenticated: false,
      userName: '',
      userId: null,

      login: (email: string, name: string) => {
        set({ isAuthenticated: true, userName: name || email.split('@')[0] });
      },

      setSessionFromUser: (userId: string, email: string, profile?: Profile | null) => {
        const companyName = profile?.company_name ?? null;
        // Mapear campos do profile para company (mantém valores existentes quando ausentes)
        set((state) => ({
          isAuthenticated: true,
          userName: companyName || email.split('@')[0],
          userId,
          company: {
            ...state.company,
            nome: profile?.company_name ?? state.company.nome,
            cnpj: profile?.cnpj ?? state.company.cnpj,
            telefone: profile?.phone ?? state.company.telefone,
            email: profile?.email ?? state.company.email,
            logo_url: profile?.logo_url ?? state.company.logo_url,
            pix_key: profile?.pix_key ?? state.company.pix_key ?? null,
            pix_type: profile?.pix_type ?? state.company.pix_type ?? null,
            pix_name: profile?.pix_name ?? state.company.pix_name ?? null,
            pix_city: profile?.pix_city ?? state.company.pix_city ?? null,
            endereco: {
              rua: profile?.street ?? state.company.endereco.rua,
              numero: profile?.number ?? state.company.endereco.numero,
              complemento: profile?.complement ?? state.company.endereco.complemento,
              bairro: profile?.district ?? state.company.endereco.bairro,
              cidade: profile?.city ?? state.company.endereco.cidade,
              estado: profile?.state ?? state.company.endereco.estado,
              cep: profile?.cep ?? state.company.endereco.cep,
            },
          },
        }));
        // Carrega clientes e orçamentos do Supabase após login
        get().loadCustomers();

        // Em background, carrega preferências armazenadas no profile (default_notes, default_validity_days)
        (async () => {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            const uid = user?.id ?? userId;
            if (!uid) return;

            const { data: prefs, error } = await supabase
              .from('profiles')
              .select('default_notes, default_validity_days')
              .eq('id', uid)
              .maybeSingle();

            if (!error && prefs) {
              const observacoes_padrao = prefs.default_notes ?? '';
              const validade_padrao = prefs.default_validity_days !== null && prefs.default_validity_days !== undefined
                ? Number(prefs.default_validity_days) || defaultSettings.validade_padrao
                : defaultSettings.validade_padrao;

              set((state) => ({
                settings: {
                  ...state.settings,
                  observacoes_padrao: observacoes_padrao,
                  validade_padrao: validade_padrao,
                },
              }));
            }
          } catch (err) {
            console.error('Erro ao carregar preferências do profile:', err);
          }
        })();
      },

      clearSession: () => {
        set({ 
          isAuthenticated: false, 
          userName: '', 
          userId: null,
          customers: defaultCustomers,
          quotes: defaultQuotes,
        });
      },

      loadCustomers: async () => {
        const userId = get().userId;
        if (!userId) return;
        
        try {
          const customersDB = await getCustomers(userId);
          const customers: Customer[] = customersDB.map((c) => ({
            id: c.id,
            tipo: c.tipo,
            nome: c.nome,
            cpf_cnpj: c.cpf_cnpj,
            telefone: c.telefone,
            email: c.email || '',
            endereco: c.endereco,
            observacoes: c.observacoes || '',
            data_cadastro: c.data_cadastro,
          }));
          set({ customers });
          await get().loadQuotes();
        } catch (error) {
          console.error('Erro ao carregar clientes:', error);
          // Nota: toast não pode ser usado diretamente no store.
          // O erro será propagado para as páginas que chamam loadCustomers.
        }
      },

      loadQuotes: async () => {
        const userId = get().userId;
        if (!userId) return;
        
        try {
          // Observações/condições padrão vêm do profile (default_notes)
          // (usado para exibição no preview/PDF quando o quote não tiver campo próprio)
          let profileDefaultNotes = '';
          try {
            const { data: prefs } = await supabase
              .from('profiles')
              .select('default_notes')
              .eq('id', userId)
              .maybeSingle();
            profileDefaultNotes = String((prefs as any)?.default_notes ?? '').trim();
          } catch {
            profileDefaultNotes = String(get().settings?.observacoes_padrao ?? '').trim();
          }

          const quotesDB = await getQuotes(userId);
          const customers = get().customers;
          const quotes: Quote[] = quotesDB.map((q) => {
            const cliente = customers.find((c) => c.id === q.customer_id);
            const dataCriacao = q.created_at ? new Date(q.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

            // calcula data_validade: usa q.data_validade se existir,
            // senão usa q.validity_days se disponível, ou fallback para validade_padrao das settings
            let dataValidade: string;
            if ((q as any).data_validade) {
              dataValidade = new Date((q as any).data_validade).toISOString().split('T')[0];
            } else {
              const days = (q as any).validity_days ?? get().settings.validade_padrao;
              const baseDate = q.created_at ? new Date(q.created_at) : new Date();
              dataValidade = addDays(baseDate, Number(days)).toISOString().split('T')[0];
            }

            // Normaliza items (pode vir como q.items (array ou string) ou q.itens)
            let rawItems: any = [];
            if (Array.isArray((q as any).items)) {
              rawItems = (q as any).items;
            } else if (typeof (q as any).items === 'string') {
              try {
                rawItems = JSON.parse((q as any).items);
              } catch {
                rawItems = [];
              }
            } else if (Array.isArray((q as any).itens)) {
              rawItems = (q as any).itens;
            } else if (typeof (q as any).itens === 'string') {
              try {
                rawItems = JSON.parse((q as any).itens);
              } catch {
                rawItems = [];
              }
            } else {
              rawItems = [];
            }
            const itens = (rawItems || []).map((it: any) => ({
              id: String(it.id || it._id || generateId()),
              tipo: it.tipo || 'produto',
              descricao: it.descricao || it.description || '',
              quantidade: Number(it.quantidade || 0),
              unidade: it.unidade || it.unit || '',
              valor_unitario: Number(it.valor_unitario ?? it.unit_price ?? 0),
              subtotal: Number(it.subtotal ?? (it.valor_unitario ? Number(it.valor_unitario) * Number(it.quantidade || 0) : 0)),
            }));

            const quoteObsRaw = String(((q as any).observations ?? (q as any).observacoes ?? (q as any).notes ?? '')).trim();
            const observacoes = quoteObsRaw || profileDefaultNotes || '';

            return {
              id: q.id,
              numero: (q as any).quote_number ?? q.number ?? '',
              cliente_id: q.customer_id,
              cliente: cliente || {
                id: q.customer_id,
                tipo: 'pessoa_fisica',
                nome: 'Cliente não encontrado',
                cpf_cnpj: '',
                telefone: '',
                email: '',
                endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' },
                observacoes: '',
                data_cadastro: dataCriacao,
              },
              data_emissao: dataCriacao,
              data_validade: dataValidade,
              status: q.status as QuoteStatus,
              itens,
              subtotal: Number(q.total_value) || 0,
              desconto_tipo: 'percentual' as const,
              desconto_valor: 0,
              total: Number(q.total_value) || 0,
              observacoes,
              data_criacao: dataCriacao,
            };
          });
          set({ quotes });
        } catch (error) {
          console.error('Erro ao carregar orçamentos:', error);
          // Nota: toast não pode ser usado diretamente no store.
          // O erro será propagado para as páginas que chamam loadQuotes.
        }
      },

      logout: async () => {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignora erro (ex.: Supabase não configurado)
        }
        set({ isAuthenticated: false, userName: '' });
      },

      setCompany: (company: Company) => {
        set({ company });
      },

      setSettings: (settings: Settings) => {
        set({ settings });
      },

      addCustomer: async (customerData) => {
        const userId = get().userId;
        const dataCadastro = new Date().toISOString().split('T')[0];
        
        // Se não há userId (não autenticado), salva apenas localmente
        if (!userId) {
          const customer: Customer = {
            ...customerData,
            id: generateId(),
            data_cadastro: dataCadastro,
          };
          set((state) => ({
            customers: [...state.customers, customer],
          }));
          return customer;
        }

        // Salva no Supabase
        try {
          const customerDB = await createCustomer(userId, {
            ...customerData,
            data_cadastro: dataCadastro,
          });
          
          const customer: Customer = {
            id: customerDB.id,
            tipo: customerDB.tipo,
            nome: customerDB.nome,
            cpf_cnpj: customerDB.cpf_cnpj,
            telefone: customerDB.telefone,
            email: customerDB.email || '',
            endereco: customerDB.endereco,
            observacoes: customerDB.observacoes || '',
            data_cadastro: customerDB.data_cadastro,
          };
          
          set((state) => ({
            customers: [...state.customers, customer],
          }));
          return customer;
        } catch (error) {
          console.error('Erro ao salvar cliente no Supabase:', error);
          // Em caso de erro, salva localmente como fallback
          const customer: Customer = {
            ...customerData,
            id: generateId(),
            data_cadastro: dataCadastro,
          };
          set((state) => ({
            customers: [...state.customers, customer],
          }));
          throw error; // Propaga o erro para o componente tratar
        }
      },

      updateCustomer: async (id: string, customerData: Partial<Customer>) => {
        const userId = get().userId;
        
        // Atualiza localmente primeiro para feedback imediato
        set((state) => ({
          customers: state.customers.map((c) =>
            c.id === id ? { ...c, ...customerData } : c
          ),
        }));

        // Se não há userId, apenas atualiza localmente
        if (!userId) return;

        // Atualiza no Supabase
        try {
          const updateData: any = { ...customerData };
          // Remove campos que não devem ser atualizados diretamente
          delete updateData.id;
          delete updateData.data_cadastro;
          
          await updateCustomerDB(userId, id, updateData);
        } catch (error) {
          console.error('Erro ao atualizar cliente no Supabase:', error);
          // Reverte a mudança local em caso de erro
          get().loadCustomers();
          throw error;
        }
      },

      deleteCustomer: async (id: string) => {
        const userId = get().userId;
        
        // Remove localmente primeiro
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));

        // Se não há userId, apenas remove localmente
        if (!userId) return;

        // Remove do Supabase
        try {
          await deleteCustomerDB(userId, id);
        } catch (error) {
          console.error('Erro ao deletar cliente no Supabase:', error);
          // Recarrega clientes em caso de erro para reverter
          get().loadCustomers();
          throw error;
        }
      },

      getCustomer: (id: string) => {
        return get().customers.find((c) => c.id === id);
      },

      addQuote: async (quoteData) => {
        const userId = get().userId;
        const numero = get().getNextQuoteNumber();
        const dataEmissao = new Date().toISOString().split('T')[0];
        const dataCriacao = new Date().toISOString().split('T')[0];

        const quoteLocal: Quote = {
          ...quoteData,
          id: generateId(),
          numero,
          data_emissao: dataEmissao,
          data_criacao: dataCriacao,
        };

        if (!userId) {
          set((state) => ({ quotes: [...state.quotes, quoteLocal] }));
          return quoteLocal;
        }

        try {
          const quoteDB = await createQuoteDB(userId, {
            customer_id: quoteData.cliente_id,
            total_value: quoteData.total,
            items: quoteData.itens,
            status: quoteData.status,
          });

          const dataCriacaoFromDb = quoteDB.created_at ? new Date(quoteDB.created_at).toISOString().split('T')[0] : dataCriacao;
          // Normaliza items retornados pelo DB
          let rawItemsFromDb: any = [];
          if (Array.isArray((quoteDB as any).items)) {
            rawItemsFromDb = (quoteDB as any).items;
          } else if (typeof (quoteDB as any).items === 'string') {
            try {
              rawItemsFromDb = JSON.parse((quoteDB as any).items);
            } catch {
              rawItemsFromDb = quoteData.itens || [];
            }
          } else if (Array.isArray((quoteDB as any).itens)) {
            rawItemsFromDb = (quoteDB as any).itens;
          } else if (typeof (quoteDB as any).itens === 'string') {
            try {
              rawItemsFromDb = JSON.parse((quoteDB as any).itens);
            } catch {
              rawItemsFromDb = quoteData.itens || [];
            }
          } else {
            rawItemsFromDb = quoteData.itens || [];
          }
          const normalizedItems = (rawItemsFromDb || []).map((it: any) => ({
            id: String(it.id || it._id || generateId()),
            tipo: it.tipo || 'produto',
            descricao: it.descricao || it.description || '',
            quantidade: Number(it.quantidade || 0),
            unidade: it.unidade || it.unit || '',
            valor_unitario: Number(it.valor_unitario ?? it.unit_price ?? 0),
            subtotal: Number(it.subtotal ?? (it.valor_unitario ? Number(it.valor_unitario) * Number(it.quantidade || 0) : 0)),
          }));

          const quote: Quote = {
            id: quoteDB.id,
            numero: (quoteDB as any).quote_number ?? quoteDB.number ?? '',
            cliente_id: quoteDB.customer_id,
            cliente: quoteData.cliente,
            data_emissao: dataEmissao,
            data_validade: quoteData.data_validade,
            status: quoteDB.status as QuoteStatus,
            itens: normalizedItems,
            subtotal: quoteData.subtotal,
            desconto_tipo: quoteData.desconto_tipo,
            desconto_valor: quoteData.desconto_valor,
            total: Number(quoteDB.total_value) || quoteData.total,
            observacoes: quoteData.observacoes,
            data_criacao: dataCriacaoFromDb,
          };

          set((state) => ({ quotes: [quote, ...state.quotes] }));
          return quote;
        } catch (error) {
          console.error('Erro ao salvar orçamento no Supabase:', error);
          // Não adiciona localmente em caso de falha: usuário deve ver erro e tentar novamente
          throw error;
        }
      },

      updateQuote: async (id: string, quoteData: Partial<Quote>) => {
        const userId = get().userId;
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, ...quoteData } : q
          ),
        }));

        if (!userId) return;

        try {
          const formValues = {
            cliente_id: quoteData.cliente_id,
            status: quoteData.status,
            total: quoteData.total,
            itens: quoteData.itens,
            observacoes: quoteData.observacoes,
            notes: (quoteData as { notes?: string }).notes,
            data_validade: quoteData.data_validade,
            validity_days: (quoteData as { validity_days?: number }).validity_days,
            desconto_tipo: quoteData.desconto_tipo,
            desconto_valor: quoteData.desconto_valor,
          };
          const updatePayload = buildQuoteUpdatePayload(formValues);
          if (Object.keys(updatePayload).length > 0) {
            await updateQuoteDB(userId, id, updatePayload);
          }
        } catch (error) {
          console.error('Erro ao atualizar orçamento no Supabase:', error);
          get().loadQuotes();
          throw error;
        }
      },

      deleteQuote: async (id: string) => {
        const userId = get().userId;
        set((state) => ({
          quotes: state.quotes.filter((q) => q.id !== id),
        }));

        if (!userId) return;

        try {
          await deleteQuoteDB(userId, id);
        } catch (error) {
          console.error('Erro ao deletar orçamento no Supabase:', error);
          get().loadQuotes();
          throw error;
        }
      },

      getQuote: (id: string) => {
        return get().quotes.find((q) => q.id === id);
      },

      updateQuoteStatus: async (id: string, status: QuoteStatus) => {
        const userId = get().userId;
        set((state) => ({
          quotes: state.quotes.map((q) =>
            q.id === id ? { ...q, status } : q
          ),
        }));

        if (!userId) return;

        try {
          await updateQuoteDB(userId, id, { status });
        } catch (error) {
          console.error('Erro ao atualizar status no Supabase:', error);
          get().loadQuotes();
          throw error;
        }
      },

      getNextQuoteNumber: () => {
        const quotes = get().quotes;
        if (quotes.length === 0) return 1;
        let max = 0;
        for (const q of quotes) {
          const n = q.numero;
          if (typeof n === 'number' && !isNaN(n)) {
            max = Math.max(max, n as number);
          } else if (typeof n === 'string') {
            const m = (n as string).match(/(\d+)$/);
            if (m) {
              const val = parseInt(m[1], 10);
              if (!isNaN(val)) max = Math.max(max, val);
            }
          }
        }
        return max + 1;
      },

      checkExpiredQuotes: () => {
        set((state) => ({
          quotes: state.quotes.map((q) => {
            if (q.status === 'enviado' && isExpired(q.data_validade)) {
              return { ...q, status: 'expirado' as QuoteStatus };
            }
            return q;
          }),
        }));
      },
    }),
    {
      name: 'cotapro-storage',
    }
  )
);
