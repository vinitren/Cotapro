export interface Address {
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

export interface Customer {
  id: string;
  tipo: 'pessoa_fisica' | 'pessoa_juridica';
  nome: string;
  cpf_cnpj: string;
  telefone: string;
  email: string;
  endereco: Address;
  observacoes: string;
  data_cadastro: string;
}

export interface QuoteItem {
  id: string;
  tipo: 'produto' | 'servico';
  descricao: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  subtotal: number;
}

export type QuoteStatus = 'rascunho' | 'enviado' | 'aprovado' | 'recusado' | 'expirado';

export interface Quote {
  id: string;
  numero: string | number;
  cliente_id: string;
  cliente: Customer;
  data_emissao: string;
  data_validade: string;
  status: QuoteStatus;
  itens: QuoteItem[];
  subtotal: number;
  desconto_tipo: 'percentual' | 'fixo';
  desconto_valor: number;
  total: number;
  observacoes: string;
  data_criacao: string;
}

export interface Company {
  id: string;
  nome: string;
  cnpj: string;
  telefone: string;
  email: string;
  endereco: Address;
  logo_url: string;
}

export interface Settings {
  validade_padrao: number;
  observacoes_padrao: string;
  unidades_customizadas: string[];
}

export interface AppData {
  company: Company;
  customers: Customer[];
  quotes: Quote[];
  settings: Settings;
}
