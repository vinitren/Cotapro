import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, DollarSign, TrendingUp, CheckCircle, Banknote, MessageCircle, ArrowRight, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { PageHeader } from '../components/layout/PageHeader';
import { MetricCard } from '../components/dashboard/MetricCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useStore } from '../store';
import type { Quote } from '../types';
import { formatCurrency } from '../lib/utils';
import { getFollowUpCandidates, formatTimeSince } from '../lib/dashboard-followup';
import { getBarChartData, getDonutChartData, getEmRiscoValue } from '../lib/dashboard-aggregations';
import { getMonthKey, getCurrentMonthKey } from '../lib/dashboard-date';
import { ResumoMensal, FunilMensal } from '../components/dashboard/DashboardCharts';
import { enableFollowUpSuggestions } from '../lib/supabase';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { FollowUpModal } from '../components/FollowUpModal';
import { toast } from '../hooks/useToast';

const DASHBOARD_MONTH_KEY = 'dashboard-selected-month';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/**
 * Retorna meses disponíveis com dados (quotes), ordenados do mais recente ao mais antigo.
 * Inclui o mês atual mesmo sem dados.
 * Usa getMonthKey (America/Sao_Paulo) para consistência.
 */
function getAvailableMonths<T extends { data_emissao?: string; data_criacao?: string }>(
  quotes: T[]
): { key: string; label: string }[] {
  const seen = new Set<string>();
  for (const q of quotes) {
    const dateStr = q.data_emissao ?? q.data_criacao ?? '';
    const key = getMonthKey(dateStr);
    if (key) seen.add(key);
  }
  const currentKey = getCurrentMonthKey();
  if (!seen.has(currentKey)) seen.add(currentKey);

  return [...seen]
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [y, m] = key.split('-').map(Number);
      return { key, label: `${MONTH_NAMES[m - 1]}/${y}` };
    });
}

/** Filtra orçamentos pelo mês selecionado (YYYY-MM). Usa getMonthKey (America/Sao_Paulo). */
function filterQuotesByMonth<T extends { data_emissao?: string; data_criacao?: string }>(
  quotes: T[],
  selectedMonth: string
): T[] {
  return quotes.filter((q) => {
    const key = getMonthKey(q.data_emissao ?? q.data_criacao ?? '');
    return key === selectedMonth;
  });
}

