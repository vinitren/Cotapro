import { useState, useEffect } from 'react';
import { Plus, Search, Package, Trash2, Edit, Pencil } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { useStore } from '../store';
import { formatCurrency } from '../lib/utils';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import {
  getItemsCatalog,
  createItemCatalog,
  updateItemCatalog,
  deleteItemCatalog,
  type ItemCatalogDB,
} from '../lib/supabase';
import { toast } from '../hooks/useToast';

const UNIDADES = ['UN', 'M', 'M2', 'KG', 'HORA', 'SERVICO'];

export function Catalog() {
  const { userId } = useStore();
  const [items, setItems] = useState<ItemCatalogDB[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCatalogDB | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ItemCatalogDB | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formUnitPrice, setFormUnitPrice] = useState('');
  const [formUnitType, setFormUnitType] = useState('UN');
  const [isSaving, setIsSaving] = useState(false);

  const loadItems = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getItemsCatalog(userId);
      setItems(data);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o catálogo.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [userId]);

  const searchLower = (search ?? '').toLowerCase().trim();
  const filteredItems = (items ?? []).filter((item) => {
    if (!item) return false;
    const name = (item?.name ?? '').toLowerCase();
    const description = (item?.description ?? '').toLowerCase();
    return name.includes(searchLower) || description.includes(searchLower);
  });

  const openNew = () => {
    setEditingItem(null);
    setFormName('');
    setFormDescription('');
    setFormUnitPrice('');
    setFormUnitType('UN');
    setIsFormOpen(true);
  };

  const openEdit = (item: ItemCatalogDB) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormDescription(item.description || '');
    setFormUnitPrice(item.unit_price.toString());
    setFormUnitType(item.unit_type);
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    const name = formName.trim();
    if (!name) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do item.',
        variant: 'destructive',
      });
      return;
    }
    const unitPrice = parseFloat(formUnitPrice.replace(',', '.')) || 0;
    setIsSaving(true);
    try {
      if (editingItem) {
        await updateItemCatalog(userId, editingItem.id, {
          name,
          description: formDescription.trim() || null,
          unit_price: unitPrice,
          unit_type: formUnitType,
        });
        toast({
          title: 'Item atualizado',
          description: `${name} foi atualizado.`,
          variant: 'success',
        });
      } else {
        await createItemCatalog(userId, {
          name,
          description: formDescription.trim() || null,
          unit_price: unitPrice,
          unit_type: formUnitType,
        });
        toast({
          title: 'Item cadastrado',
          description: `${name} foi adicionado ao catálogo.`,
          variant: 'success',
        });
      }
      setIsFormOpen(false);
      loadItems();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao salvar.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm || !userId) return;
    try {
      await deleteItemCatalog(userId, deleteConfirm.id);
      toast({
        title: 'Item excluído',
        description: `${deleteConfirm.name} foi removido.`,
        variant: 'success',
      });
      setDeleteConfirm(null);
      loadItems();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao excluir.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-500">Produtos e serviços para usar nos orçamentos</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Item
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {search ? 'Nenhum item encontrado' : 'Nenhum item no catálogo'}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {search
                ? 'Tente outro termo de busca.'
                : 'Cadastre itens recorrentes para preencher orçamentos mais rápido.'}
            </p>
            {!search && (
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(item)}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirm(item)}
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">{item.unit_type}</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(Number(item.unit_price))}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar item' : 'Novo item'}</DialogTitle>
            <DialogDescription>
              {editingItem
                ? 'Altere os dados do item.'
                : 'Cadastre um produto ou serviço para usar nos orçamentos.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cat-name">Nome *</Label>
              <Input
                id="cat-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Instalação elétrica"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-desc">Descrição</Label>
              <Input
                id="cat-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Detalhes opcionais"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-price">Preço unitário (R$)</Label>
                <Input
                  id="cat-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-unit">Unidade</Label>
                <select
                  id="cat-unit"
                  value={formUnitType}
                  onChange={(e) => setFormUnitType(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {UNIDADES.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Salvando...' : editingItem ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir item</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir &quot;{deleteConfirm?.name}&quot;? Esta ação não pode ser
              desfeita.
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
