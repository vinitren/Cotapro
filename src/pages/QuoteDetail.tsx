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
import { useStore } from '../store';
import { formatCurrency, formatDate, formatQuoteDisplay, getQuoteDisplayNumber, getStatusColor, getStatusLabel, isSupabaseQuoteId } from '../lib/utils';
import { generateQuotePDF, QuotePDFTemplate } from '../lib/pdf-generator';
import { toast } from '../hooks/useToast';
import type { QuoteStatus } from '../types';

export function QuoteDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getQuote, updateQuoteStatus, company, userId } = useStore();
  const [showPreview, setShowPreview] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState<QuoteStatus | ''>('');
  const [pdfLoading, setPdfLoading] = useState(false);

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
    const phone = quote.cliente.telefone.replace(/\D/g, '');
    const link = `${window.location.origin}/orcamento/${quote.id}`;
    const message = `Olá! Segue seu orçamento:\n${link}`;
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
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

  const getStatusIcon = (status: QuoteStatus) => {
    switch (status) {
      case 'aprovado':
        return <CheckCircle className="h-5 w-5 text-primary" />;
      case 'recusado':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'expirado':
        return <Clock className="h-5 w-5 text-amber-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/quotes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {formatQuoteDisplay(quote)}
              </h1>
              <Badge className={getStatusColor(quote.status)}>
                {getStatusLabel(quote.status)}
              </Badge>
            </div>
            <p className="text-gray-500">Criado em {formatDate(quote.data_criacao)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Visualizar
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            {pdfLoading ? 'Gerando...' : 'PDF'}
          </Button>
          <Button onClick={handleWhatsApp}>
            <Send className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary">
                    {quote.cliente.nome.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{quote.cliente.nome}</h3>
                  <p className="text-sm text-gray-500">{quote.cliente.cpf_cnpj}</p>

                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{quote.cliente.telefone}</span>
                    </div>
                    {quote.cliente.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span>{quote.cliente.email}</span>
                      </div>
                    )}
                    {quote.cliente.endereco.cidade && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {quote.cliente.endereco.rua}, {quote.cliente.endereco.numero}
                          {quote.cliente.endereco.complemento &&
                            ` - ${quote.cliente.endereco.complemento}`}
                          , {quote.cliente.endereco.bairro} - {quote.cliente.endereco.cidade}/
                          {quote.cliente.endereco.estado}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">
                        Descrição
                      </th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                        Qtd
                      </th>
                      <th className="text-center py-3 px-2 text-sm font-medium text-gray-500">
                        Un
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                        Valor Unit.
                      </th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-gray-500">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, index: number) => (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{index + 1}.</span>
                            <span className="text-sm text-gray-900">{item.descricao}</span>
                          </div>
                        </td>
                        <td className="text-center py-3 px-2 text-sm text-gray-700">
                          {item.quantidade}
                        </td>
                        <td className="text-center py-3 px-2 text-sm text-gray-700">
                          {item.unidade}
                        </td>
                        <td className="text-right py-3 px-2 text-sm text-gray-700">
                          {formatCurrency(item.valor_unitario)}
                        </td>
                        <td className="text-right py-3 px-2 text-sm font-medium text-gray-900">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {quote.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
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
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {getStatusIcon(quote.status)}
                <div>
                  <p className="font-medium text-gray-900">{getStatusLabel(quote.status)}</p>
                  <p className="text-sm text-gray-500">
                    Válido até {formatDate(quote.data_validade)}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowStatusDialog(true)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Alterar Status
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Prévia do Orçamento</DialogTitle>
          </DialogHeader>
          <div className="border rounded-lg overflow-hidden">
            <QuotePDFTemplate quote={quote} company={company} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Fechar
            </Button>
            <Button onClick={handleDownloadPDF} disabled={pdfLoading}>
              {pdfLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              {pdfLoading ? 'Gerando...' : 'Baixar PDF'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
