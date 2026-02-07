import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, DollarSign, TrendingUp, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { useStore } from '../store';
import { formatCurrency, formatDate, formatQuoteDisplay, getStatusColor, getStatusLabel } from '../lib/utils';

export function Dashboard() {
  const { quotes, checkExpiredQuotes } = useStore();

  useEffect(() => {
    checkExpiredQuotes();
  }, [checkExpiredQuotes]);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const quotesThisMonth = quotes.filter((q) => {
    const date = new Date(q.data_emissao);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  });

  const totalQuotesThisMonth = quotesThisMonth.length;

  const openValue = quotes
    .filter((q) => q.status === 'enviado')
    .reduce((sum, q) => sum + q.total, 0);

  const approvedQuotes = quotes.filter((q) => q.status === 'aprovado');
  const sentQuotes = quotes.filter((q) => q.status === 'enviado' || q.status === 'aprovado' || q.status === 'recusado');
  const approvalRate = sentQuotes.length > 0 ? (approvedQuotes.length / sentQuotes.length) * 100 : 0;

  const statusCounts = {
    rascunho: quotes.filter((q) => q.status === 'rascunho').length,
    enviado: quotes.filter((q) => q.status === 'enviado').length,
    aprovado: quotes.filter((q) => q.status === 'aprovado').length,
    recusado: quotes.filter((q) => q.status === 'recusado').length,
    expirado: quotes.filter((q) => q.status === 'expirado').length,
  };

  const recentQuotes = [...quotes]
    .sort((a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime())
    .slice(0, 5);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Visão geral dos seus orçamentos</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Orçamentos (Mês)</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                  {totalQuotesThisMonth}
                </p>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <FileText className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Valor em Aberto</p>
                <p className="text-xl lg:text-2xl font-bold text-gray-900 mt-1">
                  {formatCurrency(openValue)}
                </p>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <DollarSign className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Taxa de Aprovação</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                  {approvalRate.toFixed(0)}%
                </p>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Aprovados</p>
                <p className="text-2xl lg:text-3xl font-bold text-gray-900 mt-1">
                  {approvedQuotes.length}
                </p>
              </div>
              <div className="h-10 w-10 lg:h-12 lg:w-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <CheckCircle className="h-5 w-5 lg:h-6 lg:w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Orçamentos por Status</CardTitle>
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
                          ? 'bg-emerald-500'
                          : status === 'recusado'
                          ? 'bg-red-500'
                          : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${quotes.length > 0 ? (count / quotes.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Últimos Orçamentos</CardTitle>
            <Link
              to="/quotes"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentQuotes.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nenhum orçamento criado ainda</p>
                <Link
                  to="/quotes/new"
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm mt-2 inline-block"
                >
                  Criar primeiro orçamento
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentQuotes.map((quote) => (
                  <Link
                    key={quote.id}
                    to={`/quotes/${quote.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {formatQuoteDisplay(quote)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(quote.data_emissao)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        {formatCurrency(quote.total)}
                      </p>
                      <Badge className={getStatusColor(quote.status)}>
                        {getStatusLabel(quote.status)}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
