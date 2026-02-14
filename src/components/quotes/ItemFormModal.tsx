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
  const [descricao, setDescricao] = React.useState('');
  const [quantidade, setQuantidade] = React.useState(1);
  const [unidade, setUnidade] = React.useState('UN');
  const [valorUnitario, setValorUnitario] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      if (editingItem) {
        setDescricao(editingItem.descricao);
        setQuantidade(editingItem.quantidade);
        setUnidade(editingItem.unidade);
        setValorUnitario(editingItem.valor_unitario);
      } else {
        setDescricao('');
        setQuantidade(1);
        setUnidade('UN');
        setValorUnitario(0);
      }
    }
  }, [open, editingItem]);

  const subtotal = quantidade * valorUnitario;
  const isValid = descricao.trim() && valorUnitario > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      id: editingItem?.id ?? generateId(),
      tipo: 'servico',
      descricao: descricao.trim(),
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
            <Label>Descrição</Label>
            <ItemCombobox
              value={descricao}
              onChange={setDescricao}
              onSelectFromCatalog={(desc, unitPrice, unit) => {
                setDescricao(desc);
                setValorUnitario(unitPrice);
                setUnidade(unit);
              }}
              catalogItems={catalogItems}
              placeholder="Digite ou selecione do catálogo"
              error={!descricao.trim()}
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
            <span className="text-gray-500">Subtotal</span>
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
