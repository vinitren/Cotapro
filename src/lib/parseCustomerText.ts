/** Modelo de texto para envio ao cliente via WhatsApp (cadastro guiado) */
export const CUSTOMER_PASTE_MODEL = `Para agilizar seu orçamento, poderia me enviar as informações abaixo?

Nome completo:
Telefone:
Email:
CPF ou CNPJ:

Se for empresa, informe a razão social também.`;

export interface ParseClientClipboardResult {
  nome?: string;
  telefone?: string;
  email?: string;
  cpfCnpj?: string;
  razaoSocial?: string;
}

const PHRASE_TEMPLATE = /para agilizar|poderia me enviar|informe a razão|informações abaixo/i;

/** Remove emojis e espaços duplicados */
function normalizeText(text: string): string {
  return (text || '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Rótulos que iniciam novo campo */
const FIELD_LABELS = /^(nome\s+completo|nome|cliente|responsável|telefone|tel|celular|whatsapp|email|e-?mail|cpf\s+ou\s+cnpj|cpf|cnpj|razão\s+social|razao\s+social|empresa)\s*[:=\-]?\s*/i;

/** Extrai valores por rótulos: label pode ser seguido de : - = ou quebra de linha */
function extractByLabels(text: string, labels: string[]): Map<string, string> {
  const map = new Map<string, string>();
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const label of labels) {
      const re = new RegExp(`^\\s*${label.replace(/\s+/g, '\\s+')}\\s*[:=\\-]?\\s*(.*)$`, 'i');
      const m = line.match(re);
      if (m) {
        let value = m[1].trim();
        if (!value) {
          let j = i + 1;
          while (j < lines.length) {
            const next = lines[j].trim();
            if (!next) { j++; continue; }
            if (FIELD_LABELS.test(next)) break;
            value = next;
            break;
          }
        }
        if (value) map.set(label.toLowerCase(), value);
        break;
      }
    }
  }
  return map;
}

/** Extrai primeiro email válido */
function extractEmail(text: string): string | undefined {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].trim() : undefined;
}

/** Extrai e normaliza telefone BR (10 ou 11 dígitos) */
function extractPhone(text: string): string | undefined {
  const digits = text.replace(/\D/g, '');
  let normalized = digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
  if (normalized.length === 10 || normalized.length === 11) return normalized;
  const match = text.match(/(?:55\s*)?(?:\(?\d{2}\)?\s*)?(9\d{8}|\d{8})\b/);
  if (match) {
    const d = match[0].replace(/\D/g, '');
    const d2 = d.startsWith('55') ? d.slice(2) : d;
    if (d2.length === 10 || d2.length === 11) return d2;
  }
  return undefined;
}

/** Extrai CPF (11 dígitos) ou CNPJ (14 dígitos), priorizando rótulo próximo */
function extractCpfCnpj(text: string, labelsMap: Map<string, string>): string | undefined {
  for (const key of ['cpf ou cnpj', 'cpf', 'cnpj']) {
    const val = (labelsMap.get(key) ?? '').replace(/\D/g, '');
    if (val.length === 11 || val.length === 14) return val;
  }

  const nearCpf = /\b(?:cpf|cpf\s+ou\s+cnpj)\s*[:=\-]?\s*[\s]*(\d[\d\.\-\s]{10,13}\d)/i;
  const nearCnpj = /\b(?:cnpj|cpf\s+ou\s+cnpj)\s*[:=\-]?\s*[\s]*(\d[\d\.\-\/\s]{12,17}\d)/i;
  const cpfRegex = /\b(\d{3}[\.\s]?\d{3}[\.\s]?\d{3}[\-\.\s]?\d{2})\b/;
  const cnpjRegex = /\b(\d{2}[\.\s]?\d{3}[\.\s]?\d{3}[\/\.\s]?\d{4}[\-\.\s]?\d{2})\b/;

  const cnpjM = text.match(nearCnpj);
  if (cnpjM) {
    const d = cnpjM[1].replace(/\D/g, '');
    if (d.length === 14) return d;
  }
  const cpfM = text.match(nearCpf);
  if (cpfM) {
    const d = cpfM[1].replace(/\D/g, '');
    if (d.length === 11) return d;
  }

  if (text.match(/\bcnpj\b/i)) {
    const m = text.match(cnpjRegex);
    if (m) return m[0].replace(/\D/g, '');
  }
  const mCnpj = text.match(cnpjRegex);
  const mCpf = text.match(cpfRegex);
  if (mCnpj) return mCnpj[0].replace(/\D/g, '');
  if (mCpf) return mCpf[0].replace(/\D/g, '');
  return undefined;
}

/** Identifica se texto parece nome de empresa */
function looksLikeCompany(s: string): boolean {
  return /ltda|me\b|eireli|s\/a|s\.a\.|limitada|sociedade/i.test(s);
}

/**
 * Extrai nome, telefone, email, CPF/CNPJ e razão social de texto colado.
 * Aceita variações de separador (: - =), quebras de linha e ordem diferente.
 */
