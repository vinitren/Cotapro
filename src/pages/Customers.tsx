import { useState, useEffect } from 'react';
import { Plus, Search, User, Phone, Mail, Trash2, Edit, Users } from 'lucide-react';
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
import { useStore } from '../store';
import { formatDate, formatQuoteDisplay } from '../lib/utils';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { CustomerForm } from '../components/customers/CustomerForm';
import type { Customer } from '../types';
import { toast } from '../hooks/useToast';

export function Customers() {
  const { customers, deleteCustomer, quotes, loadCustomers } = useStore();
  const [search, setSearch] = useState('');
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
    return (
      nome.includes(searchLower) ||
      cpfCnpj.includes(searchLower) ||
      telefone.includes(searchLower) ||
      email.includes(searchLower)
    );
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por nome, CPF/CNPJ, telefone ou email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredCustomers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </h3>
            <p className="text-gray-500 text-center mb-4">
              {search
                ? 'Tente buscar por outro nome'
                : 'Comece adicionando seu primeiro cliente!'}
            </p>
            {!search && (
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
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{customer?.nome ?? ''}</h3>
                        <Badge variant="secondary" className="text-xs mt-0.5">
                          {customer.tipo === 'pessoa_fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{customer?.telefone ?? ''}</span>
                    </div>
                    {(customer?.email ?? '') && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="h-4 w-4" />
                        <span className="truncate">{customer?.email ?? ''}</span>
                      </div>
                    )}
                  </div>

                  {lastQuote && (
                    <div className="py-2 px-3 bg-gray-50 rounded-lg mb-4">
                      <p className="text-xs text-gray-500">Último orçamento</p>
                      <p className="text-sm font-medium text-gray-900">
                        {formatQuoteDisplay(lastQuote)} - {formatDate(lastQuote.data_emissao)}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(customer)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setDeleteConfirm(customer)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
