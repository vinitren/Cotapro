import type { Quote } from '../types';
import { isExpired } from './utils';

export interface FollowUpCandidate {
  quote: Quote;
  sentAt: Date;
  hoursSinceSent: number;
}

export interface FollowUpStats {
  count24h: number;
  count72h: number;
  /** Apenas itens com ageHours >= 24 */
  candidates24h: FollowUpCandidate[];
  /** Apenas itens com ageHours >= 72 */
  candidates72h: FollowUpCandidate[];
  /** Lista base de todos os candidatos (enviado, não expirado, >=24h) — para categorias estratégicas */
  candidatesBase: FollowUpCandidate[];
}

/**
 * Data de referência para "desde envio":
 * sent_at > updated_at > created_at
 */
function getSentAt(quote: Quote): Date {
  const sentAt = (quote as any).sent_at;
  if (sentAt) return new Date(sentAt);
  const updatedAt = quote.updated_at;
  if (updatedAt) return new Date(updatedAt);
  const created = quote.data_criacao ?? quote.data_emissao;
  return new Date(created || Date.now());
}

/**
 * Orçamentos que precisam de follow-up:
 * - status "enviado"
 * - não expirado (data_validade)
 * candidates24h: ageHours >= 24, ordenados do mais antigo ao mais recente
 * candidates72h: ageHours >= 72, ordenados do mais antigo ao mais recente
 */
export function getFollowUpCandidates(quotes: Quote[]): FollowUpStats {
  const now = new Date();
  const all: FollowUpCandidate[] = [];

  for (const q of quotes) {
    if (q.status !== 'enviado') continue;
    if (isExpired(q.data_validade ?? '')) continue;

    const sentAt = getSentAt(q);
    const hoursSinceSent = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);

    all.push({ quote: q, sentAt, hoursSinceSent });
  }

  const candidates24h = all
    .filter((c) => c.hoursSinceSent >= 24)
    .sort((a, b) => a.hoursSinceSent - b.hoursSinceSent);

  const candidates72h = all
    .filter((c) => c.hoursSinceSent >= 72)
    .sort((a, b) => a.hoursSinceSent - b.hoursSinceSent);

  return {
    count24h: candidates24h.length,
    count72h: candidates72h.length,
    candidates24h,
    candidates72h,
    candidatesBase: candidates24h,
  };
}

/** Formata tempo relativo: "há X dias", "há X horas" */
export function formatTimeSince(hours: number): string {
  if (hours < 1) return 'há menos de 1 hora';
  if (hours < 24) return `há ${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'há 1 dia';
  return `há ${days} dias`;
}

export const FOLLOW_UP_MESSAGE_TEMPLATE =
  'Oi {nome}, tudo bem? Você conseguiu ver o orçamento? Se quiser, ajusto qualquer detalhe e te mando a versão final agora.';

export function buildFollowUpMessage(nome: string): string {
  return FOLLOW_UP_MESSAGE_TEMPLATE.replace('{nome}', nome || '');
}
