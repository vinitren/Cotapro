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
import { Input } from '../components/ui/input';
import { useStore } from '../store';
import { formatCurrency, formatDate, formatQuoteDisplay, getQuoteDisplayNumber, getStatusColor, getStatusLabel, isSupabaseQuoteId } from '../lib/utils';
import { generateQuotePDF } from '../lib/pdf-generator';
import { toast } from '../hooks/useToast';
import type { QuoteStatus } from '../types';

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuote, updateQuoteStatus, company, userId } = useStore();
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<QuoteStatus | ''>('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [mensagemLink, setMensagemLink] = useState('Olá! Segue seu orçamento:');
  const [clienteOpen, setClienteOpen] = useState(false);
  const [observacoesOpen, setObservacoesOpen] = useState(false);
  const [followUpModalOpen, setFollowUpModalOpen] = useState(false);

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
      {/* Header: voltar + título */}
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
      </div>

      {/* Header operacional: Total + Status (padrão dos cards) */}
      <Card className="mb-6">
        <CardContent className="p-4 sm:p-6">
          <p className="text-2xl sm:text-3xl font-bold text-primary">{formatCurrency(quote.total)}</p>
          <p className="text-xs sm:text-sm text-[rgb(var(--muted))] mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <Badge className={`${getStatusColor(quote.status)} text-xs`}>{getStatusLabel(quote.status)}</Badge>
            <span className="text-[rgb(var(--muted))]">•</span>
            <span>Válido até {formatDate(quote.data_validade)}</span>
            <span className="text-[rgb(var(--muted))]">•</span>
            <span className="text-[rgb(var(--muted))]">Enviado em {formatDate(quote.data_emissao)}</span>
          </p>
        </CardContent>
      </Card>

      {/* sm: PDF solto no topo | md+: removido (vai para o card Resumo) */}
      <div className="hidden sm:flex md:hidden justify-end mb-6">
        <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
          {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          {pdfLoading ? 'Gerando...' : 'PDF'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <button
              type="button"
              onClick={() => setClienteOpen(!clienteOpen)}
              className="w-full text-left p-4 sm:p-6"
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
              <CardContent className="pt-0 px-4 sm:px-6 pb-4 sm:pb-6">
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

          {/* Card: Enviar mensagem de follow-up */}
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0 text-xl">
                  💬
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[rgb(var(--fg))]">Enviar mensagem de follow-up</h3>
                  <p className="text-sm text-[rgb(var(--muted))] mt-0.5">Se o cliente ainda não respondeu, envie uma mensagem e aumente suas chances de fechar.</p>
                  <Button
                    variant="outline"
                    onClick={() => setFollowUpModalOpen(true)}
                    className="mt-3"
                  >
                    Escrever mensagem
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <FollowUpModal
            isOpen={followUpModalOpen}
            onClose={() => setFollowUpModalOpen(false)}
            quote={quote}
          />

          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
            </CardHeader>
            <CardContent>
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

          {quote.observacoes && (
            <Card>
              <button
                type="button"
                onClick={() => setObservacoesOpen(!observacoesOpen)}
                className="w-full text-left p-4 pb-2"
                aria-expanded={observacoesOpen}
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Observações</CardTitle>
                  {observacoesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
                {!observacoesOpen && (
                  <p className="text-sm text-[rgb(var(--muted))] line-clamp-1 mt-2">{quote.observacoes}</p>
                )}
                {!observacoesOpen && <p className="text-xs text-primary mt-1">Ver tudo</p>}
              </button>
              {observacoesOpen && (
                <CardContent className="pt-0">
                  <p className="text-[rgb(var(--fg))] whitespace-pre-wrap">{quote.observacoes}</p>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Resumo</CardTitle>
              <div className="hidden md:flex gap-2">
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
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-[rgb(var(--muted))]">Subtotal</span>
                <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
              </div>

              {quote.desconto_valor > 0 && (
                <div className="flex justify-between text-sm text-red-600">
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

              <div className="flex justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(quote.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                {getStatusIcon(quote.status)}
                <div>
                  <p className="font-medium text-[rgb(var(--fg))]">{getStatusLabel(quote.status)}</p>
                  <p className="text-sm text-[rgb(var(--muted))]">Válido até {formatDate(quote.data_validade)}</p>
                  <p className="text-sm text-[rgb(var(--muted))]">Enviado em: {formatDate(quote.data_emissao)}</p>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={() => setShowStatusDialog(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Alterar Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rodapé sticky mobile: WhatsApp + PDF (acima da bottom nav) */}
      <div className="fixed bottom-20 left-0 right-0 px-4 pb-2 sm:hidden z-30">
        <div className="max-w-lg mx-auto p-3 rounded-2xl bg-[rgb(var(--card))]/90 backdrop-blur-sm shadow-lg border border-[rgb(var(--border))] grid grid-cols-[1fr_auto] gap-2 items-stretch">
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
    </div>
  );
}
