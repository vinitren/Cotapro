import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, DollarSign, TrendingUp, CheckCircle, Banknote, MessageCircle, ArrowRight, Eye, Check, Calendar, Sparkles } from 'lucide-react';
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
import { getFollowUpCandidates, formatTimeSince, formatLastFollowUpText, formatDaysWithoutFollowUp } from '../lib/dashboard-followup';
import { getBarChartData, getDonutChartData, getEmRiscoValue } from '../lib/dashboard-aggregations';
import { getMonthKey, getCurrentMonthKey } from '../lib/dashboard-date';
import { ResumoMensal, FunilMensal } from '../components/dashboard/DashboardCharts';
import { enableFollowUpSuggestions } from '../lib/supabase';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { FollowUpModal } from '../components/FollowUpModal';
import { toast } from '../hooks/useToast';
import type { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { DateRangePicker } from '../components/quotes/DateRangePicker';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';

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

/** Filtra orçamentos por intervalo de datas (usado apenas no Dashboard, independente de Prioridades). */
function filterQuotesByDateRange<T extends { data_emissao?: string; data_criacao?: string }>(
  quotes: T[],
  range: DateRange | undefined
): T[] {
  if (!range?.from || !range?.to) return quotes;
  const fromTs = startOfDay(range.from).getTime();
  const toTs = endOfDay(range.to).getTime();
  return quotes.filter((q) => {
    const dateStr = q.data_emissao ?? q.data_criacao ?? '';
    if (!dateStr) return false;
    const t = new Date(dateStr).getTime();
    return t >= fromTs && t <= toTs;
  });
}

export function Dashboard() {
  const { quotes, checkExpiredQuotes, loadQuotes, markFollowUpSent } = useStore();
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

  const [dashboardDateRange, setDashboardDateRange] = useState<DateRange | undefined>(undefined);

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
  const quotesForDashboard =
    dashboardDateRange?.from && dashboardDateRange?.to
      ? filterQuotesByDateRange(quotes, dashboardDateRange)
      : quotesInMonth;

  const totalQuotesThisMonth = quotesForDashboard.length;

  const openValue = quotesForDashboard
    .filter((q) => q.status === 'enviado')
    .reduce((sum, q) => sum + q.total, 0);

  const approvedQuotes = quotesForDashboard.filter((q) => q.status === 'aprovado');
  const closedValue = approvedQuotes.reduce((sum, q) => sum + q.total, 0);
  const sentQuotes = quotesForDashboard.filter((q) => q.status === 'enviado' || q.status === 'aprovado' || q.status === 'recusado');
  const approvalRate = sentQuotes.length > 0 ? (approvedQuotes.length / sentQuotes.length) * 100 : 0;

  const followUp = enableFollowUpSuggestions ? getFollowUpCandidates(quotes) : null;
  type PrioridadeCategoria = 'em-risco' | 'alto-valor' | 'vencendo' | 'todos' | 'follow-up';
  const [followUpFilter, setFollowUpFilter] = useState<PrioridadeCategoria>('todos');
  const [followUpModal, setFollowUpModal] = useState<Quote | null>(null);
  const [sentFollowUpIds, setSentFollowUpIds] = useState<Set<string>>(() => new Set());
  const [prioritiesDateRange, setPrioritiesDateRange] = useState<DateRange | undefined>(undefined);

  function quoteInPrioritiesDateRange(quote: Quote): boolean {
    if (!prioritiesDateRange?.from || !prioritiesDateRange?.to) return true;
    const dateStr = quote.data_emissao ?? quote.data_criacao ?? '';
    if (!dateStr) return false;
    const t = new Date(dateStr).getTime();
    return t >= startOfDay(prioritiesDateRange.from).getTime() && t <= endOfDay(prioritiesDateRange.to).getTime();
  }

  const baseList = followUp?.candidatesBase ?? [];
  const available = baseList.filter((c) => !sentFollowUpIds.has(c.quote.id));

  const quotesWithFollowUp = quotes
    .filter((q): q is Quote & { last_follow_up_at: string } => Boolean(q.last_follow_up_at))
    .sort((a, b) => new Date(b.last_follow_up_at).getTime() - new Date(a.last_follow_up_at).getTime());

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayPlus3 = new Date(today);
  todayPlus3.setDate(todayPlus3.getDate() + 3);

  const byPriority = (a: { quote: Quote; hoursSinceSent: number }, b: { quote: Quote; hoursSinceSent: number }) => {
    if (b.quote.total !== a.quote.total) return b.quote.total - a.quote.total;
    return b.hoursSinceSent - a.hoursSinceSent;
  };

  const quotesWithFollowUpInRange =
    followUpFilter === 'follow-up' && prioritiesDateRange?.from && prioritiesDateRange?.to
      ? quotesWithFollowUp.filter((q) => quoteInPrioritiesDateRange(q))
      : quotesWithFollowUp;

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

  const counts = { 'em-risco': emRisco.length, 'alto-valor': altoValor.length, 'vencendo': vencendo.length, 'todos': todos.length, 'follow-up': quotesWithFollowUpInRange.length };

  const rawByFilter: Record<Exclude<PrioridadeCategoria, 'follow-up'>, typeof available> = {
    'em-risco': emRisco,
    'alto-valor': altoValor,
    'vencendo': vencendo,
    'todos': todos,
  };
  const quotesWithFollowUpFiltered = quotesWithFollowUpInRange;

  type PrioridadeDisplayItem = { quote: Quote; subtitle: string };
  const followUpListDisplay: PrioridadeDisplayItem[] =
    followUpFilter === 'follow-up'
      ? quotesWithFollowUpFiltered.map((q) => ({ quote: q, subtitle: formatLastFollowUpText(q.last_follow_up_at) }))
      : rawByFilter[followUpFilter].map((c) => ({
          quote: c.quote,
          subtitle: formatDaysWithoutFollowUp(c.hoursSinceSent),
        }));

  const openFollowUpModal = (quote: Quote) => {
    setFollowUpModal(quote);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const monthOptions = availableMonths;
  const barChartData = getBarChartData(quotesForDashboard);
  const donutChartData = getDonutChartData(quotesForDashboard);
  const emRiscoValue = getEmRiscoValue(quotesForDashboard);

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos seus orçamentos"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]/50 text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/80 transition-colors text-sm font-medium"
                >
                  <Calendar className="h-4 w-4 shrink-0" />
                  {dashboardDateRange?.from && dashboardDateRange?.to
                    ? `${format(dashboardDateRange.from, 'dd/MM/yyyy')} - ${format(dashboardDateRange.to, 'dd/MM/yyyy')}`
                    : 'Período'}
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-[min(90vw,36rem)]">
                <DialogTitle className="sr-only">Filtrar Dashboard por período</DialogTitle>
                <DateRangePicker
                  value={dashboardDateRange}
                  onChange={(range) => setDashboardDateRange(range ?? undefined)}
                  onClear={() => setDashboardDateRange(undefined)}
                />
              </DialogContent>
            </Dialog>
            {dashboardDateRange?.from && dashboardDateRange?.to && (
              <button
                type="button"
                onClick={() => setDashboardDateRange(undefined)}
                className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] underline"
              >
                Limpar
              </button>
            )}
          </div>
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

      {/* Assistente CotaPro - recuperação inteligente de orçamentos */}
      {enableFollowUpSuggestions && (
        <div className="rounded-2xl bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/30 border border-[rgb(var(--border))]/50 dark:border-[rgb(var(--border))]/40 overflow-hidden">
          {/* 1. Header */}
          <div className="p-5 lg:p-6 pb-4 border-b border-[rgb(var(--border))]/40 dark:border-white/10">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 dark:bg-primary/20 text-primary">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[rgb(var(--fg))]">Assistente Cota<span className="text-primary">Pro</span></h2>
                <p className="text-sm text-[rgb(var(--muted))] mt-0.5 dark:text-[rgb(var(--muted))]">
                  Recuperação inteligente de orçamentos
                </p>
              </div>
            </div>
          </div>

          {quotes.length === 0 ? (
          /* Estado 1: usuário sem orçamentos */
          <div className="flex flex-col items-center justify-center text-center px-5 py-8 lg:py-10 min-h-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 dark:bg-primary/20 text-primary mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-[rgb(var(--fg))] dark:text-[rgb(var(--fg))] mb-2">
              Seu assistente vai aparecer aqui
            </h3>
            <p className="text-sm text-[rgb(var(--muted))] dark:text-[rgb(var(--muted))] max-w-sm mb-5">
              Crie seus primeiros orçamentos para começar a usar o assistente.
            </p>
            <Link to="/quotes/new">
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                Criar primeiro orçamento
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          ) : (baseList.length > 0 || quotesWithFollowUp.length > 0) ? (
          /* Estado 3: assistente ativo — existem orçamentos que precisam de atenção */
          <>
          {/* 2. Filtros de status + período (quando Follow-up) */}
          <div className="px-5 lg:px-6 py-4 space-y-4 border-b border-[rgb(var(--border))]/30 dark:border-white/5">
            {followUpFilter === 'follow-up' && (
              <div className="flex flex-wrap items-center gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgb(var(--border))]/50 dark:border-white/10 bg-[rgb(var(--card))]/70 dark:bg-white/5 text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/80 dark:hover:bg-white/10 transition-colors text-xs font-medium"
                    >
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      {prioritiesDateRange?.from && prioritiesDateRange?.to
                        ? `${format(prioritiesDateRange.from, 'dd/MM/yyyy')} - ${format(prioritiesDateRange.to, 'dd/MM/yyyy')}`
                        : 'Período'}
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[min(90vw,36rem)]">
                    <DialogTitle className="sr-only">Filtrar prioridades por período</DialogTitle>
                    <DateRangePicker
                      value={prioritiesDateRange}
                      onChange={(range) => setPrioritiesDateRange(range ?? undefined)}
                      onClear={() => setPrioritiesDateRange(undefined)}
                    />
                  </DialogContent>
                </Dialog>
                {prioritiesDateRange?.from && prioritiesDateRange?.to && (
                  <button
                    type="button"
                    onClick={() => setPrioritiesDateRange(undefined)}
                    className="text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] underline"
                  >
                    Limpar período
                  </button>
                )}
              </div>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
                {[
                  { key: 'em-risco' as const, label: '🔥 Em risco', count: counts['em-risco'], activeCls: 'bg-amber-500/20 dark:bg-amber-500/25 border-amber-500/40 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/30', inactiveCls: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/15 dark:hover:bg-amber-500/20' },
                  { key: 'alto-valor' as const, label: '💰 Alto valor', count: counts['alto-valor'], activeCls: 'bg-emerald-500/20 dark:bg-emerald-500/25 border-emerald-500/40 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/30', inactiveCls: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/25 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 dark:hover:bg-emerald-500/20' },
                  { key: 'vencendo' as const, label: '⏳ Vencendo', count: counts['vencendo'], activeCls: 'bg-sky-500/20 dark:bg-sky-500/25 border-sky-500/40 text-sky-800 dark:text-sky-200 ring-2 ring-sky-500/30', inactiveCls: 'bg-sky-500/10 dark:bg-sky-500/15 border-sky-500/25 text-sky-700 dark:text-sky-300 hover:bg-sky-500/15 dark:hover:bg-sky-500/20' },
                  { key: 'todos' as const, label: '📋 Todos', count: counts['todos'], activeCls: 'bg-slate-500/20 dark:bg-slate-400/20 border-slate-500/40 text-slate-800 dark:text-slate-200 ring-2 ring-slate-500/30', inactiveCls: 'bg-slate-500/10 dark:bg-slate-400/10 border-slate-500/25 text-slate-700 dark:text-slate-300 hover:bg-slate-500/15 dark:hover:bg-slate-400/15' },
                  { key: 'follow-up' as const, label: '✓ Follow-up', count: counts['follow-up'], activeCls: 'bg-green-500/20 dark:bg-green-500/25 border-green-500/40 text-green-800 dark:text-green-200 ring-2 ring-green-500/30', inactiveCls: 'bg-green-500/10 dark:bg-green-500/15 border-green-500/25 text-green-700 dark:text-green-300 hover:bg-green-500/15 dark:hover:bg-green-500/20' },
                ].map(({ key, label, count, activeCls, inactiveCls }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFollowUpFilter(key)}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border font-medium transition-colors min-w-0 text-xs sm:text-sm ${followUpFilter === key ? activeCls : inactiveCls}`}
                  >
                    <span className="truncate">{label}</span>
                    <span className="text-sm font-bold tabular-nums shrink-0">{count}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Lista de orçamentos */}
          <div className="p-5 lg:p-6 pt-4">
          {followUpListDisplay.length > 0 ? (
            <div className="overflow-y-auto max-h-[15rem] sm:max-h-[22rem] scrollbar-thin rounded-lg -mx-1 px-1">
              <div className="space-y-1.5 sm:space-y-2">
              {followUpListDisplay.map((item) => (
                <div
                  key={item.quote.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 py-2 px-3 sm:py-3 sm:px-4 rounded-xl bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/40 border border-[rgb(var(--border))]/40 dark:border-[rgb(var(--border))]/30 hover:bg-[rgb(var(--card))]/80 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-[rgb(var(--fg))] truncate dark:text-[rgb(var(--fg))]">
                      {item.quote.cliente?.nome ?? 'Cliente'}
                    </p>
                    {/* Mobile: valor e subtítulo em uma linha compacta */}
                    <p className="text-xs text-[rgb(var(--muted))] mt-0.5 sm:hidden dark:text-[rgb(var(--muted))] truncate">
                      {formatCurrency(item.quote.total)} •{' '}
                      <span className={item.subtitle.startsWith('⚠') ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>
                        {item.subtitle}
                      </span>
                      {item.quote.last_follow_up_at && followUpFilter !== 'follow-up' ? ` • ${formatLastFollowUpText(item.quote.last_follow_up_at)}` : ''}
                    </p>
                    {/* Desktop: valor e subtítulo em linhas separadas */}
                    <p className="text-sm font-medium text-[rgb(var(--cardFg))] mt-0.5 hidden sm:block dark:text-[rgb(var(--cardFg))]">
                      {formatCurrency(item.quote.total)}
                    </p>
                    <p className="text-xs text-[rgb(var(--muted))] mt-1 hidden sm:flex items-center gap-2 flex-wrap dark:text-[rgb(var(--muted))]">
                      <span className={item.subtitle.startsWith('⚠') ? 'font-semibold text-amber-600 dark:text-amber-400' : ''}>
                        {item.subtitle}
                      </span>
                      {followUpFilter !== 'todos' && followUpFilter !== 'follow-up' && (
                        <span className="inline-flex items-center rounded-md bg-[rgb(var(--border))]/30 dark:bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-[rgb(var(--muted))] dark:text-[rgb(var(--muted))]">
                          {followUpFilter === 'em-risco' && 'Em risco'}
                          {followUpFilter === 'alto-valor' && 'Alto valor'}
                          {followUpFilter === 'vencendo' && 'Vencendo'}
                        </span>
                      )}
                      {followUpFilter !== 'follow-up' && item.quote.last_follow_up_at && (
                        <span className="text-[rgb(var(--muted))] dark:text-[rgb(var(--muted))]">
                          • {formatLastFollowUpText(item.quote.last_follow_up_at)}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex gap-2 flex-shrink-0 min-w-0 flex-wrap">
                    <Button
                      size="sm"
                      variant="default"
                      className="gap-1.5 h-8 sm:h-9 text-xs w-full min-w-0 sm:w-auto bg-[#22C55E] hover:bg-[#1ea34e] text-white"
                      onClick={() => openFollowUpModal(item.quote)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Enviar follow-up</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 h-8 sm:h-9 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] min-w-0 sm:w-auto"
                      onClick={async () => {
                        try {
                          await markFollowUpSent(item.quote.id);
                          setSentFollowUpIds((prev) => new Set([...prev, item.quote.id]));
                        } catch {
                          toast({
                            title: 'Erro ao marcar',
                            description: 'Não foi possível salvar. Tente novamente.',
                            variant: 'destructive',
                          });
                        }
                      }}
                    >
                      <Check className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Marcar como feito</span>
                    </Button>
                    <Link
                      to={`/quotes/${item.quote.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[rgb(var(--border))]/50 dark:border-white/10 bg-transparent px-2 sm:px-3 py-1.5 sm:py-2 h-8 sm:h-9 text-xs font-medium text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/50 dark:hover:bg-white/10 transition-colors min-w-0"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">Ver orçamento</span>
                    </Link>
                  </div>
                </div>
              ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[rgb(var(--muted))] py-4 dark:text-[rgb(var(--muted))]">
              {followUpFilter === 'em-risco' && 'Nenhum orçamento em risco no momento.'}
              {followUpFilter === 'alto-valor' && 'Nenhum orçamento de alto valor pendente.'}
              {followUpFilter === 'vencendo' && 'Nenhum orçamento vencendo em breve.'}
              {followUpFilter === 'todos' && 'Nenhum orçamento pendente de follow-up.'}
              {followUpFilter === 'follow-up' && 'Nenhum orçamento com follow-up neste período.'}
            </p>
          )}

          {/* 4. Ver todos */}
          <div className="mt-4 pt-4 border-t border-[rgb(var(--border))]/30 dark:border-white/5 flex justify-end">
            <Link
              to="/quotes?status=enviado"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgb(var(--border))]/50 dark:border-white/10 bg-[rgb(var(--card))]/70 dark:bg-white/5 text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/80 dark:hover:bg-white/10 transition-colors text-sm font-medium"
            >
              Ver todos
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          </div>
          </>
          ) : (
          /* Estado 2: usuário tem orçamentos, mas ainda não há prioridades reais */
          <div className="flex flex-col items-center justify-center text-center px-5 py-8 lg:py-10 min-h-0">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 dark:bg-primary/20 text-primary mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-[rgb(var(--fg))] dark:text-[rgb(var(--fg))] mb-2">
              O assistente está aprendendo
            </h3>
            <p className="text-sm text-[rgb(var(--muted))] dark:text-[rgb(var(--muted))] max-w-sm">
              Continue criando e enviando orçamentos para que o CotaPro possa identificar oportunidades e prioridades.
            </p>
          </div>
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
    </div>
  );
}
