import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { useStore } from '../store';
import { formatCurrency, formatQuoteDisplay, generateId, addDays, parseCurrency } from '../lib/utils';
import type { QuoteItem, Quote, Customer } from '../types';
import { toast } from '../hooks/useToast';
import { QuickCustomerModal } from '../components/customers/QuickCustomerModal';
import { ItemCombobox } from '../components/quotes/ItemCombobox';
import { getItemsCatalog, type ItemCatalogDB } from '../lib/supabase';
import { QuotePDFTemplate } from '../lib/pdf-generator';

const UNIDADES = ['UN', 'M', 'M2', 'KG', 'HORA', 'SERVICO'];

const OBSERVACOES_SUGERIDAS = [
  'Pagamento: 50% entrada + 50% na entrega',
  'Pagamento à vista com 10% de desconto',
  'Prazo de entrega: 7 dias úteis',
  'Validade da proposta conforme data indicada',
];

const placeholderCliente: Customer = {
  id: '',
  tipo: 'pessoa_fisica',
  nome: 'Selecione um cliente',
  cpf_cnpj: '',
  telefone: '',
  email: '',
  endereco: { rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' },
  observacoes: '',
  data_cadastro: new Date().toISOString().split('T')[0],
};

export function QuoteCreate() {
  const navigate = useNavigate();
  const { customers, settings, addQuote, getNextQuoteNumber, userId, company } = useStore();

  const [clienteId, setClienteId] = useState('');
  const [validadeDias, setValidadeDias] = useState(settings.validade_padrao.toString());
  const [itens, setItens] = useState<QuoteItem[]>([]);
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [descontoValor, setDescontoValor] = useState('0');
  const [observacoes, setObservacoes] = useState(settings.observacoes_padrao);
  const [isSaving, setIsSaving] = useState(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<ItemCatalogDB[]>([]);

  const quoteNumber = useMemo(() => getNextQuoteNumber(), [getNextQuoteNumber]);

  const selectedCustomer = customers.find((c) => c.id === clienteId);

  const subtotal = itens.reduce((sum, item) => sum + item.subtotal, 0);
  const descontoValorNumerico = parseCurrency(descontoValor);
  const descontoCalculado =
    descontoTipo === 'percentual'
      ? (subtotal * descontoValorNumerico) / 100
      : descontoValorNumerico;
  const total = Math.max(0, subtotal - descontoCalculado);

  const dataEmissao = new Date().toISOString().split('T')[0];
  const dataValidade = addDays(new Date(), parseInt(validadeDias)).toISOString().split('T')[0];

  const draftQuote: Quote = useMemo(
    () => ({
      id: 'draft',
      numero: Number(quoteNumber) || 0,
      cliente_id: clienteId || '',
      cliente: selectedCustomer || placeholderCliente,
      data_emissao: dataEmissao,
      data_validade: dataValidade,
      status: 'rascunho',
      itens,
      subtotal,
      desconto_tipo: descontoTipo,
      desconto_valor: descontoValorNumerico,
      total,
      observacoes,
      data_criacao: dataEmissao,
    }),
    [
      quoteNumber,
      clienteId,
      selectedCustomer,
      dataEmissao,
      dataValidade,
      itens,
      subtotal,
      descontoTipo,
      descontoValorNumerico,
      total,
      observacoes,
    ]
  );

  const addItem = () => {
    const newItem: QuoteItem = {
      id: generateId(),
      tipo: 'servico',
      descricao: '',
      quantidade: 1,
      unidade: 'UN',
      valor_unitario: 0,
      subtotal: 0,
    };
    setItens([...itens, newItem]);
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'quantidade' || field === 'valor_unitario') {
          updated.subtotal = updated.quantidade * updated.valor_unitario;
        }
        return updated;
      })
    );
  };

  const removeItem = (id: string) => {
    setItens((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = async (status: 'rascunho' | 'enviado') => {
    if (!clienteId) {
      toast({
        title: 'Selecione um cliente',
        description: 'É necessário selecionar um cliente para o orçamento.',
        variant: 'destructive',
      });
      return;
    }

    if (itens.length === 0) {
      toast({
        title: 'Adicione itens',
        description: 'O orçamento deve ter pelo menos um item.',
        variant: 'destructive',
      });
      return;
    }

    const invalidItems = itens.filter((item) => !item.descricao || item.valor_unitario <= 0);
    if (invalidItems.length > 0) {
      toast({
        title: 'Itens inválidos',
        description: 'Preencha a descrição e valor de todos os itens.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const dataValidade = addDays(new Date(), parseInt(validadeDias))
        .toISOString()
        .split('T')[0];

      const quote = await addQuote({
        cliente_id: clienteId,
        cliente: selectedCustomer!,
        data_validade: dataValidade,
        status,
        itens,
        subtotal,
        desconto_tipo: descontoTipo,
        desconto_valor: descontoValorNumerico,
        total,
        observacoes,
      });

      toast({
        title: status === 'rascunho' ? 'Rascunho salvo' : 'Orçamento criado',
        description: `${formatQuoteDisplay(quote)} foi ${
          status === 'rascunho' ? 'salvo como rascunho' : 'criado com sucesso'
        }.`,
        variant: 'success',
      });

      navigate(`/quotes/${quote.id}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '';
      const isPermission = /permissão|RLS|42501/i.test(msg);
      const isNetwork = /rede|timeout|fetch|network/i.test(msg);
      toast({
        title: 'Erro ao salvar orçamento',
        description: isPermission
          ? 'Sem permissão para salvar. Verifique se você está logado e tente novamente.'
          : isNetwork
            ? 'Falha de conexão. Verifique sua internet e tente novamente.'
            : msg || 'Não foi possível salvar no servidor. Tente novamente em instantes.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (itens.length === 0) {
      addItem();
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    getItemsCatalog(userId)
      .then(setCatalogItems)
      .catch(() => setCatalogItems([]));
  }, [userId]);

  return (
    <div className="p-4 lg:p-6 pb-28 lg:pb-8">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Orçamento</h1>
          <p className="text-gray-500">O número será gerado ao salvar no banco.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Select value={validadeDias} onValueChange={setValidadeDias}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 dias</SelectItem>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cliente</Label>
                <div className="flex gap-2">
                  <Select value={clienteId} onValueChange={setClienteId} className="flex-1">
                    <SelectTrigger error={!clienteId}>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={() => setQuickCustomerOpen(true)}
                    title="Cadastrar novo cliente rapidamente"
                  >
                    <UserPlus className="h-4 w-4 mr-1.5" />
                    Novo Cliente
                  </Button>
                </div>
                {customers.length === 0 && !quickCustomerOpen && (
                  <p className="text-sm text-gray-500">
                    Nenhum cliente cadastrado. Clique no botão <strong>+</strong> para cadastrar um cliente rapidamente.
                  </p>
                )}
              </div>

              <QuickCustomerModal
                open={quickCustomerOpen}
                onClose={() => setQuickCustomerOpen(false)}
                onSaved={(customer) => {
                  setClienteId(customer.id);
                  setQuickCustomerOpen(false);
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Itens do Orçamento</CardTitle>
              <Button size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {itens.map((item, index) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-4 border border-gray-200 rounded-xl sm:rounded-lg bg-white shadow-sm sm:shadow-none space-y-4 touch-manipulation"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-500">Item {index + 1}</span>
                    {itens.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 sm:h-8 sm:w-8 text-red-500 hover:text-red-600 hover:bg-red-50 -mr-2"
                        onClick={() => removeItem(item.id)}
                        title="Remover item"
                      >
                        <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <ItemCombobox
                      value={item.descricao}
                      onChange={(value) => updateItem(item.id, 'descricao', value)}
                      onSelectFromCatalog={(descricao, unitPrice, unit) => {
                        setItens((prev) =>
                          prev.map((i) => {
                            if (i.id !== item.id) return i;
                            const updated = {
                              ...i,
                              descricao,
                              valor_unitario: unitPrice,
                              unidade: unit,
                              subtotal: i.quantidade * unitPrice,
                            };
                            return updated;
                          })
                        );
                      }}
                      catalogItems={catalogItems}
                      placeholder="Digite ou selecione um item do catálogo"
                      error={!item.descricao}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Quantidade</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantidade}
                        onChange={(e) =>
                          updateItem(item.id, 'quantidade', parseFloat(e.target.value) || 0)
                        }
                        className="h-11 sm:h-10 min-h-[44px] text-base sm:text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Unidade</Label>
                      <Select
                        value={item.unidade}
                        onValueChange={(value) => updateItem(item.id, 'unidade', value)}
                      >
                        <SelectTrigger className="h-11 sm:h-10 min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES.map((un) => (
                            <SelectItem key={un} value={un}>
                              {un}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Valor Unit.</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm sm:text-sm">
                          R$
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.valor_unitario || ''}
                          onChange={(e) =>
                            updateItem(item.id, 'valor_unitario', parseFloat(e.target.value) || 0)
                          }
                          className="pl-10 h-11 sm:h-10 min-h-[44px] text-base sm:text-sm"
                          error={item.valor_unitario <= 0}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Subtotal</Label>
                      <Input
                        value={formatCurrency(item.subtotal)}
                        disabled
                        className="bg-gray-50 font-semibold h-11 sm:h-10 min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {OBSERVACOES_SUGERIDAS.map((obs) => (
                  <Button
                    key={obs}
                    variant="outline"
                    size="sm"
                    onClick={() => setObservacoes(obs)}
                    className="text-xs"
                  >
                    {obs}
                  </Button>
                ))}
              </div>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Condições de pagamento, prazos, etc."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Resumo mobile: desconto e total (desktop tem na sidebar) */}
          <Card className="lg:hidden">
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Desconto</Label>
                <div className="flex gap-2">
                  <Select
                    value={descontoTipo}
                    onValueChange={(v) => setDescontoTipo(v as 'percentual' | 'fixo')}
                  >
                    <SelectTrigger className="w-24 h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">%</SelectItem>
                      <SelectItem value="fixo">R$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    value={descontoValor}
                    onChange={(e) => setDescontoValor(e.target.value)}
                    className="flex-1 h-11"
                  />
                </div>
              </div>
              {descontoCalculado > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto</span>
                  <span>- {formatCurrency(descontoCalculado)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop: Preview do PDF + Resumo (oculto no mobile) */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 space-y-6">
            {/* Preview do PDF - apenas desktop */}
            <Card>
              <CardHeader>
                <CardTitle>Preview do PDF</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-auto max-h-[420px] border-t border-gray-100 bg-gray-50">
                  <div className="scale-[0.72] origin-top-left w-[139%] min-h-[500px]">
                    <QuotePDFTemplate quote={draftQuote} company={company} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Desconto</Label>
                  <div className="flex gap-2">
                    <Select
                      value={descontoTipo}
                      onValueChange={(v) => setDescontoTipo(v as 'percentual' | 'fixo')}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentual">%</SelectItem>
                        <SelectItem value="fixo">R$</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      value={descontoValor}
                      onChange={(e) => setDescontoValor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                {descontoCalculado > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto</span>
                    <span>- {formatCurrency(descontoCalculado)}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between">
                  <span className="text-lg font-semibold">Total</span>
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(total)}
                  </span>
                </div>

                <div className="space-y-2 pt-4">
                  <Button
                    className="w-full"
                    onClick={() => handleSave('enviado')}
                    disabled={isSaving}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Criar Orçamento
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleSave('rascunho')}
                    disabled={isSaving}
                  >
                    Salvar Rascunho
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Sticky Footer - apenas mobile: Gerar Orçamento */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] lg:hidden pt-3"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-between gap-4 px-4 py-3 max-w-full">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-emerald-600 truncate">
              {formatCurrency(total)}
            </p>
          </div>
          <Button
            className="shrink-0 flex-1 max-w-[220px] h-12 text-base font-semibold"
            onClick={() => handleSave('enviado')}
            disabled={isSaving}
          >
            <Save className="h-5 w-5 mr-2" />
            {isSaving ? 'Salvando...' : 'Gerar Orçamento'}
          </Button>
        </div>
      </div>
    </div>
  );
}
