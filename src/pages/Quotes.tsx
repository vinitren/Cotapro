import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, FileText, Trash2, Eye, Download, Filter, Loader2, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { useStore } from '../store';
import { formatCurrency, formatDate, formatQuoteDisplay, getStatusColor, getStatusLabel, isSupabaseQuoteId } from '../lib/utils';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import type { Quote, QuoteStatus } from '../types';
import { toast } from '../hooks/useToast';
import { generateQuotePDF } from '../lib/pdf-generator';

export function Quotes() {
  const navigate = useNavigate();
  const { quotes, deleteQuote, checkExpiredQuotes, userId, loadQuotes } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
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
      return matchesSearch && matchesStatus;
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
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as QuoteStatus | 'all')}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="enviado">Enviado</SelectItem>
            <SelectItem value="aprovado">Aprovado</SelectItem>
            <SelectItem value="recusado">Recusado</SelectItem>
            <SelectItem value="expirado">Expirado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredQuotes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {search || statusFilter !== 'all'
                ? 'Nenhum orçamento encontrado'
                : 'Nenhum orçamento criado'}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {search || statusFilter !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Crie seu primeiro orçamento profissional!'}
            </p>
            {!search && statusFilter === 'all' && (
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuotes.map((quote) => (
            <Card key={quote.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">
                        {formatQuoteDisplay(quote)}
                      </span>
                      <Badge className={getStatusColor(quote.status)}>
                        {getStatusLabel(quote.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      {formatCurrency(quote.total)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <span>Emissão: {formatDate(quote.data_emissao)}</span>
                  <span>Validade: {formatDate(quote.data_validade)}</span>
                </div>

                <div className="flex gap-2">
                  <Link to={`/quotes/${quote.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => navigate(`/orcamentos/novo?edit=${quote.id}`)}
                    title="Editar orçamento"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDownloadPDF(quote)}
                    disabled={pdfDownloadingId === quote.id}
                    title="Baixar PDF"
                  >
                    {pdfDownloadingId === quote.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setDeleteConfirm(quote)}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
