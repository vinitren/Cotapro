import * as React from 'react';
import { UserPlus, ChevronRight, Search, MoreVertical, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { QuickCustomerModal } from '../customers/QuickCustomerModal';
import { CustomerForm } from '../customers/CustomerForm';
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
  const [search, setSearch] = React.useState('');
  const [editingCustomer, setEditingCustomer] = React.useState<Customer | null>(null);
  const [formOpen, setFormOpen] = React.useState(false);

  const searchLower = (search || '').toLowerCase().trim();
  const filteredCustomers = React.useMemo(() => {
    if (!searchLower) return customers;
    return customers.filter((c) => {
      const nome = (c.nome ?? '').toLowerCase();
      const cpfCnpj = (c.cpf_cnpj ?? '').toLowerCase();
      const telefone = (c.telefone ?? '').toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      return (
        nome.includes(searchLower) ||
        cpfCnpj.includes(searchLower) ||
        telefone.includes(searchLower) ||
        email.includes(searchLower)
      );
    });
  }, [customers, searchLower]);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    onClose();
  };

  const handleQuickSaved = (customer: Customer) => {
    onSelect(customer);
    setQuickOpen(false);
    onClose();
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingCustomer(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar cliente</DialogTitle>
          </DialogHeader>

          {/* Barra de pesquisa */}
          <div className="relative -mt-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome, CPF/CNPJ, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-9 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1 overflow-y-auto flex-1 min-h-0 pb-4">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2 group rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-primary-200 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => handleSelect(c)}
                  className="flex-1 min-w-0 flex items-center justify-between gap-2 py-2.5 px-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.nome}</p>
                    {c.telefone && (
                      <p className="text-xs text-gray-500 truncate">{c.telefone}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
                </button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-70 hover:opacity-100"
                      aria-label="Mais opções"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleEditClick(c)}
                      className="cursor-pointer"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar cliente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>

          {/* Footer fixo dentro do modal — não usa position:fixed da página */}
          <div className="flex-none border-t border-gray-200 pt-4 -mx-6 -mb-6 px-6 pb-6 bg-white rounded-b-lg">
            <Button
              type="button"
              className="w-full h-11"
              onClick={() => setQuickOpen(true)}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Cadastrar cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <QuickCustomerModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSaved={handleQuickSaved}
      />

      <CustomerForm
        open={formOpen}
        onClose={handleFormClose}
        customer={editingCustomer}
      />
    </>
  );
}
