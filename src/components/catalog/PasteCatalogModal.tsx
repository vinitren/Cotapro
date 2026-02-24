import { useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { parsePasteCatalog, type ParsedCatalogItem } from '../../lib/catalog-paste';
import { bulkInsertCatalogFromPaste } from '../../lib/supabase';
import { formatCurrency } from '../../lib/utils';
import { toast } from '../../hooks/useToast';

interface PasteCatalogModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onSuccess: () => void;
}

export function PasteCatalogModal({
  open,
  onOpenChange,
  userId,
  onSuccess,
}: PasteCatalogModalProps) {
  const [pasteText, setPasteText] = useState('');
  const [previewItems, setPreviewItems] = useState<ParsedCatalogItem[]>([]);
  const [invalidLines, setInvalidLines] = useState(0);
  const [isImporting, setIsImporting] = useState(false);

  const handleProcessar = () => {
    const { items, invalidLines: inv } = parsePasteCatalog(pasteText);
    setPreviewItems(items);
    setInvalidLines(inv);
  };

  const handleImportar = async () => {
    if (!previewItems.length || !userId) return;
    setIsImporting(true);
    try {
      const result = await bulkInsertCatalogFromPaste(userId, previewItems, invalidLines);
      const msg = [
        result.imported > 0 && `${result.imported} itens importados`,
        result.duplicates > 0 && `${result.duplicates} duplicados ignorados`,
        result.invalidLines > 0 && `${result.invalidLines} linhas inválidas`,
      ]
        .filter(Boolean)
        .join('. ');
      toast({
        title: 'Importação concluída',
        description: msg || 'Nenhum item para importar.',
        variant: result.imported > 0 ? 'success' : 'default',
      });
      if (result.imported > 0) {
        onSuccess();
        setPasteText('');
        setPreviewItems([]);
        setInvalidLines(0);
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: 'Erro ao importar',
        description: error instanceof Error ? error.message : 'Não foi possível importar.',
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const hasPreview = previewItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Colar lista
          </DialogTitle>
          <DialogDescription>
            Cole uma lista de produtos. Formatos: &quot;Nome - 39,90&quot; ou &quot;Nome    39,90&quot; (Excel).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Ex:&#10;Instalação elétrica - 150,00&#10;Pintura m2    45,90&#10;..."
              className="min-h-[140px] font-mono text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleProcessar}
              disabled={!pasteText.trim()}
            >
              Processar
            </Button>
          </div>

          {hasPreview && (
            <div className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]/50 overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-[rgb(var(--card))] border-b border-[rgb(var(--border))]">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-[rgb(var(--fg))]">Nome</th>
                      <th className="text-right px-3 py-2 font-semibold text-[rgb(var(--fg))]">Preço</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewItems.map((item, i) => (
                      <tr
                        key={i}
                        className="border-b border-[rgb(var(--border))]/40 last:border-b-0 hover:bg-white/5 dark:hover:bg-white/5"
                      >
                        <td className="px-3 py-2 text-[rgb(var(--fg))] truncate max-w-[200px]">{item.name}</td>
                        <td className="px-3 py-2 text-right text-[rgb(var(--fg))] tabular-nums">
                          {formatCurrency(item.unit_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 text-xs text-[rgb(var(--muted))] border-t border-[rgb(var(--border))]/40">
                {previewItems.length} item(ns) • {invalidLines > 0 ? `${invalidLines} linha(s) inválida(s)` : 'todas as linhas válidas'}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleImportar}
            disabled={!hasPreview || isImporting}
          >
            {isImporting ? 'Importando...' : 'Importar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
