/** Modelo de texto para envio ao cliente via WhatsApp (cadastro guiado) */
export const CUSTOMER_PASTE_MODEL = `Para agilizar seu orçamento, poderia me enviar as informações abaixo?

Nome completo:
Telefone:
Email:
CPF ou CNPJ:

Se for empresa, informe a razão social também.`;

/** Extrai nome, telefone, email e CPF/CNPJ de um bloco de texto colado */
export function parseCustomerText(text: string): {
  nome?: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
} {
  const result: { nome?: string; telefone?: string; email?: string; cpf_cnpj?: string } = {};
  const trimmed = (text || '').trim();
  if (!trimmed) return result;

  const extractLabel = (regex: RegExp): string => {
    const m = trimmed.match(regex);
    return m ? m[1].trim() : '';
  };

  const nomeCompleto = extractLabel(/Nome completo:\s*(.*)/i);
  const razaoSocial = extractLabel(/Raz[aoã]\s?social:\s*(.*)/i);
  const telefoneLabel = extractLabel(/Telefone:\s*(.*)/i);
  const emailLabel = extractLabel(/Email:\s*(.*)/i);
  const cpfCnpjLabel = extractLabel(/(?:CPF ou CNPJ|CPF|CNPJ):\s*(.*)/i);

  if (nomeCompleto) result.nome = nomeCompleto;
  else if (razaoSocial) result.nome = razaoSocial;

  if (telefoneLabel) {
    let telDigits = telefoneLabel.replace(/\D/g, '');
    if (telDigits.startsWith('55') && telDigits.length >= 12) telDigits = telDigits.slice(2);
    if (telDigits.length >= 10) result.telefone = telDigits;
  }

  if (emailLabel) result.email = emailLabel;

  if (cpfCnpjLabel) {
    const digits = cpfCnpjLabel.replace(/\D/g, '');
    if (digits.length === 11 || digits.length === 14) result.cpf_cnpj = digits;
  }

  if (!result.email) {
    const emailMatch = trimmed.match(/[^\s]+@[^\s]+\.[^\s]+/);
    if (emailMatch) result.email = emailMatch[0].trim();
  }

  if (!result.cpf_cnpj) {
    const cnpjMatch = trimmed.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    const cpfMatch = trimmed.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    if (cnpjMatch) result.cpf_cnpj = cnpjMatch[0].replace(/\D/g, '');
    else if (cpfMatch) result.cpf_cnpj = cpfMatch[0].replace(/\D/g, '');
  }

  if (!result.telefone) {
    let textForPhone = trimmed;
    const cnpjMatch = trimmed.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    const cpfMatch = trimmed.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
    if (cnpjMatch) textForPhone = textForPhone.replace(cnpjMatch[0], ' ');
    if (cpfMatch) textForPhone = textForPhone.replace(cpfMatch[0], ' ');
    let digits = textForPhone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
    const phoneMatch = digits.match(/(1[1-9]|[2-9]\d)(9\d{8}|\d{8})/);
    if (phoneMatch) result.telefone = phoneMatch[0];
  }

  if (!result.nome) {
    const cleanedText = trimmed
      .replace(/raza[oã]\s?social:/gi, '')
      .replace(/nome completo:/gi, '')
      .replace(/nome:/gi, '')
      .replace(/contato:/gi, '')
      .replace(/telefone:/gi, '')
      .replace(/email:/gi, '')
      .replace(/cnpj:/gi, '')
      .replace(/cpf:/gi, '');
    const lines = cleanedText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const invalidWords = /^(raza[oã]\s?social|nome|contato|telefone|email|cnpj|cpf)$/i;
    for (const line of lines) {
      const nome = line.trim();
      if (nome && !/\d/.test(nome) && nome.length > 2 && !nome.includes('@') && !invalidWords.test(nome)) {
        result.nome = nome;
        break;
      }
    }
  }

  return result;
}
