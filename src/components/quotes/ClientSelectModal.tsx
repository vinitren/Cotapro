import * as React from 'react';
import { UserPlus, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { QuickCustomerModal } from '../customers/QuickCustomerModal';
import type { Customer } from '../../types';

interface ClientSelectModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (customer: Customer) => void;
  customers: Customer[];
  selectedId: string;
}

export function ClientSelectModal({
  open,
  onClose,
  onSelect,
  customers,
  selectedId,
}: ClientSelectModalProps) {
  const [quickOpen, setQuickOpen] = React.useState(false);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  const handleQuickSaved = (customer: Customer) => {
    onSelect(customer);
    setQuickOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar cliente</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0">
            {customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelect(c)}
                className="flex items-center justify-between w-full p-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-primary-200 transition-colors text-left"
              >
                <div>
                  <p className="font-medium text-gray-900">{c.nome}</p>
                  {c.telefone && (
                    <p className="text-sm text-gray-500">{c.telefone}</p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 shrink-0" />
              </button>
            ))}
            <Button
              type="button"
              variant="outline"
              className="w-full justify-center mt-2"
              onClick={() => setQuickOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar novo cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <QuickCustomerModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSaved={handleQuickSaved}
      />
    </>
  );
}