export function parseClientClipboard(text: string): ParseClientClipboardResult {
  const result: ParseClientClipboardResult = {};
  const raw = (text || '').trim();
  if (!raw) return result;

  const normalized = normalizeText(raw);
  const fullText = raw;

  const labelNames = ['nome completo', 'nome', 'cliente', 'responsável'];
  const labelRazao = ['razão social', 'razao social', 'empresa'];
  const labelTel = ['telefone', 'tel', 'celular', 'whatsapp', 'contato'];
  const labelEmail = ['email', 'e-mail', 'e mail'];
  const labelCpfCnpj = ['cpf ou cnpj', 'cpf', 'cnpj'];

  const byLabel = new Map<string, string>();
  for (const [labels, key] of [
    [labelNames, 'nome'],
    [labelRazao, 'razaoSocial'],
    [labelTel, 'telefone'],
    [labelEmail, 'email'],
    [labelCpfCnpj, 'cpfCnpj'],
  ] as const) {
    const m = extractByLabels(fullText, labels);
    const first = m.values().next().value;
    if (first) byLabel.set(key, first);
  }

  result.email = byLabel.get('email')?.trim() || extractEmail(fullText);

  const telFromLabel = byLabel.get('telefone');
  result.telefone = (telFromLabel && extractPhone(telFromLabel)) || extractPhone(fullText);

  result.cpfCnpj = extractCpfCnpj(fullText, extractByLabels(fullText, labelCpfCnpj));

  result.nome = byLabel.get('nome')?.trim();
  result.razaoSocial = byLabel.get('razaoSocial')?.trim();

  if (!result.nome) {
    const lines = fullText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const exclude = /^(nome|telefone|email|cpf|cnpj|razão|razao|empresa|para|poderia|informe|se for)/i;
    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        trimmed.length >= 3 &&
        !trimmed.includes('@') &&
        !/^\d[\d\.\-\/\s]+$/.test(trimmed) &&
        !exclude.test(trimmed) &&
        !PHRASE_TEMPLATE.test(trimmed)
      ) {
        if (extractEmail(trimmed) || extractPhone(trimmed)) continue;
        const noDigits = trimmed.replace(/\d/g, '');
        if (noDigits.length < 3) continue;
        result.nome = trimmed;
        break;
      }
    }
  }

  if (!result.razaoSocial && result.cpfCnpj?.length === 14 && result.nome && looksLikeCompany(result.nome)) {
    result.razaoSocial = result.nome;
  }

  return result;
}

/** Wrapper para compatibilidade: retorna nome/telefone/email/cpf_cnpj (nome = razaoSocial quando CNPJ) */
export function parseCustomerText(text: string): {
  nome?: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
} {
  const p = parseClientClipboard(text);
  const result: { nome?: string; telefone?: string; email?: string; cpf_cnpj?: string } = {};
  if (p.telefone) result.telefone = p.telefone;
  if (p.email) result.email = p.email;
  if (p.cpfCnpj) result.cpf_cnpj = p.cpfCnpj;

  if (p.cpfCnpj?.length === 14 && p.razaoSocial) {
    result.nome = p.razaoSocial;
  } else if (p.nome) {
    result.nome = p.nome;
  } else if (p.razaoSocial) {
    result.nome = p.razaoSocial;
  }

  return result;
}

// --- Exemplos para validação manual (rodar no console ou testes) ---
export const PARSE_EXAMPLES: { input: string; expected: Partial<ParseClientClipboardResult> }[] = [
  {
    input: `Para agilizar seu orçamento, poderia me enviar as informações abaixo?
Nome completo: Maria da Silva Santos
Telefone: (11) 99999-1234
Email: maria@email.com
CPF ou CNPJ: 123.456.789-00
Se for empresa, informe a razão social também.`,
    expected: { nome: 'Maria da Silva Santos', telefone: '11999991234', email: 'maria@email.com', cpfCnpj: '12345678900' },
  },
  {
    input: `Cliente: João Souza\nTel: 55 21 99876-5432\nEmail: joao@gmail.com\nCPF: 987.654.321-00`,
    expected: { nome: 'João Souza', telefone: '21998765432', email: 'joao@gmail.com', cpfCnpj: '98765432100' },
  },
  {
    input: `Nome = Ana Costa
Telefone = 11987654321
E-mail = ana.costa@empresa.com.br
CNPJ = 12.345.678/0001-90
Razão Social: Empresa ABC Ltda`,
    expected: { nome: 'Ana Costa', telefone: '11987654321', email: 'ana.costa@empresa.com.br', cpfCnpj: '12345678000190', razaoSocial: 'Empresa ABC Ltda' },
  },
  {
    input: `Email primeiro: teste@teste.com
Nome: Carlos Oliveira
(11) 91234-5678
CPF ou CNPJ: 111.222.333-44`,
    expected: { nome: 'Carlos Oliveira', telefone: '11912345678', email: 'teste@teste.com', cpfCnpj: '11122233344' },
  },
  {
    input: `Responsável - Pedro Alves
WhatsApp: 55 11 98765-4321
pedro@mail.com
CNPJ: 12.345.678/0001-99
Razao Social: Tech Solutions ME`,
    expected: { nome: 'Pedro Alves', telefone: '11987654321', email: 'pedro@mail.com', cpfCnpj: '12345678000199', razaoSocial: 'Tech Solutions ME' },
  },
  {
    input: `empresa: Construtora XYZ S/A
contato: 21988887777
email: contato@xyz.com.br
cnpj - 11222333000181`,
    expected: { razaoSocial: 'Construtora XYZ S/A', telefone: '21988887777', email: 'contato@xyz.com.br', cpfCnpj: '11222333000181' },
  },
];
