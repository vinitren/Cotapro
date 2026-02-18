/**
 * Geração de payload Pix (BR Code) no padrão EMV.
 * Formato estático sem valor fixo — pagador insere o valor no app.
 * CRC16/CCITT-FALSE: polinômio 0x1021, inicial 0xFFFF.
 */

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * CRC16/CCITT-FALSE (polinômio 0x1021, inicial 0xFFFF).
 * Usado pelo padrão Pix para validar integridade do payload.
 */
function crc16ccitt(str: string): number {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i) & 0xff;
    crc ^= byte << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
      crc &= 0xffff;
    }
  }
  return crc;
}

/**
 * Remove formatação da chave Pix para o payload.
 * CPF/CNPJ/telefone: apenas dígitos.
 * Email/chave aleatória: mantém formato.
 */
function sanitizePixKey(key: string, type?: string): string {
  const k = key.trim();
  if (type === 'email' || k.includes('@')) {
    return k.replace(/\s/g, '');
  }
  if (type === 'aleatoria' || /^[0-9a-f-]{36}$/i.test(k)) {
    return k.replace(/\s/g, '');
  }
  return k.replace(/\D/g, '');
}

/**
 * Remove acentos e caracteres especiais para compatibilidade EMV.
 * Nome e cidade devem ser ASCII simples (até 25 e 15 caracteres respectivamente).
 */
function sanitizeForEmv(s: string, maxLen: number): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

export interface GeneratePixPayloadParams {
  key: string;
  name: string;
  city?: string | null;
  /** Tipo da chave (cpf_cnpj, email, telefone, aleatoria) para sanitização correta */
  type?: string;
}

/**
 * Gera payload Pix (copia e cola) no padrão EMV BR Code.
 * Sem valor fixo — pagador define o valor no app.
 *
 * @param key - Chave Pix (CPF, CNPJ, email, telefone ou aleatória)
 * @param name - Nome do recebedor (até 25 caracteres)
 * @param city - Cidade do titular (até 15 caracteres, opcional)
 */
export function generatePixPayload({ key, name, city, type }: GeneratePixPayloadParams): string {
  const pixKey = sanitizePixKey(key, type);
  const merchantName = sanitizeForEmv(name.trim(), 25) || 'RECEBEDOR';
  const merchantCity = city ? sanitizeForEmv(city.trim(), 15) : 'SAO PAULO';

  if (!pixKey) {
    throw new Error('Chave Pix é obrigatória');
  }

  // 00 - Payload Format Indicator (01 = EMV versão 01)
  const payloadFormat = '000201';

  // 26 - Merchant Account Information (Pix)
  // Subcampo 00: GUI BR.GOV.BCB.PIX
  // Subcampo 01: Chave Pix
  const gui = '0014BR.GOV.BCB.PIX';
  const keyPart = '01' + pad2(pixKey.length) + pixKey;
  const merchantAccount = '26' + pad2(gui.length + keyPart.length) + gui + keyPart;

  // 52 - Merchant Category Code (0000 = não especificado)
  const mcc = '52040000';

  // 53 - Transaction Currency (986 = BRL)
  const currency = '5303986';

  // 54 omitido — valor em aberto

  // 58 - Country Code
  const country = '5802BR';

  // 59 - Merchant Name
  const nameField = '59' + pad2(merchantName.length) + merchantName;

  // 60 - Merchant City
  const cityField = '60' + pad2(merchantCity.length) + merchantCity;

  // 62 - Additional Data (TXID *** = sem referência)
  const additionalData = '62070503***';

  // Monta payload sem CRC
  const payloadWithoutCrc =
    payloadFormat + merchantAccount + mcc + currency + country + nameField + cityField + additionalData;

  // 63 - CRC16 (calculado sobre payload + "6304")
  const payloadForCrc = payloadWithoutCrc + '6304';
  const crc = crc16ccitt(payloadForCrc);
  const crcHex = crc.toString(16).toUpperCase().padStart(4, '0');
  const crcField = '6304' + crcHex;

  return payloadWithoutCrc + crcField;
}
