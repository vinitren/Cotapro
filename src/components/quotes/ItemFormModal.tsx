import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { ItemCombobox } from './ItemCombobox';
import { formatCurrency, generateId } from '../../lib/utils';
import type { QuoteItem } from '../../types';
import type { ItemCatalogDB } from '../../lib/supabase';

const UNIDADES = ['UN', 'M', 'M2', 'KG', 'HORA', 'SERVICO'];

interface ItemFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (item: QuoteItem) => void;
  catalogItems: ItemCatalogDB[];
  editingItem: QuoteItem | null;
}

export function ItemFormModal({
  open,
  onClose,
  onSave,
  catalogItems,
  editingItem,
}: ItemFormModalProps) {
  const [nomeItem, setNomeItem] = React.useState('');
  const [descricaoItem, setDescricaoItem] = React.useState('');
  const [quantidade, setQuantidade] = React.useState(1);
  const [unidade, setUnidade] = React.useState('UN');
  const [valorUnitario, setValorUnitario] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      if (editingItem) {
        const raw = (editingItem.descricao ?? '').toString();
        const parts = raw.split(' - ');
        const nome = (parts[0] ?? '').trim();
        const desc = parts.length > 1 ? parts.slice(1).join(' - ').trim() : '';
        setNomeItem(nome);
        setDescricaoItem(desc);
        setQuantidade(editingItem.quantidade);
        setUnidade(editingItem.unidade);
        setValorUnitario(editingItem.valor_unitario);
      } else {
        setNomeItem('');
        setDescricaoItem('');
        setQuantidade(1);
        setUnidade('UN');
        setValorUnitario(0);
      }
    }
  }, [open, editingItem]);

  const subtotal = quantidade * valorUnitario;
  const nomeTrim = nomeItem.trim();
  const descTrim = descricaoItem.trim();
  const fullDescricao = descTrim ? `${nomeTrim} - ${descTrim}` : nomeTrim;
  const isValid = nomeTrim && valorUnitario > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      id: editingItem?.id ?? generateId(),
      tipo: 'servico',
      descricao: fullDescricao,
      quantidade,
      unidade,
      valor_unitario: valorUnitario,
      subtotal,
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingItem ? 'Editar item' : 'Adicionar item'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do item</Label>
            <ItemCombobox
              value={nomeItem}
              onChange={setNomeItem}
              onSelectFromCatalog={(desc, unitPrice, unit) => {
                const parts = (desc ?? '').split(' - ');
                setNomeItem((parts[0] ?? '').trim());
                setDescricaoItem(parts.length > 1 ? parts.slice(1).join(' - ').trim() : '');
                setValorUnitario(unitPrice);
                setUnidade(unit);
              }}
              catalogItems={catalogItems}
              placeholder="Ex: Instalação elétrica"
              error={!nomeItem.trim()}
              maxLength={45}
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição do item</Label>
            <Input
              value={descricaoItem}
              onChange={(e) => setDescricaoItem(e.target.value)}
              placeholder="Detalhes opcionais"
              maxLength={60}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={quantidade}
                onChange={(e) =>
                  setQuantidade(parseFloat(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={unidade} onValueChange={setUnidade}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Valor unitário (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={valorUnitario || ''}
              onChange={(e) =>
                setValorUnitario(parseFloat(e.target.value) || 0)
              }
              placeholder="0,00"
            />
          </div>
          <div className="flex justify-between text-sm font-medium py-2">
            <span className="text-[rgb(var(--muted))]">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!isValid}>
              {editingItem ? 'Salvar' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
