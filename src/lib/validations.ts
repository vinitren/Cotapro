import { z } from 'zod';

export const addressSchema = z.object({
  rua: z.string().default(''),
  numero: z.string().default(''),
  complemento: z.string().default(''),
  bairro: z.string().default(''),
  cidade: z.string().default(''),
  estado: z.string().default(''),
  cep: z.string().default(''),
});

/** CPF/CNPJ: vazio = OK; preenchido = deve ter 11 (CPF) ou 14 (CNPJ) dígitos */
const cpfCnpjSchema = z
  .string()
  .transform((v) => (v || '').trim())
  .refine(
    (v) => {
      const digits = v.replace(/\D/g, '');
      if (digits.length === 0 || /^0+$/.test(digits)) return true;
      return digits.length === 11 || digits.length === 14;
    },
    { message: 'CPF/CNPJ inválido (deve ter 11 ou 14 dígitos)' }
  );

export const customerSchema = z.object({
  tipo: z.enum(['pessoa_fisica', 'pessoa_juridica']),
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf_cnpj: cpfCnpjSchema,
  telefone: z.string().min(14, 'Telefone invalido'),
  email: z.string().email('Email invalido').or(z.string().length(0)),
  endereco: addressSchema,
  observacoes: z.string().default(''),
});

export const quoteItemSchema = z.object({
  id: z.string(),
  tipo: z.enum(['produto', 'servico']),
  descricao: z.string().min(1, 'Descricao e obrigatoria'),
  quantidade: z.number().min(0.01, 'Quantidade deve ser maior que zero'),
  unidade: z.string().min(1, 'Unidade e obrigatoria'),
  valor_unitario: z.number().min(0, 'Valor deve ser positivo'),
  subtotal: z.number(),
});

export const quoteSchema = z.object({
  cliente_id: z.string().min(1, 'Selecione um cliente'),
  validade_dias: z.number().min(1),
  itens: z.array(quoteItemSchema).min(1, 'Adicione pelo menos um item'),
  desconto_tipo: z.enum(['percentual', 'fixo']),
  desconto_valor: z.number().min(0),
  observacoes: z.string().default(''),
});

export const companySchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cnpj: z.string().min(14, 'CNPJ invalido'),
  telefone: z.string().min(14, 'Telefone invalido'),
  email: z.string().email('Email invalido'),
  endereco: addressSchema,
  logo_url: z.string().default(''),
});

export const settingsSchema = z.object({
  validade_padrao: z.number().min(1),
  observacoes_padrao: z.string(),
  unidades_customizadas: z.array(z.string()),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
export type QuoteFormData = z.infer<typeof quoteSchema>;
export type CompanyFormData = z.infer<typeof companySchema>;
export type SettingsFormData = z.infer<typeof settingsSchema>;
