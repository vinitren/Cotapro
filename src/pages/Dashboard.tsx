import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileText, DollarSign, TrendingUp, CheckCircle, Banknote, MessageCircle, ArrowRight } from 'lucide-react';
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
import { formatCurrency } from '../lib/utils';
import { getFollowUpCandidates, formatTimeSince, buildFollowUpMessage } from '../lib/dashboard-followup';
import { getBarChartData, getDonutChartData, getEmRiscoValue } from '../lib/dashboard-aggregations';
import { ResumoMensal, FunilMensal } from '../components/dashboard/DashboardCharts';
import { enableFollowUpSuggestions } from '../lib/supabase';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { toast } from '../hooks/useToast';

const DASHBOARD_MONTH_KEY = 'dashboard-selected-month';

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function getMonthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const options: { value: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const value = `${y}-${String(m + 1).padStart(2, '0')}`;
    const label = `${MONTH_NAMES[m]}/${y}`;
    options.push({ value, label });
  }
  return options;
}

function getDefaultMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/** Filtra orçamentos pelo mês selecionado (YYYY-MM). Usa data_emissao ou data_criacao. Fuso local. */
function filterQuotesByMonth<T extends { data_emissao?: string; data_criacao?: string }>(
  quotes: T[],
  selectedMonth: string
): T[] {
  const [yearStr, monthStr] = selectedMonth.split('-');
  const targetYear = parseInt(yearStr, 10);
  const targetMonth = parseInt(monthStr, 10) - 1; // 0-indexed
  return quotes.filter((q) => {
    const dateStr = q.data_emissao ?? q.data_criacao ?? '';
    if (!dateStr) return false;
    const date = new Date(dateStr);
    return date.getFullYear() === targetYear && date.getMonth() === targetMonth;
  });
}

export function Dashboard() {
  const navigate = useNavigate();
  const { quotes, checkExpiredQuotes, loadQuotes } = useStore();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(DASHBOARD_MONTH_KEY);
      if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved;
    } catch {
      /* ignore */
    }
    return getDefaultMonth();
  });

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
  const [followUpFilter, setFollowUpFilter] = useState<'24h' | '72h'>('24h');
  const followUpList = followUp
    ? (followUpFilter === '72h' ? followUp.candidates72h : followUp.candidates24h).slice(0, 5)
    : [];

  const handleFollowUpWhatsApp = (quote: (typeof followUpList)[0]) => {
    const telefone = quote.quote.cliente?.telefone?.replace(/\D/g, '') ?? '';
    if (telefone.length >= 10) {
      const num = telefone.startsWith('55') ? telefone : `55${telefone}`;
      const msg = buildFollowUpMessage(quote.quote.cliente?.nome ?? '');
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      navigate(`/quotes/${quote.quote.id}`);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const monthOptions = getMonthOptions();
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
                <SelectItem key={opt.value} value={opt.value}>
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
      {enableFollowUpSuggestions && followUp && (followUp.count24h > 0 || followUp.count72h > 0) && (
        <div className="rounded-2xl bg-[rgb(var(--card))]/50 border border-[rgb(var(--border))]/40 p-4 lg:p-6">
          <h2 className="text-base font-bold text-[rgb(var(--fg))] mb-4">Prioridades de hoje</h2>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              type="button"
              onClick={() => setFollowUpFilter('24h')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                followUpFilter === '24h'
                  ? 'bg-[rgb(var(--card))] dark:bg-[rgb(var(--card))]/80 border-[rgb(var(--border))] text-[rgb(var(--fg))] shadow-sm'
                  : 'bg-[rgb(var(--card))]/60 dark:bg-[rgb(var(--card))]/40 border-[rgb(var(--border))]/40 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]'
              }`}
            >
              <span className="text-xs font-medium">Enviados há +24h</span>
              <span className="text-sm font-bold tabular-nums">{followUp.count24h}</span>
            </button>
            <button
              type="button"
              onClick={() => setFollowUpFilter('72h')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                followUpFilter === '72h'
                  ? 'bg-[rgb(var(--card))] dark:bg-[rgb(var(--card))]/80 border-[rgb(var(--border))] text-[rgb(var(--fg))] shadow-sm'
                  : 'bg-[rgb(var(--card))]/60 dark:bg-[rgb(var(--card))]/40 border-[rgb(var(--border))]/40 text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))]'
              }`}
            >
              <span className="text-xs font-medium">Enviados há +72h</span>
              <span className="text-sm font-bold tabular-nums">{followUp.count72h}</span>
            </button>
            <Link
              to="/quotes?status=enviado"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[rgb(var(--border))]/40 bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/40 text-[rgb(var(--fg))] hover:bg-[rgb(var(--card))]/70 dark:hover:bg-[rgb(var(--card))]/60 transition-colors text-xs font-medium"
            >
              Ver todos
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {followUpList.length > 0 ? (
            <div className="space-y-1.5">
              {followUpList.map((c) => (
                <div
                  key={c.quote.id}
                  className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl bg-[rgb(var(--card))]/50 dark:bg-[rgb(var(--card))]/40 border border-[rgb(var(--border))]/40 hover:bg-[rgb(var(--card))]/70 dark:hover:bg-[rgb(var(--card))]/60 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[rgb(var(--fg))] truncate">
                      {c.quote.cliente?.nome ?? 'Cliente'}
                    </p>
                    <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                      {formatCurrency(c.quote.total)} · {formatTimeSince(c.hoursSinceSent)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0 gap-1.5 h-8 text-xs"
                    onClick={() => handleFollowUpWhatsApp(c)}
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Enviar WhatsApp
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[rgb(var(--muted))] py-2">
              {followUpFilter === '72h'
                ? 'Nenhum orçamento enviado há mais de 72h.'
                : 'Nenhum orçamento enviado há mais de 24h.'}
            </p>
          )}
        </div>
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