export function Dashboard() {
  const { quotes, checkExpiredQuotes, loadQuotes } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_MONTH_KEY);
      if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    } catch {
      /* ignore */
    }
    return getCurrentMonthKey();
  });

  const availableMonths = getAvailableMonths(quotes);
  const availableKeys = availableMonths.map((m) => m.key);

  useEffect(() => {
    if (availableKeys.length === 0) return;
    if (!availableKeys.includes(selectedMonth)) {
      setSelectedMonth(availableKeys[0]);
    }
  }, [availableKeys.join(','), selectedMonth]);

  useEffect(() => {
    try {
      localStorage.setItem(DASHBOARD_MONTH_KEY, selectedMonth);
    } catch {
      /* ignore */
    }
  }, [selectedMonth]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadQuotes();
        checkExpiredQuotes();
      } catch (error) {
        toast({
          title: 'Erro ao carregar dados',
          description: 'Não foi possível carregar os orçamentos. Verifique sua conexão.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadQuotes, checkExpiredQuotes]);

  const quotesInMonth = filterQuotesByMonth(quotes, selectedMonth);

  const totalQuotesThisMonth = quotesInMonth.length;

  const openValue = quotesInMonth
    .filter((q) => q.status === 'enviado')
    .reduce((sum, q) => sum + q.total, 0);

  const approvedQuotes = quotesInMonth.filter((q) => q.status === 'aprovado');
  const closedValue = approvedQuotes.reduce((sum, q) => sum + q.total, 0);
  const sentQuotes = quotesInMonth.filter((q) => q.status === 'enviado' || q.status === 'aprovado' || q.status === 'recusado');
  const approvalRate = sentQuotes.length > 0 ? (approvedQuotes.length / sentQuotes.length) * 100 : 0;

  const followUp = enableFollowUpSuggestions ? getFollowUpCandidates(quotes) : null;
  type PrioridadeCategoria = 'em-risco' | 'alto-valor' | 'vencendo' | 'todos';
  const [followUpFilter, setFollowUpFilter] = useState<PrioridadeCategoria>('todos');
  const [followUpModal, setFollowUpModal] = useState<Quote | null>(null);
  const [sentFollowUpIds, setSentFollowUpIds] = useState<Set<string>>(() => new Set());

  const baseList = followUp?.candidatesBase ?? [];
  const available = baseList.filter((c) => !sentFollowUpIds.has(c.quote.id));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPlus3 = new Date(today);
  todayPlus3.setDate(todayPlus3.getDate() + 3);

  const byPriority = (a: { quote: Quote; hoursSinceSent: number }, b: { quote: Quote; hoursSinceSent: number }) => {
    if (b.quote.total !== a.quote.total) return b.quote.total - a.quote.total;
    return b.hoursSinceSent - a.hoursSinceSent;
  };

  const emRisco = available.filter((c) => c.hoursSinceSent >= 48 && c.hoursSinceSent <= 120).sort(byPriority);
  const altoValorCount = Math.max(1, Math.ceil(available.length * 0.3));
  const altoValor = [...available]
    .sort(byPriority)
    .slice(0, altoValorCount);
  const vencendo = available.filter((c) => {
    const val = c.quote.data_validade ?? '';
    if (!val) return false;
    const validDate = new Date(val);
    validDate.setHours(0, 0, 0, 0);
    return validDate >= today && validDate <= todayPlus3;
  }).sort(byPriority);
  const todos = [...available].sort(byPriority);

  const counts = { 'em-risco': emRisco.length, 'alto-valor': altoValor.length, 'vencendo': vencendo.length, 'todos': todos.length };

  const rawByFilter: Record<PrioridadeCategoria, typeof available> = {
    'em-risco': emRisco,
    'alto-valor': altoValor,
    'vencendo': vencendo,
    'todos': todos,
  };
  const followUpList = rawByFilter[followUpFilter].slice(0, 5);

  const openFollowUpModal = (quote: Quote) => {
    setFollowUpModal(quote);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const monthOptions = availableMonths;
  const barChartData = getBarChartData(quotesInMonth);
  const donutChartData = getDonutChartData(quotesInMonth);
  const emRiscoValue = getEmRiscoValue(quotesInMonth);

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos seus orçamentos"
        action={
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] rounded-lg border border-[rgb(var(--border))] px-4 py-2 text-sm hover:bg-white/10 transition-colors">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.key} value={opt.key}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 items-stretch">
        <MetricCard
          icon={FileText}
          label="Orçamentos"
          value={totalQuotesThisMonth}
          variant="primary"
          order="order-1 lg:order-1"
        />
        <MetricCard
          icon={TrendingUp}
          label="Taxa de Aprovação"
          value={`${approvalRate.toFixed(0)}%`}
          variant="amber"
          order="order-2 lg:order-4"
        />
        <MetricCard
          icon={Banknote}
          label="Valor Aprovado"
          value={formatCurrency(closedValue)}
          variant="green"
          order="order-3 lg:order-3"
        />
        <MetricCard
          icon={DollarSign}
          label="Em Aberto"
          value={formatCurrency(openValue)}
          variant="blue"
          order="order-4 lg:order-2"
        />
        <MetricCard
          icon={CheckCircle}
          label="Aprovados"
          value={approvedQuotes.length}
          variant="emerald"
          order="order-5 lg:order-5"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Prioridades de hoje - Follow-up sugerido */}
      {enableFollowUpSuggestions && followUp && baseList.length > 0 && (
        <div className="rounded-2xl bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/30 border border-[rgb(var(--border))]/50 dark:border-[rgb(var(--border))]/40 p-5 lg:p-6">
          <div className="mb-5">
            <h2 className="text-base font-bold text-[rgb(var(--fg))]">Prioridades de hoje</h2>
            <p className="text-sm text-[rgb(var(--muted))] mt-1 dark:text-[rgb(var(--muted))]">
              Orçamentos que merecem atenção agora.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 mb-5">
            {/* Mobile: grade 2 colunas; desktop: linha */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
              {[
                { key: 'em-risco' as const, label: '🔥 Em risco', count: counts['em-risco'] },
                { key: 'alto-valor' as const, label: '💰 Alto valor', count: counts['alto-valor'] },
                { key: 'vencendo' as const, label: '⏳ Vencendo', count: counts['vencendo'] },
                { key: 'todos' as const, label: '📋 Todos', count: counts['todos'] },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFollowUpFilter(key)}
                  className={`flex items-center justify-between gap-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border transition-colors min-w-0 ${
                    followUpFilter === key
                      ? 'bg-[rgb(var(--card))] dark:bg-white/15 border-[rgb(var(--border))] dark:border-white/20 text-[rgb(var(--fg))] shadow-sm ring-2 ring-[#22C55E]/20 dark:ring-[#22C55E]/30'
                      : 'bg-[rgb(var(--card))]/70 dark:bg-white/5 border-[rgb(var(--border))]/50 dark:border-white/10 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/80 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="text-xs font-medium truncate">{label}</span>
                  <span className="text-sm font-bold tabular-nums shrink-0">{count}</span>
                </button>
              ))}
            </div>
            <Link
              to="/quotes?status=enviado"
              className="flex items-center justify-end gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-[rgb(var(--border))]/50 dark:border-white/10 bg-[rgb(var(--card))]/70 dark:bg-white/5 text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/80 dark:hover:bg-white/10 transition-colors text-xs font-medium sm:ml-auto"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {followUpList.length > 0 ? (
            <div className="space-y-1.5 sm:space-y-2">
              {followUpList.map((c) => (
                <div
                  key={c.quote.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2 px-3 sm:py-3 sm:px-4 rounded-xl bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/40 border border-[rgb(var(--border))]/40 dark:border-[rgb(var(--border))]/30 hover:bg-[rgb(var(--card))]/80 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-[rgb(var(--fg))] truncate dark:text-[rgb(var(--fg))]">
                      {c.quote.cliente?.nome ?? 'Cliente'}
                    </p>
                    {/* Mobile: valor e tempo em uma linha compacta */}
                    <p className="text-xs text-[rgb(var(--muted))] mt-0.5 sm:hidden dark:text-[rgb(var(--muted))] truncate">
                      {formatCurrency(c.quote.total)} • {formatTimeSince(c.hoursSinceSent)}
                    </p>
                    {/* Desktop: valor e tempo em linhas separadas */}
                    <p className="text-sm font-medium text-[rgb(var(--cardFg))] mt-0.5 hidden sm:block dark:text-[rgb(var(--cardFg))]">
                      {formatCurrency(c.quote.total)}
                    </p>
                    <p className="text-xs text-[rgb(var(--muted))] mt-1 hidden sm:flex items-center gap-2 flex-wrap dark:text-[rgb(var(--muted))]">
                      <span>{formatTimeSince(c.hoursSinceSent)}</span>
                      {followUpFilter !== 'todos' && (
                        <span className="inline-flex items-center rounded-md bg-[rgb(var(--border))]/30 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--muted))] dark:text-[rgb(var(--muted))]">
                          {followUpFilter === 'em-risco' && 'Em risco'}
                          {followUpFilter === 'alto-valor' && 'Alto valor'}
                          {followUpFilter === 'vencendo' && 'Vencendo'}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-2 flex-shrink-0 min-w-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 sm:h-9 text-xs w-full min-w-0 sm:w-auto"
                      onClick={() => openFollowUpModal(c.quote)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Enviar WhatsApp</span>
                    </Button>
                    <Link
                      to={`/quotes/${c.quote.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[rgb(var(--border))]/50 dark:border-white/10 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/50 dark:hover:bg-white/10 transition-colors min-w-0"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Ver orçamento</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[rgb(var(--muted))] py-4 dark:text-[rgb(var(--muted))]">
              {followUpFilter === 'em-risco' && 'Nenhum orçamento em risco no momento.'}
              {followUpFilter === 'alto-valor' && 'Nenhum orçamento de alto valor pendente.'}
              {followUpFilter === 'vencendo' && 'Nenhum orçamento vencendo em breve.'}
              {followUpFilter === 'todos' && 'Nenhum orçamento pendente de follow-up.'}
            </p>
          )}
        </div>
      )}

      {followUpModal && (
        <FollowUpModal
          isOpen={!!followUpModal}
          onClose={() => setFollowUpModal(null)}
          quote={followUpModal}
          onSent={(quoteId) => {
            setSentFollowUpIds((prev) => new Set([...prev, quoteId]));
            setFollowUpModal(null);
          }}
        />
      )}

      {/* Resumo mensal + Funil do mês — grid 2 colunas desktop, 1 coluna mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <ResumoMensal
          barData={barChartData}
          totalOrcamentos={totalQuotesThisMonth}
          taxaAprovacao={approvalRate}
        />
        <FunilMensal
          donutData={donutChartData}
          emAberto={openValue}
          aprovado={closedValue}
          emRisco={emRiscoValue}
        />
      </div>
    </div>
  );
}
