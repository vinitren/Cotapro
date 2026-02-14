import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const OBSERVACOES_SUGERIDAS = [
  'Pagamento: 50% entrada + 50% na entrega',
  'Pagamento à vista com 10% de desconto',
  'Prazo de entrega: 7 dias úteis',
  'Validade da proposta conforme data indicada',
];

interface QuoteConfigModalProps {
  open: boolean;
  onClose: () => void;
  validadeDias: string;
  onValidadeChange: (v: string) => void;
  observacoes: string;
  onObservacoesChange: (v: string) => void;
}

export function QuoteConfigModal({
  open,
  onClose,
  validadeDias,
  onValidadeChange,
  observacoes,
  onObservacoesChange,
}: QuoteConfigModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Obs / Configurações</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Validade</Label>
            <Select value={validadeDias} onValueChange={onValidadeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="15">15 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="60">60 dias</SelectItem>
                <SelectItem value="90">90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações</Label>
            <div className="flex flex-wrap gap-2">
              {OBSERVACOES_SUGERIDAS.map((obs) => (
                <Button
                  key={obs}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => onObservacoesChange(obs)}
                >
                  {obs}
                </Button>
              ))}
            </div>
            <Textarea
              value={observacoes}
              onChange={(e) => onObservacoesChange(e.target.value)}
              placeholder="Condições de pagamento, prazos, etc."
              rows={4}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
