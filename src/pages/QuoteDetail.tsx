import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Send,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  Mail,
  MapPin,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
  CircleDot,
  Check,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
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
import { FollowUpModal } from '../components/FollowUpModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { useStore } from '../store';
import { formatCurrency, formatDate, formatQuoteDisplay, getQuoteDisplayNumber, getStatusColor, getStatusLabel, isSupabaseQuoteId, generateId } from '../lib/utils';
import { toast } from '../hooks/useToast';
import type { Quote, QuoteStatus } from '../types';

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuote, updateQuoteStatus, company, userId, addQuote, deleteQuote, markFollowUpSent } = useStore();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<QuoteStatus | ''>('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [mensagemLink, setMensagemLink] = useState('Olá! Segue seu orçamento:');
  const [clienteOpen, setClienteOpen] = useState(false);
  const [observacoesOpen, setObservacoesOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Quote | null>(null);
  const [duplicateLoading, setDuplicateLoading] = useState(false);
  const [markFollowUpLoading, setMarkFollowUpLoading] = useState(false);

  const quote = getQuote(id || '');

  useEffect(() => {
    if (!quote) {
      navigate('/quotes');
    }
  }, [quote, navigate]);

  if (!quote) {
    return null;
  }
 
  // Garantir que items seja sempre um array (pode vir como `itens` ou `items` do backend)
  let items: any[] = [];
  if (Array.isArray((quote as any).itens)) {
    items = (quote as any).itens;
  } else if (typeof (quote as any).itens === 'string') {
    try {
      items = JSON.parse((quote as any).itens);
    } catch {
      items = [];
    }
  } else if (Array.isArray((quote as any).items)) {
    items = (quote as any).items;
  } else if (typeof (quote as any).items === 'string') {
    try {
      items = JSON.parse((quote as any).items);
    } catch {
      items = [];
    }
  } else {
    items = [];
  }

  const handleDownloadPDF = async () => {
    if (userId && !isSupabaseQuoteId(quote.id)) {
      toast({
        title: 'Orçamento não salvo',
        description: 'Este orçamento ainda não foi salvo no servidor. Salve-o antes de gerar o PDF.',
        variant: 'destructive',
      });
      return;
    }
    setPdfLoading(true);
    try {
      const { generateQuotePDF } = await import('../lib/pdf-generator');
      await generateQuotePDF(quote);
      toast({
        title: 'PDF gerado',
        description: 'O download iniciou automaticamente.',
        variant: 'success',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast({
        title: 'Erro ao gerar PDF',
        description: msg || 'Não foi possível gerar o PDF. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setPdfLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    const telefoneLimpo = quote.cliente.telefone.replace(/\D/g, '');
    if (!telefoneLimpo || telefoneLimpo.length < 10) {
      toast({
        title: 'Telefone não cadastrado',
        description: 'O cliente não possui um telefone válido cadastrado.',
        variant: 'destructive',
      });
      return;
    }
    const telefone = telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`;
    const linkOrcamento = `${window.location.origin}/orcamento/${quote.id}`;
    const texto = `${mensagemLink.trim()}\n${linkOrcamento}`;
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');

    if (quote.status === 'rascunho') {
      try {
        await updateQuoteStatus(quote.id, 'enviado');
        toast({
          title: 'Status atualizado',
          description: 'Orçamento marcado como Enviado.',
          variant: 'success',
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao atualizar status.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleStatusChange = async () => {
    if (newStatus && newStatus !== quote.status) {
      try {
        await updateQuoteStatus(quote.id, newStatus);
        toast({
          title: 'Status atualizado',
          description: `Orçamento marcado como ${getStatusLabel(newStatus)}.`,
          variant: 'success',
        });
        setShowStatusDialog(false);
        setNewStatus('');
      } catch (error) {
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao atualizar status.',
          variant: 'destructive',
        });
      }
    }
  };

  const linkOrcamento = `${typeof window !== 'undefined' ? window.location.origin : ''}/orcamento/${quote.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkOrcamento);
    toast({ title: 'Link copiado', description: 'O link do orçamento foi copiado para a área de transferência.', variant: 'success' });
  };

  const handleDuplicateQuote = async () => {
    if (!userId) {
      toast({ title: 'Faça login', description: 'É necessário estar logado para duplicar orçamentos.', variant: 'destructive' });
      return;
    }
    setDuplicateLoading(true);
    try {
      const sourceItens = (quote as any).itens ?? (quote as any).items ?? items;
      const itensComNovosIds = sourceItens.map((item: any) => ({ ...item, id: generateId() }));
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
      toast({ title: 'Orçamento duplicado', description: 'O novo orçamento foi criado. Você pode editá-lo abaixo.', variant: 'success' });
      navigate(`/quotes/new?edit=${newQuote.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      toast({ title: 'Erro ao duplicar', description: msg || 'Não foi possível duplicar o orçamento. Tente novamente.', variant: 'destructive' });
    } finally {
      setDuplicateLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteQuote(deleteConfirm.id);
      toast({ title: 'Orçamento excluído', description: `${formatQuoteDisplay(deleteConfirm)} foi removido.`, variant: 'success' });
      setDeleteConfirm(null);
      navigate('/quotes');
    } catch {
      toast({ title: 'Erro ao excluir', description: 'Não foi possível excluir o orçamento. Tente novamente.', variant: 'destructive' });
    }
  };

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'recusado':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'expirado':
        return <Clock className="h-5 w-5 text-amber-600" />;
      default:
        return <FileText className="h-5 w-5 text-[rgb(var(--muted))]" />;
    }
  };

  return (
    <div className="p-4 lg:p-6 pb-44 sm:pb-6">
      {/* Header: voltar + título + action bar (desktop: WhatsApp, PDF, menu) */}
      <div className="flex items-start gap-4 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl font-bold text-[rgb(var(--fg))] truncate">
            {formatQuoteDisplay(quote)}
          </h1>
          <p className="text-[rgb(var(--muted))] text-sm mt-0.5">Criado em {formatDate(quote.data_criacao)}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleWhatsApp}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {pdfLoading ? 'Gerando...' : 'PDF'}
            </Button>
          </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="flex-shrink-0 h-9 w-9" aria-label="Mais opções">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onClick={handleDuplicateQuote} disabled={duplicateLoading} className="cursor-pointer">
              {duplicateLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
              Duplicar orçamento
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/quotes/new?edit=${quote.id}`)} className="cursor-pointer">
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
                        toast({ title: 'Status atualizado', description: `Orçamento marcado como ${getStatusLabel(s)}.`, variant: 'success' });
                      } catch {
                        toast({ title: 'Erro ao alterar status', description: 'Não foi possível atualizar. Tente novamente.', variant: 'destructive' });
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
                setMarkFollowUpLoading(true);
                try {
                  await markFollowUpSent(quote.id);
                  toast({ title: 'Follow-up registrado', description: 'Data do último follow-up atualizada.', variant: 'success' });
                } catch {
                  toast({ title: 'Erro ao marcar follow-up', description: 'Não foi possível salvar. Tente novamente.', variant: 'destructive' });
                } finally {
                  setMarkFollowUpLoading(false);
                }
              }}
              disabled={markFollowUpLoading}
              className="cursor-pointer"
            >
              {markFollowUpLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
              Marcar follow-up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
              <Copy className="h-4 w-4 mr-2" />
              Copiar link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteConfirm(quote)} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* Header operacional: Total + Status (padrão dos cards) */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <p className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(quote.total)}</p>
          {/* Mobile: badge e datas em linhas separadas */}
          <div className="mt-2 flex flex-col gap-1 sm:hidden text-xs text-[rgb(var(--muted))]">
            <Badge className={`${getStatusColor(quote.status)} text-xs w-fit`}>{getStatusLabel(quote.status)}</Badge>
            <span>Válido até {formatDate(quote.data_validade)}</span>
            <span>Enviado em {formatDate(quote.data_emissao)}</span>
          </div>
          {/* Desktop: uma linha com • */}
          <p className="text-xs sm:text-sm text-[rgb(var(--muted))] mt-1 hidden sm:flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Badge className={`${getStatusColor(quote.status)} text-xs`}>{getStatusLabel(quote.status)}</Badge>
            <span className="text-[rgb(var(--muted))]">•</span>
            <span>Válido até {formatDate(quote.data_validade)}</span>
            <span className="text-[rgb(var(--muted))]">•</span>
            <span className="text-[rgb(var(--muted))]">Enviado em {formatDate(quote.data_emissao)}</span>
          </p>
        </CardContent>
      </Card>

      {/* Desktop: linha compacta de contexto do cliente (nome + telefone e email em texto) */}
      <div className="hidden lg:flex items-center gap-3 mb-4 text-sm text-[rgb(var(--muted))] flex-wrap">
        <span className="font-medium text-[rgb(var(--fg))] truncate">{quote.cliente.nome}</span>
        {quote.cliente.telefone && (
          <span className="flex items-center gap-1.5">
            <Phone className="h-4 w-4 flex-shrink-0" />
            <span>{quote.cliente.telefone}</span>
          </span>
        )}
        {quote.cliente.email && (
          <span className="flex items-center gap-1.5">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span>{quote.cliente.email}</span>
          </span>
        )}
      </div>

      {/* sm: PDF solto no topo | md+: removido (vai para o card Resumo) */}
      <div className="hidden sm:flex md:hidden justify-end items-center gap-3 mb-6">
        {items.length > 16 && (
          <p className="text-xs text-green-700 dark:text-green-400 max-w-[200px]">
            O PDF pode não exibir todos os itens quando o orçamento é muito extenso. Para melhor visualização, use o link compartilhável do WhatsApp.
          </p>
        )}
        <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
          {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {pdfLoading ? 'Gerando...' : 'PDF'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 lg:gap-y-4 lg:items-start">
        {/* Coluna direita no desktop: container com 3 cards (follow-up, resumo, status) */}
        <div className="contents lg:flex lg:flex-col lg:gap-4 lg:col-start-2 lg:row-start-1 lg:self-start">
        {/* Mobile: card Cliente (desktop: oculto — dados do cliente vão para linha compacta no topo) */}
        <Card className="lg:hidden rounded-2xl border-[rgb(var(--border))]/60 shadow-sm">
            <button
              type="button"
              onClick={() => setClienteOpen(!clienteOpen)}
              className="w-full text-left p-4 sm:p-6 lg:p-4"
              aria-expanded={clienteOpen}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">{quote.cliente.nome.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{quote.cliente.nome}</CardTitle>
                    {!clienteOpen && (
                      <div className="flex gap-2 text-[rgb(var(--muted))] mt-0.5">
                        <Phone className="h-4 w-4" />
                        {quote.cliente.email && <Mail className="h-4 w-4" />}
                        {quote.cliente.endereco?.cidade && <MapPin className="h-4 w-4" />}
                      </div>
                    )}
                  </div>
                </div>
                {clienteOpen ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
              </div>
            </button>
            {clienteOpen && (
              <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6 lg:px-4 lg:pb-4">
                <div className="space-y-2">
                  <p className="text-sm text-[rgb(var(--muted))]">{quote.cliente.cpf_cnpj}</p>
                  <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                    <Phone className="h-4 w-4 flex-shrink-0" />
                    <span>{quote.cliente.telefone}</span>
                  </div>
                  {quote.cliente.email && (
                    <div className="flex items-center gap-2 text-sm text-[rgb(var(--muted))]">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span>{quote.cliente.email}</span>
                    </div>
                  )}
                  {quote.cliente.endereco?.cidade && (
                    <div className="flex items-start gap-2 text-sm text-[rgb(var(--muted))]">
                      <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        {quote.cliente.endereco.rua}, {quote.cliente.endereco.numero}
                        {quote.cliente.endereco.complemento && ` - ${quote.cliente.endereco.complemento}`}
                        , {quote.cliente.endereco.bairro} - {quote.cliente.endereco.cidade}/{quote.cliente.endereco.estado}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

        {/* Mobile: segundo. Desktop: dentro do container da coluna direita */}
        <Card className="lg:order-1 lg:rounded-2xl lg:border-[rgb(var(--border))]/60 lg:shadow-sm">
            <CardContent className="p-4 sm:p-6 lg:p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xl lg:h-9 lg:w-9">
                  💬
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[rgb(var(--fg))] lg:text-sm">Enviar mensagem de follow-up</h3>
                  <p className="text-sm text-[rgb(var(--muted))] mt-0.5 lg:text-xs">Se o cliente ainda não respondeu, envie uma mensagem e aumente suas chances de fechar.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFollowUpModalOpen(true)}
                    className="mt-3 lg:mt-2 lg:text-xs"
                  >
                    Escrever mensagem
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

        {/* Coluna direita: Resumo e Status (mesmo wrapper, ordem preservada) */}
        <Card className="lg:order-2 lg:rounded-2xl lg:border-[rgb(var(--border))]/60 lg:shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-2 lg:px-4 lg:pt-4 lg:pb-2">
              <CardTitle className="lg:text-sm">Resumo</CardTitle>
              <div className="hidden md:flex flex-col items-end gap-1.5">
                {items.length > 16 && (
                  <p className="text-xs text-green-700 dark:text-green-400">
                    O PDF pode não exibir todos os itens quando o orçamento é muito extenso. Para melhor visualização, use o link compartilhável do WhatsApp.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleWhatsApp}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    disabled={pdfLoading}
                  >
                    {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    {pdfLoading ? 'Gerando...' : 'PDF'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 lg:px-4 lg:pb-4 lg:space-y-3">
              <div className="flex justify-between text-sm lg:text-xs">
                <span className="text-[rgb(var(--muted))]">Subtotal</span>
                <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
              </div>

              {quote.desconto_valor > 0 && (
                <div className="flex justify-between text-sm text-red-600 lg:text-xs">
                  <span>
                    Desconto{' '}
                    {quote.desconto_tipo === 'percentual' && `(${quote.desconto_valor}%)`}
                  </span>
                  <span>
                    -{' '}
                    {formatCurrency(
                      quote.desconto_tipo === 'percentual'
                        ? (quote.subtotal * quote.desconto_valor) / 100
                        : quote.desconto_valor
                    )}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between lg:items-center">
                <span className="text-lg font-semibold lg:text-base">Total</span>
                <span className="text-2xl font-bold text-primary lg:text-xl">
                  {formatCurrency(quote.total)}
                </span>
              </div>
            </CardContent>
          </Card>

        <Card className="lg:order-3 lg:rounded-2xl lg:border-[rgb(var(--border))]/60 lg:shadow-sm">
            <CardHeader className="lg:px-4 lg:pt-4 lg:pb-2">
              <CardTitle className="lg:text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 lg:px-4 lg:pb-4 lg:space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg lg:p-2.5 lg:rounded-xl">
                {getStatusIcon(quote.status)}
                <div className="min-w-0">
                  <p className="font-medium text-[rgb(var(--fg))] lg:text-sm">{getStatusLabel(quote.status)}</p>
                  <p className="text-sm text-[rgb(var(--muted))] lg:text-xs">Válido até {formatDate(quote.data_validade)}</p>
                  <p className="text-sm text-[rgb(var(--muted))] lg:text-xs">Enviado em: {formatDate(quote.data_emissao)}</p>
                </div>
              </div>

              <Button variant="outline" size="sm" className="w-full lg:text-xs" onClick={() => setShowStatusDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Alterar Status
              </Button>
            </CardContent>
          </Card>

        </div>

          {/* Coluna esquerda no desktop: container único para Itens + Observações (logo abaixo um do outro) */}
          <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1 lg:gap-4">
          {/* Card Itens */}
          <Card className="lg:rounded-2xl lg:border-[rgb(var(--border))]/50 lg:shadow-md lg:overflow-hidden">
            <CardHeader className="lg:px-6 lg:pt-6 lg:pb-3">
              <CardTitle className="lg:text-lg">Itens</CardTitle>
            </CardHeader>
            <CardContent className="lg:px-6 lg:pb-6">
              {/* Mobile: lista/cards */}
              <div className="block sm:hidden space-y-3">
                {items.map((item: any, index: number) => (
                  <div key={item.id} className="p-3 rounded-lg border border-[rgb(var(--border))] bg-white/5">
                    <p className="text-sm font-medium text-[rgb(var(--fg))] line-clamp-2">{item.descricao}</p>
                    <p className="text-xs text-[rgb(var(--muted))] mt-1">
                      {item.quantidade} {item.unidade} • {formatCurrency(item.valor_unitario)}/un
                    </p>
                    <p className="text-sm font-semibold text-[rgb(var(--fg))] mt-2">{formatCurrency(item.subtotal)}</p>
                  </div>
                ))}
              </div>
              {/* Desktop: tabela */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgb(var(--border))]">
                      <th className="text-left py-3 px-2 text-sm font-medium text-[rgb(var(--muted))]">Descrição</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-[rgb(var(--muted))]">Qtd</th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-[rgb(var(--muted))]">Un</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-[rgb(var(--muted))]">Valor Unit.</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-[rgb(var(--muted))]">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, index: number) => (
                      <tr key={item.id} className="border-b border-[rgb(var(--border))]">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[rgb(var(--muted))]">{index + 1}.</span>
                            <span className="text-sm text-[rgb(var(--fg))]">{item.descricao}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2 text-sm text-[rgb(var(--fg))]">{item.quantidade}</td>
                        <td className="text-center py-3 px-2 text-sm text-[rgb(var(--fg))]">{item.unidade}</td>
                        <td className="text-right py-3 px-2 text-sm text-[rgb(var(--fg))]">{formatCurrency(item.valor_unitario)}</td>
                        <td className="text-right py-3 px-2 text-sm font-medium text-[rgb(var(--fg))]">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Card Observações */}
          {quote.observacoes && (
            <Card className="lg:rounded-2xl lg:border-[rgb(var(--border))]/40 lg:bg-[rgb(var(--card))]/50">
              <button
                type="button"
                onClick={() => setObservacoesOpen(!observacoesOpen)}
                className="w-full text-left p-4 pb-2 lg:px-5 lg:py-3"
                aria-expanded={observacoesOpen}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base lg:text-sm font-medium text-[rgb(var(--fg))]">Observações</CardTitle>
                  {observacoesOpen ? <ChevronUp className="h-4 w-4 text-[rgb(var(--muted))]" /> : <ChevronDown className="h-4 w-4 text-[rgb(var(--muted))]" />}
                </div>
                {!observacoesOpen && (
                  <p className="text-sm text-[rgb(var(--muted))] line-clamp-1 mt-2">{quote.observacoes}</p>
                )}
                {!observacoesOpen && <p className="text-xs text-primary mt-1">Ver tudo</p>}
              </button>
              {observacoesOpen && (
                <CardContent className="pt-0 lg:px-5 lg:pb-4">
                  <p className="text-[rgb(var(--fg))] text-sm whitespace-pre-wrap leading-relaxed">{quote.observacoes}</p>
                </CardContent>
              )}
            </Card>
          )}

          </div>

      </div>

      <FollowUpModal
        isOpen={followUpModalOpen}
        onClose={() => setFollowUpModalOpen(false)}
        quote={quote}
      />

      {/* Rodapé sticky mobile: WhatsApp + PDF (acima da bottom nav) */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 sm:hidden z-30">
        <div className="max-w-lg mx-auto p-3 rounded-2xl bg-[rgb(var(--card))]/90 backdrop-blur-sm shadow-lg border border-[rgb(var(--border))] flex flex-col gap-2">
          {items.length > 16 && (
            <p className="text-xs text-green-700 dark:text-green-400 px-1">
              O PDF pode não exibir todos os itens quando o orçamento é muito extenso. Para melhor visualização, use o link compartilhável do WhatsApp.
            </p>
          )}
          <div className="grid grid-cols-[1fr_auto] gap-2 items-stretch">
            <Button
              onClick={handleWhatsApp}
              className="h-12 text-base font-semibold bg-green-600 hover:bg-green-700 text-white"
              title="Enviar orçamento com link"
            >
              <Send className="h-5 w-5 mr-2" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={pdfLoading}
              className="h-12 px-4 text-sm text-[rgb(var(--fg))] border-[rgb(var(--border))]"
            >
              {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Baixar PDF
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Selecione o novo status para este orçamento.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={newStatus}
              onValueChange={(v) => setNewStatus(v as QuoteStatus)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rascunho">Rascunho</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="aprovado">Aprovado</SelectItem>
                <SelectItem value="recusado">Recusado</SelectItem>
                <SelectItem value="expirado">Expirado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStatusChange} disabled={!newStatus}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o orçamento {deleteConfirm ? formatQuoteDisplay(deleteConfirm) : ''}? Esta ação não pode ser desfeita.
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
