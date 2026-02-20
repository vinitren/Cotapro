import { useState, useEffect } from 'react';
import { Plus, Search, Package, Trash2, Pencil, MoreVertical, List } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useStore } from '../store';
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
  const [isListOpen, setIsListOpen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('catalog_list_open');
      return saved === 'true';
    } catch {
      return false;
    }
  });
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

  useEffect(() => {
    try {
      localStorage.setItem('catalog_list_open', String(isListOpen));
    } catch {
      /* ignore */
    }
  }, [isListOpen]);

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
    <div className="p-4 lg:p-6 space-y-6 pb-36 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo</h1>
          <p className="text-gray-500">Produtos e serviços para usar nos orçamentos</p>
        </div>
        <Button onClick={openNew} className="hidden sm:flex">
          <Plus className="h-4 w-4 mr-2" />
          Novo item/serviço
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder={isListOpen ? 'Buscar por nome ou descrição...' : 'Abra o catálogo para pesquisar'}
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
          {isListOpen ? 'Ocultar catálogo' : 'Ver catálogo'}
        </Button>
      </div>

      {isListOpen && (
        loading ? (
          <Card className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-gray-500">Carregando catálogo...</p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
        <Card className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-10 px-6">
            <div className="h-14 w-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <Package className="h-7 w-7 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              {search ? 'Nenhum item encontrado' : 'Nenhum item no catálogo'}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {search
                ? 'Tente outro termo de busca.'
                : 'Cadastre itens recorrentes para preencher orçamentos mais rápido.'}
            </p>
            {!search && (
              <Button onClick={openNew} className="hidden sm:flex">
                <Plus className="h-4 w-4 mr-2" />
                Adicionar item/serviço
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredItems.map((item) => (
            <Card
              key={item.id}
              className="rounded-xl border border-slate-200/70 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <CardContent className="px-3 py-2.5">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {[item.unit_type, item.description].filter(Boolean).join(' • ') || '—'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 flex-shrink-0 text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        aria-label="Mais opções"
                      >
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => openEdit(item)}
                        className="cursor-pointer"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteConfirm(item)}
                        className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )
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
                maxLength={45}
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
                maxLength={60}
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
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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

      {/* Botão fixo no rodapé - apenas mobile */}
      <div
        className="fixed bottom-16 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 lg:hidden"
        style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="flex justify-center max-w-[640px] mx-auto">
          <Button onClick={openNew} className="w-full h-12">
            <Plus className="h-4 w-4 mr-2" />
            Novo item/serviço
          </Button>
        </div>
      </div>

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
