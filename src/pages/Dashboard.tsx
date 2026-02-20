import { useEffect, useState } from 'react';
import { FileText, DollarSign, TrendingUp, CheckCircle, Banknote, User, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/badge';
import { MetricCard } from '../components/dashboard/MetricCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useStore } from '../store';
import { formatCurrency, getStatusLabel, isExpired } from '../lib/utils';
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

  const statusCounts = {
    rascunho: quotesInMonth.filter((q) => q.status === 'rascunho').length,
    enviado: quotesInMonth.filter((q) => q.status === 'enviado').length,
    aprovado: quotesInMonth.filter((q) => q.status === 'aprovado').length,
    recusado: quotesInMonth.filter((q) => q.status === 'recusado').length,
    expirado: quotesInMonth.filter((q) => q.status === 'expirado').length,
  };

  const [topLimit, setTopLimit] = useState(5);
  const [topClientesFilter, setTopClientesFilter] = useState<'diario' | 'semanal' | 'mensal'>('mensal');
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setTopLimit(mq.matches ? 5 : 3);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const topClientesFechadoMap = new Map<string, { nome: string; total: number }>();
  for (const q of approvedQuotes) {
    const id = q.cliente_id ?? q.cliente?.nome ?? '';
    const nome = q.cliente?.nome ?? 'Cliente';
    const current = topClientesFechadoMap.get(id) ?? { nome, total: 0 };
    topClientesFechadoMap.set(id, { nome: current.nome, total: current.total + q.total });
  }
  const topClientesFechado = [...topClientesFechadoMap.entries()]
    .map(([id, data]) => ({ id, nome: data.nome, total: data.total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topLimit);

  const maioresEmAberto = quotesInMonth
    .filter((q) => q.status === 'enviado' && !isExpired(q.data_validade ?? ''))
    .sort((a, b) => b.total - a.total)
    .slice(0, topLimit);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  const monthOptions = getMonthOptions();

  const getRankStyle = (idx: number) => {
    if (idx === 0) return 'bg-emerald-50/70 border border-emerald-200/50 rounded-xl hover:bg-emerald-50/90 transition-colors';
    if (idx === 1) return 'bg-emerald-50/50 border border-emerald-200/40 rounded-xl hover:bg-emerald-50/80 transition-colors';
    if (idx === 2) return 'bg-emerald-50/40 border border-emerald-200/30 rounded-xl hover:bg-emerald-50/70 transition-colors';
    return 'bg-slate-50/50 border border-slate-200/40 rounded-xl hover:bg-slate-100/60 transition-colors';
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral dos seus orçamentos"
        action={
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px] rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
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

      {/* Grid: Desktop = Status (60%) | Top Clientes + Maiores valores (40%). Mobile = empilhado */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-50/50 via-white/70 to-slate-50/40 p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Orçamentos por Status — maior no desktop */}
          <Card className="lg:col-span-7 rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
            <CardHeader className="p-5 pb-4 border-b border-slate-200/60">
              <CardTitle className="text-base font-bold text-gray-900">Orçamentos por Status</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-4 space-y-5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <div key={status} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-slate-600">
                        {getStatusLabel(status)}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 tabular-nums">{count}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all shadow-sm ${
                          status === 'rascunho'
                            ? 'bg-gradient-to-r from-gray-400 to-gray-500'
                            : status === 'enviado'
                            ? 'bg-gradient-to-r from-blue-400 to-blue-600'
                            : status === 'aprovado'
                            ? 'bg-gradient-to-r from-primary-400 to-primary-600'
                            : status === 'recusado'
                            ? 'bg-gradient-to-r from-red-400 to-red-600'
                            : 'bg-gradient-to-r from-amber-400 to-amber-600'
                        }`}
                        style={{
                          width: `${quotesInMonth.length > 0 ? (count / quotesInMonth.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Coluna direita: Top Clientes + Maiores valores empilhados */}
          <div className="lg:col-span-5 flex flex-col gap-4 lg:gap-6">
            <Card className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
              <CardHeader className="p-5 pb-4 border-b border-slate-200/60">
                <div className="flex items-center justify-between gap-2 min-h-0">
                  <CardTitle className="text-base font-bold text-gray-900">Top Clientes</CardTitle>
                  <div className="flex-shrink-0">
                    <div className="hidden sm:flex rounded-lg bg-slate-100/80 p-0.5">
                      {(['diario', 'semanal', 'mensal'] as const).map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setTopClientesFilter(v)}
                          className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                            topClientesFilter === v
                              ? 'bg-white text-slate-700 shadow-sm'
                              : 'text-slate-500 hover:text-slate-600'
                          }`}
                        >
                          {v === 'diario' ? 'Diário' : v === 'semanal' ? 'Semanal' : 'Mensal'}
                        </button>
                      ))}
                    </div>
                    <div className="sm:hidden">
                      <Select value={topClientesFilter} onValueChange={(v) => setTopClientesFilter(v as typeof topClientesFilter)}>
                        <SelectTrigger className="h-7 w-[88px] text-[10px] px-2 py-1 border-slate-200/60">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="diario">Diário</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="mensal">Mensal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                {topClientesFechado.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">Sem vendas fechadas neste mês.</p>
                ) : (
                  <div className="space-y-1.5">
                    {topClientesFechado.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between gap-2 py-2 px-3 ${getRankStyle(idx)}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                            <User className="h-4 w-4 text-white" />
                          </div>
                          <p className="text-xs font-medium text-slate-800 truncate">{item.nome}</p>
                        </div>
                        <span className="text-xs font-semibold text-slate-800 tabular-nums flex-shrink-0">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)]">
              <CardHeader className="p-5 pb-4 border-b border-slate-200/60">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base font-bold text-gray-900">Maiores valores em aberto</CardTitle>
                  <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-[10px] font-medium bg-primary-100/80 text-primary-700 border-0">Follow-up</Badge>
                </div>
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs font-medium text-slate-600">Envie uma mensagem em orçamentos.</p>
                  <p className="text-[10px] text-slate-500">Em breve: recupere automaticamente com o Assistente Inteligente CotaPro.</p>
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-4">
                {maioresEmAberto.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">Nenhum valor em aberto neste mês.</p>
                ) : (
                  <div className="space-y-1.5">
                    {maioresEmAberto.map((q, idx) => (
                      <div
                        key={q.id}
                        className={`flex items-center justify-between gap-2 py-2 px-3 ${getRankStyle(idx)}`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-gradient-to-br from-emerald-500 to-blue-500 flex items-center justify-center">
                            <AlertCircle className="h-4 w-4 text-white" />
                          </div>
                          <p className="text-xs font-medium text-slate-800 truncate">
                            {q.cliente?.nome ?? 'Cliente'}
                          </p>
                        </div>
                        <span className="text-xs font-semibold text-slate-800 tabular-nums flex-shrink-0">
                          {formatCurrency(q.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
