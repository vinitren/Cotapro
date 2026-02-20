import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Trash2, ArrowLeft, Save, User, Settings2, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Separator } from '../components/ui/separator';
import { Textarea } from '../components/ui/textarea';
import { useStore } from '../store';
import { formatCurrency, formatQuoteDisplay, addDays, parseCurrency } from '../lib/utils';
import type { QuoteItem, Customer } from '../types';
import { toast } from '../hooks/useToast';
import { ClientSelectModal } from '../components/quotes/ClientSelectModal';
import { ItemFormModal } from '../components/quotes/ItemFormModal';
import { QuoteConfigModal } from '../components/quotes/QuoteConfigModal';
import { getItemsCatalog, type ItemCatalogDB } from '../lib/supabase';

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
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const editMode = Boolean(editId);

  const { customers, settings, addQuote, updateQuote, getQuote, loadQuotes, userId } = useStore();

  const [clienteId, setClienteId] = useState('');
  const [validadeDias, setValidadeDias] = useState(settings.validade_padrao.toString());
  const [itens, setItens] = useState<QuoteItem[]>([]);
  const [descontoTipo, setDescontoTipo] = useState<'percentual' | 'fixo'>('percentual');
  const [descontoValor, setDescontoValor] = useState('0');
  const [observacoes, setObservacoes] = useState(settings.observacoes_padrao);
  const [isSaving, setIsSaving] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [catalogItems, setCatalogItems] = useState<ItemCatalogDB[]>([]);
  const [isLoadingEdit, setIsLoadingEdit] = useState(false);

  const selectedCustomer = customers.find((c) => c.id === clienteId);

  const subtotal = itens.reduce((sum, item) => sum + item.subtotal, 0);
  const descontoValorNumerico = parseCurrency(descontoValor);
  const descontoCalculado =
    descontoTipo === 'percentual'
      ? (subtotal * descontoValorNumerico) / 100
      : descontoValorNumerico;
  const total = Math.max(0, subtotal - descontoCalculado);

  const addItem = (item: QuoteItem) => {
    setItens((prev) => [...prev, item]);
  };

  const updateItem = (item: QuoteItem) => {
    setItens((prev) =>
      prev.map((i) => (i.id === item.id ? item : i))
    );
  };

  const removeItem = (id: string) => {
    setItens((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveItem = (item: QuoteItem) => {
    const existing = itens.find((i) => i.id === item.id);
    if (existing) {
      updateItem(item);
    } else {
      addItem(item);
    }
    setEditingItem(null);
    setItemModalOpen(false);
  };

  const openAddItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const openEditItem = (item: QuoteItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
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

      if (editMode && editId) {
        await updateQuote(editId, {
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
          title: status === 'rascunho' ? 'Rascunho salvo' : 'Orçamento atualizado',
          description: `${formatQuoteDisplay(getQuote(editId))} foi ${
            status === 'rascunho' ? 'salvo como rascunho' : 'atualizado com sucesso'
          }.`,
          variant: 'success',
        });

        navigate(`/quotes/${editId}`);
      } else {
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
      }
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
    if (!userId) return;
    getItemsCatalog(userId)
      .then(setCatalogItems)
      .catch(() => setCatalogItems([]));
  }, [userId]);

  useEffect(() => {
    if (!editId || !userId) return;

    const loadAndFill = async () => {
      setIsLoadingEdit(true);
      try {
        let quote = getQuote(editId);
        if (!quote) {
          await loadQuotes();
          quote = getQuote(editId);
        }
        if (quote) {
          setClienteId(quote.cliente_id);
          const dias =
            Math.ceil(
              (new Date(quote.data_validade).getTime() - new Date(quote.data_emissao).getTime()) /
                (24 * 60 * 60 * 1000)
            ) || settings.validade_padrao;
          setValidadeDias(String(dias));
          setItens(quote.itens ?? []);
          setDescontoTipo(quote.desconto_tipo ?? 'percentual');
          setDescontoValor(String(quote.desconto_valor ?? 0));
          setObservacoes(quote.observacoes ?? settings.observacoes_padrao);
        } else {
          toast({
            title: 'Orçamento não encontrado',
            description: 'O orçamento solicitado não existe ou você não tem permissão para editá-lo.',
            variant: 'destructive',
          });
          navigate('/quotes');
        }
      } finally {
        setIsLoadingEdit(false);
      }
    };

    loadAndFill();
  }, [editId, userId, getQuote, loadQuotes, settings.validade_padrao, settings.observacoes_padrao]);

  if (editMode && isLoadingEdit) {
    return (
      <div className="min-h-screen bg-page-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page-bg pb-24 lg:pb-8">
      <div className="max-w-[640px] lg:max-w-6xl mx-auto px-4 lg:px-6 pt-4 lg:pt-6">
        <div className="lg:grid lg:grid-cols-[1fr_340px] lg:gap-8 lg:items-start">
          {/* Coluna esquerda: Header + Cliente + Itens */}
          <div className="space-y-6 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">
              {editMode ? 'Editar Orçamento' : 'Novo Orçamento'}
            </h1>
            <p className="text-sm text-gray-500 truncate">
              {editMode ? 'Altere os dados e salve' : 'Número gerado ao salvar'}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigModalOpen(true)}
            className="shrink-0"
          >
            <Settings2 className="h-4 w-4 mr-1.5" />
            Config
          </Button>
        </div>

        {/* Cliente - Card clicável */}
        <Card
          className="cursor-pointer hover:border-primary-200 transition-colors active:scale-[0.99]"
          onClick={() => setClientModalOpen(true)}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-12 w-12 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {selectedCustomer?.nome ?? placeholderCliente.nome}
                </p>
                <p className="text-sm text-gray-500">
                  {selectedCustomer ? 'Toque para alterar' : 'Toque para selecionar'}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
          </CardContent>
        </Card>

        {/* Itens */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Itens</h2>
            <Button size="sm" onClick={openAddItem}>
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {itens.length === 0 ? (
                <button
                  type="button"
                  onClick={openAddItem}
                  className="w-full p-6 flex flex-col items-center justify-center gap-2 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="h-10 w-10 text-gray-300" />
                  <span className="text-sm font-medium">Adicione o primeiro item</span>
                </button>
              ) : (
                <div className="divide-y divide-gray-100">
                  {itens.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-gray-50/50 active:bg-gray-100 transition-colors"
                    >
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => openEditItem(item)}
                      >
                        <p className="font-medium text-gray-900 truncate">
                          {item.descricao || 'Item sem descrição'}
                        </p>
                        <p className="text-sm text-primary font-semibold">
                          {formatCurrency(item.subtotal)}
                        </p>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeItem(item.id);
                        }}
                        title="Remover item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

            {/* Resumo + Botões - mobile (dentro da coluna esquerda, no fluxo do scroll) */}
            <div className="lg:hidden space-y-4">
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Observações</Label>
                    <Textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Condições de pagamento, prazos, etc."
                      rows={3}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  {descontoCalculado > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Desconto</span>
                      <span>- {formatCurrency(descontoCalculado)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </CardContent>
              </Card>
              {/* Botões removidos no mobile: mantém apenas o sticky bottom fixo */}
            </div>
          </div>

          {/* Coluna direita: Resumo (sticky) + Botões - desktop */}
          <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start space-y-4">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm">Observações</Label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Condições de pagamento, prazos, etc."
                    rows={3}
                    className="resize-none"
                  />
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {descontoCalculado > 0 && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Desconto</span>
                    <span>- {formatCurrency(descontoCalculado)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(total)}
                  </span>
                </div>
              </CardContent>
            </Card>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full h-12"
                onClick={() => handleSave('enviado')}
                disabled={isSaving}
              >
                <Save className="h-5 w-5 mr-2" />
                {isSaving ? 'Salvando...' : editMode ? 'Atualizar Orçamento' : 'Gerar Orçamento'}
              </Button>
              <Button
                variant="outline"
                className="w-full h-12"
                onClick={() => handleSave('rascunho')}
                disabled={isSaving}
              >
                Salvar Rascunho
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Botão fixo - Gerar Orçamento (apenas mobile) */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 max-w-[640px] mx-auto lg:hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-primary truncate">
              {formatCurrency(total)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              className="h-12"
              onClick={() => handleSave('rascunho')}
              disabled={isSaving}
            >
              Rascunho
            </Button>
            <Button
              className="h-12 min-w-[140px]"
              onClick={() => handleSave('enviado')}
              disabled={isSaving}
            >
              <Save className="h-5 w-5 mr-2" />
              {isSaving ? 'Salvando...' : editMode ? 'Atualizar' : 'Gerar Orçamento'}
            </Button>
          </div>
        </div>
      </div>

      {/* Modais */}
      <ClientSelectModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSelect={(c) => {
          setClienteId(c.id);
          setClientModalOpen(false);
        }}
        customers={customers}
        selectedId={clienteId}
      />
      <ItemFormModal
        open={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        catalogItems={catalogItems}
        editingItem={editingItem}
      />
      <QuoteConfigModal
        open={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        validadeDias={validadeDias}
        onValidadeChange={setValidadeDias}
        descontoTipo={descontoTipo}
        onDescontoTipoChange={(v) => setDescontoTipo(v)}
        descontoValor={descontoValor}
        onDescontoValorChange={setDescontoValor}
        descontoCalculado={descontoCalculado}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}
