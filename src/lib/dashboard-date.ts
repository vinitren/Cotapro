/**
 * Helpers de data para o Dashboard, sempre no timezone America/Sao_Paulo.
 * Evita bugs de UTC (ex: criado dia 31 noite no Brasil vira dia 01 em UTC).
 */

const TZ = 'America/Sao_Paulo';

/**
 * Retorna a chave do mês (YYYY-MM) no timezone America/Sao_Paulo.
 * Aceita ISO com tempo (2025-01-31T23:30:00.000Z) ou date-only (2025-01-31).
 * Para date-only, JS interpreta como UTC meia-noite; convertemos para SP.
 */
export function getMonthKey(dateString: string): string | null {
  if (!dateString || typeof dateString !== 'string') return null;
  const trimmed = dateString.trim();
  if (!trimmed) return null;

  const date = new Date(trimmed);
  if (isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  if (!year || !month) return null;
  return `${year}-${month}`;
}

/** Retorna a chave do mês atual no timezone America/Sao_Paulo. */
export function getCurrentMonthKey(): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}
