import type { Quote } from '../types';
import { isExpired } from './utils';

/** Agregação por status para o mês */
export interface MonthlyStatusAgg {
  enviado: number;
  aprovado: number;
  recusado: number;
  outros: number;
}

/** Dados para bar chart (Enviados, Aprovados, Recusados) */
export interface BarChartData {
  name: string;
  count: number;
  fill: string;
}

/** Dados para donut chart */
export interface DonutChartData {
  name: string;
  value: number;
  fill: string;
}

function getSentAt(quote: Quote): Date {
  const sentAt = (quote as any).sent_at;
  if (sentAt) return new Date(sentAt);
  const updatedAt = quote.updated_at;
  if (updatedAt) return new Date(updatedAt);
  const created = quote.data_criacao ?? quote.data_emissao;
  return new Date(created || Date.now());
}

/** Agrupa orçamentos por status no mês */
export function aggregateByStatus(quotes: Quote[]): MonthlyStatusAgg {
  const agg: MonthlyStatusAgg = { enviado: 0, aprovado: 0, recusado: 0, outros: 0 };
  for (const q of quotes) {
    if (q.status === 'enviado') agg.enviado++;
    else if (q.status === 'aprovado') agg.aprovado++;
    else if (q.status === 'recusado') agg.recusado++;
    else agg.outros++;
  }
  return agg;
}

/** Dados para bar chart mensal */
export function getBarChartData(quotes: Quote[]): BarChartData[] {
  const agg = aggregateByStatus(quotes);
  return [
    { name: 'Enviados', count: agg.enviado, fill: '#3b82f6' },
    { name: 'Aprovados', count: agg.aprovado, fill: '#22c55e' },
    { name: 'Recusados', count: agg.recusado, fill: '#ef4444' },
  ];
}

/** Dados para donut (Enviado azul, Aprovado verde, Outros cinza) */
export function getDonutChartData(quotes: Quote[]): DonutChartData[] {
  const agg = aggregateByStatus(quotes);
  const data: DonutChartData[] = [];
  if (agg.enviado > 0) data.push({ name: 'Enviado', value: agg.enviado, fill: '#3b82f6' });
  if (agg.aprovado > 0) data.push({ name: 'Aprovado', value: agg.aprovado, fill: '#22c55e' });
  if (agg.outros + agg.recusado > 0) {
    data.push({ name: 'Outros', value: agg.outros + agg.recusado, fill: '#6b7280' });
  }
  return data.length > 0 ? data : [{ name: 'Nenhum', value: 1, fill: '#6b7280' }];
}

/** Em risco = enviados há +72h e não aprovados (valor total) */
export function getEmRiscoValue(quotes: Quote[]): number {
  const now = new Date();
  return quotes
    .filter((q) => {
      if (q.status !== 'enviado') return false;
      if (isExpired(q.data_validade ?? '')) return false;
      const sentAt = getSentAt(q);
      const hours = (now.getTime() - sentAt.getTime()) / (1000 * 60 * 60);
      return hours >= 72;
    })
    .reduce((sum, q) => sum + q.total, 0);
}
