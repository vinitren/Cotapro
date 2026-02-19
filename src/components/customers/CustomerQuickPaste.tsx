import { useState } from 'react';
import { ClipboardPaste, Copy } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { parseCustomerText, CUSTOMER_PASTE_MODEL } from '../../lib/parseCustomerText';
import { toast } from '../../hooks/useToast';

export interface ParsedCustomerData {
  nome?: string;
  telefone?: string;
  email?: string;
  cpf_cnpj?: string;
}

interface CustomerQuickPasteProps {
  onFill: (data: ParsedCustomerData) => void;
}

export function CustomerQuickPaste({ onFill }: CustomerQuickPasteProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');

  const handleCopyModel = () => {
    navigator.clipboard.writeText(CUSTOMER_PASTE_MODEL);
    toast({ title: 'Modelo copiado para envio no WhatsApp.', variant: 'success' });
  };

  const handlePasteFill = () => {
    const parsed = parseCustomerText(pasteText);
    const filled = [parsed.nome, parsed.telefone, parsed.email, parsed.cpf_cnpj].filter(Boolean).length;
    if (filled > 0) {
      onFill(parsed);
      toast({ title: 'Campos preenchidos', description: `${filled} campo(s) preenchido(s) automaticamente.`, variant: 'success' });
    }
    setPasteText('');
    setDialogOpen(false);
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={() => setDialogOpen(true)}
      >
        <ClipboardPaste className="h-4 w-4 mr-2" />
        Colar informações
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full sm:w-auto"
        onClick={handleCopyModel}
      >
        <Copy className="h-4 w-4 mr-2" />
        Copiar modelo
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Colar informações</DialogTitle>
            <DialogDescription>
              Cole o texto abaixo e clique em Preencher automaticamente para extrair nome, telefone, email e CPF/CNPJ.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Cole aqui o texto com os dados do cliente..."
            rows={6}
            className="resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handlePasteFill}>
              Preencher automaticamente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
