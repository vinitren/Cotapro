import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

interface ExpiredPlanModalProps {
  open: boolean;
  onClose: () => void;
  onAtivar?: () => void | Promise<void>;
  onDepois?: () => void;
  loading?: boolean;
}

/**
 * Modal exibido quando o período gratuito/trial expirou.
 * Reutilizável em qualquer fluxo que exija verificação de plano.
 */
export function ExpiredPlanModal({
  open,
  onClose,
  onAtivar,
  onDepois,
  loading = false,
}: ExpiredPlanModalProps) {
  const handleAtivar = () => {
    onAtivar?.() ?? onClose();
  };

  const handleDepois = () => {
    onDepois?.() ?? onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md border-[rgb(var(--border))] bg-[rgb(var(--card))] shadow-xl">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto sm:mx-0 mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl text-[rgb(var(--fg))] text-center sm:text-left">
            Seu período gratuito terminou
          </DialogTitle>
          <DialogDescription className="text-[rgb(var(--muted))] text-center sm:text-left pt-1">
            Para continuar criando novos orçamentos, ative seu plano.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-2 pt-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto order-2 sm:order-1 border-[rgb(var(--border))]"
            onClick={handleDepois}
          >
            Depois
          </Button>
          <Button
            className="w-full sm:w-auto order-1 sm:order-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={handleAtivar}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Carregando...
              </>
            ) : (
              'Ativar plano'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
