import { useState, useEffect } from 'react';
import { Plus, Search, Trash2, Edit, Users, MoreVertical, Filter } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
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
import { formatDate, formatQuoteDisplay } from '../lib/utils';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { CustomerForm } from '../components/customers/CustomerForm';
import type { Customer } from '../types';
import { toast } from '../hooks/useToast';

export function Customers() {
  const { customers, deleteCustomer, quotes, loadCustomers } = useStore();
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'all' | 'pessoa_fisica' | 'pessoa_juridica'>('all');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await loadCustomers();
      } catch (error) {
        toast({
          title: 'Erro ao carregar clientes',
          description: 'Não foi possível carregar a lista de clientes. Verifique sua conexão.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [loadCustomers]);

  const searchLower = (search || '').toLowerCase().trim();
  const filteredCustomers = (customers ?? []).filter((customer) => {
    if (!customer) return false;
    const nome = (customer.nome ?? '').toLowerCase();
    const cpfCnpj = (customer.cpf_cnpj ?? '').toLowerCase();
    const telefone = (customer.telefone ?? '').toLowerCase();
    const email = (customer.email ?? '').toLowerCase();
    const matchesSearch =
      nome.includes(searchLower) ||
      cpfCnpj.includes(searchLower) ||
      telefone.includes(searchLower) ||
      email.includes(searchLower);
    const matchesTipo = tipoFilter === 'all' || customer.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const getLastQuote = (customerId: string) => {
    const customerQuotes = quotes.filter((q) => q.cliente_id === customerId);
    if (customerQuotes.length === 0) return null;
    return customerQuotes.sort(
      (a, b) => new Date(b.data_criacao).getTime() - new Date(a.data_criacao).getTime()
    )[0];
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      try {
        await deleteCustomer(deleteConfirm.id);
        toast({
          title: 'Cliente excluído',
          description: `${deleteConfirm?.nome ?? 'Cliente'} foi removido com sucesso.`,
          variant: 'success',
        });
        setDeleteConfirm(null);
      } catch (error) {
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao excluir cliente. Tente novamente.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500">Gerencie seus clientes</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Cliente
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Dialog open={filterPanelOpen} onOpenChange={setFilterPanelOpen}>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setFilterPanelOpen(true)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtro
            {tipoFilter !== 'all' && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                1
              </Badge>
            )}
          </Button>
          <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>Filtre por tipo de pessoa.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-2">
              {(['all', 'pessoa_fisica', 'pessoa_juridica'] as const).map((v) => (
                <Button
                  key={v}
                  variant={tipoFilter === v ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipoFilter(v)}
                >
                  {v === 'all' ? 'Todos' : v === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tipoFilter !== 'all' && (
        <div className="flex flex-wrap gap-2">
          <Badge
            variant="secondary"
            className="cursor-pointer hover:bg-gray-300"
            onClick={() => setTipoFilter('all')}
          >
            Tipo: {tipoFilter === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'} ×
          </Badge>
        </div>
      )}

      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {search || tipoFilter !== 'all' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {search || tipoFilter !== 'all'
                ? 'Tente ajustar os filtros'
                : 'Comece adicionando seu primeiro cliente!'}
            </p>
            {!search && tipoFilter === 'all' && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Cliente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => {
            const lastQuote = getLastQuote(customer.id);
            return (
              <Card key={customer.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-2.5 sm:p-3">
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {[customer?.nome, customer?.telefone, customer?.email].filter(Boolean).join(' • ')}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {lastQuote
                          ? `${formatQuoteDisplay(lastQuote)} — ${formatDate(lastQuote.data_emissao)}`
                          : '—'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {customer.tipo === 'pessoa_fisica' ? 'PF' : 'PJ'}
                    </Badge>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-7 sm:h-8 px-2 text-xs"
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 sm:h-8 sm:w-8 shrink-0"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => handleEdit(customer)}
                          className="cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(customer)}
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
            );
          })}
        </div>
      )}

      <CustomerForm
        open={isFormOpen}
        onClose={handleFormClose}
        customer={editingCustomer}
      />

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente {deleteConfirm?.nome ?? 'este'}? Esta
              ação não pode ser desfeita.
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
