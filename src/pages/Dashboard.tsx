import { useEffect, useState } from 'react';
import { FileText, DollarSign, TrendingUp, CheckCircle, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
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
    if (idx === 0) return 'bg-green-100/80 border border-green-200/60 rounded-md';
    if (idx === 1) return 'bg-green-100/50 border border-green-200/40 rounded-md';
    if (idx === 2) return 'bg-green-100/30 border border-green-200/30 rounded-md';
    return 'hover:bg-gray-50/80 rounded-md';
  };
  const getMedal = (idx: number) => (idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '');

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm">Visão geral dos seus orçamentos</p>
        </div>
        <div className="flex-shrink-0 w-full lg:w-auto">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
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
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 items-stretch">
        {/* 1. Orçamentos — sempre primeiro */}
        <Card className="order-1 lg:order-1 h-full flex flex-col">
          <CardContent className="p-3 lg:p-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-primary-100 order-1 md:order-2 self-end md:self-auto mb-2 md:mb-0">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex flex-col justify-center min-w-0 order-2 md:order-1">
                <p className="text-lg font-bold text-gray-900">Orçamentos</p>
                <p className="text-xl sm:text-2xl font-bold leading-none mt-1 text-green-600 tracking-tight">
                  {totalQuotesThisMonth}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. Taxa de Aprovação — mobile: 2º | desktop: 4º */}
        <Card className="order-2 lg:order-4 h-full flex flex-col">
          <CardContent className="p-3 lg:p-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-amber-100 order-1 md:order-2 self-end md:self-auto mb-2 md:mb-0">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
              </div>
              <div className="flex flex-col justify-center min-w-0 order-2 md:order-1">
                <p className="text-lg font-bold text-gray-900 whitespace-nowrap md:whitespace-normal">Taxa de Aprovação</p>
                <p className="text-xl sm:text-2xl font-bold leading-none mt-1 text-green-600 tracking-tight">
                  {approvalRate.toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. Valor Aprovado — mobile: 3º | desktop: 3º */}
        <Card className="order-3 lg:order-3 h-full flex flex-col">
          <CardContent className="p-3 lg:p-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-green-100 order-1 md:order-2 self-end md:self-auto mb-2 md:mb-0">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              </div>
              <div className="flex flex-col justify-center min-w-0 order-2 md:order-1">
                <p className="text-lg font-bold text-gray-900 whitespace-nowrap md:whitespace-normal">Valor Aprovado</p>
                <p className="text-xl sm:text-2xl font-bold leading-none mt-1 text-green-600 tracking-tight">
                  {formatCurrency(closedValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4. Em Aberto — mobile: 4º | desktop: 2º */}
        <Card className="order-4 lg:order-2 h-full flex flex-col">
          <CardContent className="p-3 lg:p-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-blue-100 order-1 md:order-2 self-end md:self-auto mb-2 md:mb-0">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              </div>
              <div className="flex flex-col justify-center min-w-0 order-2 md:order-1">
                <p className="text-lg font-bold text-gray-900">Em Aberto</p>
                <p className="text-xl sm:text-2xl font-bold leading-none mt-1 text-green-600 tracking-tight">
                  {formatCurrency(openValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 5. Aprovados — mobile: 5º, col-span-2 | desktop: 5º, 1 col */}
        <Card className="order-5 lg:order-5 col-span-2 lg:col-span-1 h-full flex flex-col">
          <CardContent className="p-3 lg:p-6 flex-1 flex flex-col justify-center">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 rounded-xl flex items-center justify-center bg-primary-100 order-1 md:order-2 self-end md:self-auto mb-2 md:mb-0">
                <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex flex-col justify-center min-w-0 order-2 md:order-1">
                <p className="text-lg font-bold text-gray-900">Aprovados</p>
                <p className="text-xl sm:text-2xl font-bold leading-none mt-1 text-green-600 tracking-tight">
                  {approvedQuotes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Orçamentos por Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {getStatusLabel(status)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        status === 'rascunho'
                          ? 'bg-gray-400'
                          : status === 'enviado'
                          ? 'bg-blue-500'
                          : status === 'aprovado'
                          ? 'bg-primary'
                          : status === 'recusado'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
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

        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="flex-1 min-w-0">
            <CardContent className="p-4">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Top Clientes (Fechado no mês)
              </p>
              {topClientesFechado.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">Sem vendas fechadas neste mês.</p>
              ) : (
                <div className="space-y-1.5">
                  {topClientesFechado.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between gap-2 py-2 px-3 ${getRankStyle(idx)}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getMedal(idx) && <span className="text-base flex-shrink-0">{getMedal(idx)}</span>}
                        <p className="text-sm font-medium text-gray-900 truncate">{item.nome}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
                        {formatCurrency(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1 min-w-0">
            <CardContent className="p-4">
              <p className="text-lg font-semibold text-gray-900 mb-2">
                Maiores valores em aberto
              </p>
              {maioresEmAberto.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">Nenhum valor em aberto neste mês.</p>
              ) : (
                <div className="space-y-1.5">
                  {maioresEmAberto.map((q, idx) => (
                    <div
                      key={q.id}
                      className={`flex items-center justify-between gap-2 py-2 px-3 ${getRankStyle(idx)}`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getMedal(idx) && <span className="text-base flex-shrink-0">{getMedal(idx)}</span>}
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {q.cliente?.nome ?? 'Cliente'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">
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
  );
}
