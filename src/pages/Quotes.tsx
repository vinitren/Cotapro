import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, Eye, Download, Filter, Loader2, Pencil, MoreVertical } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useStore } from '../store';
import { formatCurrency, formatDate, formatQuoteDisplay, getQuoteDisplayNumber, getStatusColor, getStatusLabel, isSupabaseQuoteId } from '../lib/utils';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Quote, QuoteStatus } from '../types';
import { toast } from '../hooks/useToast';
import { generateQuotePDF } from '../lib/pdf-generator';

export function Quotes() {
  const navigate = useNavigate();
  const { quotes, deleteQuote, checkExpiredQuotes, userId, loadQuotes } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterNicho, setFilterNicho] = useState<'status' | 'date'>('status');
  const [deleteConfirm, setDeleteConfirm] = useState<Quote | null>(null);
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadQuotes();
        checkExpiredQuotes();
      } catch (error) {
        toast({
          title: 'Erro ao carregar orçamentos',
          description: 'Não foi possível carregar a lista de orçamentos. Verifique sua conexão.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadQuotes, checkExpiredQuotes]);

  const searchLower = (search ?? '').toLowerCase().trim();
  const quotesList = quotes ?? [];
  const filteredQuotes = quotesList
    .filter((quote) => {
      if (!quote) return false;
      const clienteNome = (quote?.cliente?.nome ?? '').toLowerCase();
      const numeroStr = (quote?.numero ?? '').toString();
      const matchesSearch =
        clienteNome.includes(searchLower) || numeroStr.includes(searchLower);
      const matchesStatus = statusFilter === 'all' || quote?.status === statusFilter;
      const matchesDate = (() => {
        if (dateFilter === 'all') return true;
        const dateStr = quote.data_emissao ?? quote.data_criacao ?? '';
        if (!dateStr) return true;
        const d = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const quoteDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const diffMs = today.getTime() - quoteDate.getTime();
        const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        if (dateFilter === 'daily') return diffDays === 0;
        if (dateFilter === 'weekly') return diffDays >= 0 && diffDays <= 6;
        if (dateFilter === 'monthly') return diffDays >= 0 && diffDays <= 29;
        return true;
      })();
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => new Date(b?.data_criacao ?? '').getTime() - new Date(a?.data_criacao ?? '').getTime());

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteQuote(deleteConfirm.id);
        toast({
          title: 'Orçamento excluído',
          description: `${formatQuoteDisplay(deleteConfirm)} foi removido.`,
          variant: 'success',
        });
        setDeleteConfirm(null);
      } catch (error) {
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao excluir orçamento.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleDownloadPDF = async (quote: Quote) => {
    if (userId && !isSupabaseQuoteId(quote.id)) {
      toast({
        title: 'Orçamento não salvo',
        description: 'Salve o orçamento antes de gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    setPdfDownloadingId(quote.id);
    try {
      await generateQuotePDF(quote);
      toast({
        title: 'PDF gerado',
        description: 'O download do PDF iniciou automaticamente.',
        variant: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast({
        title: 'Erro ao gerar PDF',
        description: msg || 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setPdfDownloadingId(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orçamentos</h1>
          <p className="text-gray-500">Gerencie seus orçamentos</p>
        </div>
        <Link to="/quotes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Orçamento
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por número ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setFilterPanelOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtro
            {(statusFilter !== 'all' || dateFilter !== 'all') && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                {(statusFilter !== 'all' ? 1 : 0) + (dateFilter !== 'all' ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Combine status e data para refinar a lista.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant={filterNicho === 'status' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFilterNicho('status')}
                >
                  Status
                </Button>
                <Button
                  variant={filterNicho === 'date' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFilterNicho('date')}
                >
                  Data
                </Button>
              </div>
              {filterNicho === 'status' && (
                <div className="grid grid-cols-2 gap-2">
                  {(['all', 'rascunho', 'enviado', 'aprovado', 'recusado', 'expirado'] as const).map((v) => (
                    <Button
                      key={v}
                      variant={statusFilter === v ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setStatusFilter(v)}
                    >
                      {v === 'all' ? 'Todos' : getStatusLabel(v)}
                    </Button>
                  ))}
                </div>
              )}
              {filterNicho === 'date' && (
                <div className="grid grid-cols-2 gap-2">
                  {(['all', 'daily', 'weekly', 'monthly'] as const).map((v) => (
                    <Button
                      key={v}
                      variant={dateFilter === v ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setDateFilter(v)}
                    >
                      {v === 'all' ? 'Todos' : v === 'daily' ? 'Diário' : v === 'weekly' ? 'Semanal' : 'Mensal'}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {(statusFilter !== 'all' || dateFilter !== 'all') && (
        <div className="flex flex-wrap gap-2">
          {statusFilter !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-gray-300"
              onClick={() => setStatusFilter('all')}
            >
              Status: {getStatusLabel(statusFilter)} ×
            </Badge>
          )}
          {dateFilter !== 'all' && (
            <Badge
              variant="secondary"
              className="cursor-pointer hover:bg-gray-300"
              onClick={() => setDateFilter('all')}
            >
              Data: {dateFilter === 'daily' ? 'Diário' : dateFilter === 'weekly' ? 'Semanal' : 'Mensal'} ×
            </Badge>
          )}
        </div>
      )}

      {filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {search || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Nenhum orçamento encontrado'
                : 'Nenhum orçamento criado'}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {search || statusFilter !== 'all' || dateFilter !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Crie seu primeiro orçamento profissional!'}
            </p>
            {!search && statusFilter === 'all' && dateFilter === 'all' && (
              <Link to="/quotes/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Orçamento
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-3 sm:p-4">
                <div className="space-y-1.5 sm:space-y-4">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="text-base sm:text-xl font-bold text-gray-900 truncate">
                      #{getQuoteDisplayNumber(quote)} — {quote.cliente?.nome ?? 'Cliente'}
                    </p>
                    <p className="text-base sm:text-lg font-bold text-primary flex-shrink-0">
                      {formatCurrency(quote.total)}
                    </p>
                  </div>

                  <p className="text-xs text-gray-500">
                    <span className={quote.status === 'enviado' ? 'text-blue-600' : quote.status === 'aprovado' ? 'text-primary' : quote.status === 'recusado' ? 'text-red-600' : quote.status === 'expirado' ? 'text-amber-600' : 'text-gray-600'}>
                      {getStatusLabel(quote.status)}
                    </span>
                    {' • '}
                    Emitido: {formatDate(quote.data_emissao)}
                    {' • '}
                    Val: {formatDate(quote.data_validade)}
                  </p>

                  <div className="flex gap-2">
                    <Link to={`/quotes/${quote.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full h-8 sm:h-9 px-2 sm:px-3">
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                        Ver
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 sm:h-10 sm:w-10"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => navigate(`/orcamentos/novo?edit=${quote.id}`)}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDownloadPDF(quote)}
                          disabled={pdfDownloadingId === quote.id}
                          className="cursor-pointer"
                        >
                          {pdfDownloadingId === quote.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Baixar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(quote)}
                          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o orçamento {deleteConfirm ? formatQuoteDisplay(deleteConfirm) : ''}? Esta ação não pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
