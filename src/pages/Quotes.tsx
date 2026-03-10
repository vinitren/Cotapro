import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, Eye, Download, Filter, Loader2, Pencil, MoreVertical, List, MessageCircle, Copy, Check, CircleDot } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { PageHeader } from '../components/layout/PageHeader';
import { pageCardClasses } from '../components/layout/PageLayout';
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useStore } from '../store';
import { cn, formatCurrency, formatDate, formatQuoteDisplay, getQuoteDisplayNumber, getStatusLabel, isSupabaseQuoteId, generateId } from '../lib/utils';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Quote, QuoteStatus } from '../types';
import { toast } from '../hooks/useToast';
import { format, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { DateRangePicker } from '../components/quotes/DateRangePicker';
import { FollowUpModal } from '../components/FollowUpModal';
import { formatLastFollowUpText } from '../lib/dashboard-followup';

export function Quotes() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { quotes, deleteQuote, checkExpiredQuotes, userId, loadQuotes, markFollowUpSent, addQuote, updateQuoteStatus } = useStore();
  const statusFromUrl = searchParams.get('status') as QuoteStatus | null;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');

  useEffect(() => {
    if (statusFromUrl && ['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado'].includes(statusFromUrl)) {
      setStatusFilter(statusFromUrl);
    }
  }, [statusFromUrl]);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'with_followup' | 'without_followup'>('all');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filterNicho, setFilterNicho] = useState<'status' | 'date' | 'follow-up'>('status');
  const [deleteConfirm, setDeleteConfirm] = useState<Quote | null>(null);
  const [followUpModal, setFollowUpModal] = useState<Quote | null>(null);
  const [markFollowUpLoadingId, setMarkFollowUpLoadingId] = useState<string | null>(null);
  const [pdfDownloadingId, setPdfDownloadingId] = useState<string | null>(null);
  const [duplicateLoadingId, setDuplicateLoadingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isListOpen, setIsListOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('budgets_list_open');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('budgets_list_open', String(isListOpen));
    } catch {
      /* ignore */
    }
  }, [isListOpen]);

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
        if (!dateRange?.from || !dateRange?.to) return true;
        const dateStr = quote.data_emissao ?? quote.data_criacao ?? '';
        if (!dateStr) return true;
        const quoteDate = new Date(dateStr);
        const fromStart = startOfDay(dateRange.from!).getTime();
        const toEnd = endOfDay(dateRange.to!).getTime();
        const quoteDayStart = new Date(quoteDate.getFullYear(), quoteDate.getMonth(), quoteDate.getDate()).getTime();
        return quoteDayStart >= fromStart && quoteDayStart <= toEnd;
      })();
      const matchesFollowUp =
        followUpFilter === 'all' ||
        (followUpFilter === 'with_followup' ? Boolean(quote.last_follow_up_at) : !quote.last_follow_up_at);
      return matchesSearch && matchesStatus && matchesDate && matchesFollowUp;
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

  const openFollowUpModal = (quote: Quote) => {
    setFollowUpModal(quote);
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
      const { generateQuotePDF } = await import('../lib/pdf-generator');
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

  const handleDuplicateQuote = async (quote: Quote) => {
    if (!userId) {
      toast({
        title: 'Faça login',
        description: 'É necessário estar logado para duplicar orçamentos.',
        variant: 'destructive',
      });
      return;
    }
    setDuplicateLoadingId(quote.id);
    try {
      const itensComNovosIds = (quote.itens ?? []).map((item) => ({
        ...item,
        id: generateId(),
      }));
      const newQuote = await addQuote({
        cliente_id: quote.cliente_id,
        cliente: quote.cliente,
        data_validade: quote.data_validade,
        status: 'rascunho',
        itens: itensComNovosIds,
        subtotal: quote.subtotal,
        desconto_tipo: quote.desconto_tipo ?? 'percentual',
        desconto_valor: quote.desconto_valor ?? 0,
        total: quote.total,
        observacoes: quote.observacoes ?? '',
      });
      toast({
        title: 'Orçamento duplicado',
        description: 'O novo orçamento foi criado. Você pode editá-lo abaixo.',
        variant: 'success',
      });
      navigate(`/quotes/new?edit=${newQuote.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast({
        title: 'Erro ao duplicar',
        description: msg || 'Não foi possível duplicar o orçamento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setDuplicateLoadingId(null);
    }
  };

  const handleCopyLink = async (quote: Quote) => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/orcamento/${quote.id}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({
        title: 'Link copiado',
        description: 'O link do orçamento foi copiado para a área de transferência.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o link.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 lg:space-y-8 pb-36 lg:pb-6">
      <PageHeader
        title="Orçamentos"
        subtitle="Gerencie seus orçamentos"
        action={
          <div className="hidden sm:flex">
            <Link to="/quotes/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Orçamento
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--muted))]" />
          <Input
            placeholder={isListOpen ? 'Buscar por número ou cliente...' : 'Abra a lista para pesquisar/filtrar'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            disabled={!isListOpen}
          />
        </div>
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => setIsListOpen((v) => !v)}
        >
          <List className="h-4 w-4 mr-2" />
          {isListOpen ? 'Ocultar orçamentos' : 'Ver orçamentos'}
        </Button>
        <Dialog open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setFilterPanelOpen(true)}
            disabled={!isListOpen}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtro
            {(statusFilter !== 'all' || (dateRange?.from && dateRange?.to) || followUpFilter !== 'all') && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                {(statusFilter !== 'all' ? 1 : 0) + (dateRange?.from && dateRange?.to ? 1 : 0) + (followUpFilter !== 'all' ? 1 : 0)}
              </Badge>
            )}
          </Button>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Combine status, data e follow-up para refinar a lista.</DialogDescription>
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
                <Button
                  variant={filterNicho === 'follow-up' ? 'default' : 'outline'}
                  size="sm"
                  className="flex-1"
                  onClick={() => setFilterNicho('follow-up')}
                >
                  Follow-up
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
                <div className="space-y-2">
                  <p className="text-xs text-[rgb(var(--muted))]">
                    {dateRange?.from && dateRange?.to
                      ? `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`
                      : dateRange?.from
                        ? `${format(dateRange.from, 'dd/MM/yyyy')} - Selecione a data final`
                        : 'Período não definido'}
                  </p>
                  <DateRangePicker
                    value={dateRange}
                    onChange={(range) => {
                      if (!range) {
                        setDateRange(undefined);
                        return;
                      }
                      setDateRange({ from: range.from, to: range.to });
                    }}
                    onClear={() => setDateRange(undefined)}
                    onApply={() => setFilterPanelOpen(false)}
                  />
                </div>
              )}
              {filterNicho === 'follow-up' && (
                <div className="space-y-2">
                  <p className="text-xs text-[rgb(var(--muted))]">Situação de follow-up</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(['all', 'with_followup', 'without_followup'] as const).map((v) => (
                      <Button
                        key={v}
                        variant={followUpFilter === v ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFollowUpFilter(v)}
                      >
                        {v === 'all' ? 'Todos' : v === 'with_followup' ? 'Com follow-up' : 'Sem follow-up'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isListOpen && (
        <>
          {(statusFilter !== 'all' || (dateRange?.from && dateRange?.to) || followUpFilter !== 'all') && (
            <div className="flex flex-wrap gap-2">
              {statusFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-white/20"
                  onClick={() => setStatusFilter('all')}
                >
                  Status: {getStatusLabel(statusFilter)} ×
                </Badge>
              )}
              {dateRange?.from && dateRange?.to && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-white/20"
                  onClick={() => setDateRange(undefined)}
                >
                  Data: {format(dateRange.from, 'dd/MM/yyyy')} - {format(dateRange.to, 'dd/MM/yyyy')} ×
                </Badge>
              )}
              {followUpFilter !== 'all' && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer hover:bg-white/20"
                  onClick={() => setFollowUpFilter('all')}
                >
                  Follow-up: {followUpFilter === 'with_followup' ? 'Com follow-up' : 'Sem follow-up'} ×
                </Badge>
              )}
            </div>
          )}

          {filteredQuotes.length === 0 ? (
        <Card className={pageCardClasses}>
          <CardContent className="flex flex-col items-center justify-center py-12 px-6">
            <div className="h-16 w-16 bg-[rgb(var(--border))]/40 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-[rgb(var(--muted))]" />
            </div>
            <h3 className="text-base font-bold text-[rgb(var(--fg))] mb-1">
              {search || statusFilter !== 'all' || (dateRange?.from && dateRange?.to) || followUpFilter !== 'all'
                ? 'Nenhum orçamento encontrado'
                : 'Nenhum orçamento criado'}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {search || statusFilter !== 'all' || (dateRange?.from && dateRange?.to) || followUpFilter !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Crie seu primeiro orçamento profissional!'}
            </p>
            {!search && statusFilter === 'all' && !(dateRange?.from && dateRange?.to) && followUpFilter === 'all' && (
              <Link to="/quotes/new" className="hidden sm:inline-block">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Orçamento
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {filteredQuotes.map((quote) => {
            const dataRef = quote.data_emissao || quote.data_criacao;
            const mesAno = dataRef ? format(new Date(dataRef), 'MM/yyyy') : '';
            return (
            <Card key={quote.id} className={cn(pageCardClasses, 'hover:shadow-lg transition-shadow')}>
              <CardContent className="p-4 lg:p-5">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <p className="text-base font-bold text-[rgb(var(--fg))] truncate tracking-tight">
                      #{getQuoteDisplayNumber(quote)}{mesAno ? ` • ${mesAno}` : ''} — {quote.cliente?.nome ?? 'Cliente'}
                    </p>
                    <p className="text-base font-semibold text-primary flex-shrink-0 tabular-nums">
                      {formatCurrency(quote.total)}
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    <span className={quote.status === 'enviado' ? 'text-blue-600' : quote.status === 'aprovado' ? 'text-primary' : quote.status === 'recusado' ? 'text-red-600' : quote.status === 'expirado' ? 'text-amber-600' : 'text-[rgb(var(--muted))]'}>
                      {getStatusLabel(quote.status)}
                    </span>
                    {' • '}
                    Emitido: {formatDate(quote.data_emissao)}
                    {' • '}
                    Val: {formatDate(quote.data_validade)}
                  </p>
                  {quote.last_follow_up_at && (
                    <p className="text-xs text-[rgb(var(--muted))]">
                      {formatLastFollowUpText(quote.last_follow_up_at)}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Link to={`/quotes/${quote.id}`} className="flex-1 min-w-0">
                      <Button variant="outline" size="sm" className="w-full h-8 sm:h-9 px-2 sm:px-3">
                        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                        Ver orçamento
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 sm:h-9 px-2 sm:px-3"
                      onClick={() => openFollowUpModal(quote)}
                    >
                      <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                      Follow-up
                    </Button>
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
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onClick={() => handleDuplicateQuote(quote)}
                          disabled={duplicateLoadingId === quote.id}
                          className="cursor-pointer"
                        >
                          {duplicateLoadingId === quote.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4 mr-2" />
                          )}
                          Duplicar orçamento
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => navigate(`/quotes/new?edit=${quote.id}`)}
                          className="cursor-pointer"
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="cursor-pointer">
                            <CircleDot className="h-4 w-4 mr-2" />
                            Alterar status
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {(['rascunho', 'enviado', 'aprovado', 'recusado', 'expirado'] as const).map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={async () => {
                                  try {
                                    await updateQuoteStatus(quote.id, s);
                                    toast({
                                      title: 'Status atualizado',
                                      description: `Orçamento marcado como ${getStatusLabel(s)}.`,
                                      variant: 'success',
                                    });
                                  } catch {
                                    toast({
                                      title: 'Erro ao alterar status',
                                      description: 'Não foi possível atualizar. Tente novamente.',
                                      variant: 'destructive',
                                    });
                                  }
                                }}
                                className="cursor-pointer"
                              >
                                {getStatusLabel(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem
                          onClick={async () => {
                            setMarkFollowUpLoadingId(quote.id);
                            try {
                              await markFollowUpSent(quote.id);
                              toast({
                                title: 'Follow-up registrado',
                                description: 'Data do último follow-up atualizada.',
                                variant: 'success',
                              });
                            } catch {
                              toast({
                                title: 'Erro ao marcar follow-up',
                                description: 'Não foi possível salvar. Tente novamente.',
                                variant: 'destructive',
                              });
                            } finally {
                              setMarkFollowUpLoadingId(null);
                            }
                          }}
                          disabled={markFollowUpLoadingId === quote.id}
                          className="cursor-pointer"
                        >
                          {markFollowUpLoadingId === quote.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-2" />
                          )}
                          Marcar follow-up
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleCopyLink(quote)}
                          className="cursor-pointer"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar link
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
          );
          })}
        </div>
          )}
        </>
      )}

      {/* Botão fixo no rodapé - apenas mobile */}
      <div
        className="fixed bottom-16 left-0 right-0 z-30 bg-[rgb(var(--card))] border-t border-[rgb(var(--border))] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 lg:hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-center max-w-[640px] mx-auto">
          <Link to="/quotes/new" className="w-full">
            <Button className="w-full h-12">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orçamento
            </Button>
          </Link>
        </div>
      </div>

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

      {followUpModal && (
        <FollowUpModal
          isOpen={!!followUpModal}
          onClose={() => setFollowUpModal(null)}
          quote={followUpModal}
        />
      )}
    </div>
  );
}
