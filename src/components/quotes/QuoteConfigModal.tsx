import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface QuoteConfigModalProps {
  open: boolean;
  onClose: () => void;
  validadeDias: string;
  onValidadeChange: (v: string) => void;
  descontoTipo: 'percentual' | 'fixo';
  onDescontoTipoChange: (v: 'percentual' | 'fixo') => void;
  descontoValor: string;
  onDescontoValorChange: (v: string) => void;
  descontoCalculado: number;
  formatCurrency: (n: number) => string;
}

export function QuoteConfigModal({
  open,
  onClose,
  validadeDias,
  onValidadeChange,
  descontoTipo,
  onDescontoTipoChange,
  descontoValor,
  onDescontoValorChange,
  descontoCalculado,
  formatCurrency,
}: QuoteConfigModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações</DialogTitle>
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
            <Label>Desconto</Label>
            <div className="flex gap-2">
              <Select value={descontoTipo} onValueChange={(v) => onDescontoTipoChange(v as 'percentual' | 'fixo')}>
                <SelectTrigger className="w-20">
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
                onChange={(e) => onDescontoValorChange(e.target.value)}
                className="flex-1"
              />
            </div>
            {descontoCalculado > 0 && (
              <p className="text-sm text-red-600">
                Desconto: - {formatCurrency(descontoCalculado)}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
