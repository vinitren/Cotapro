import { useState } from 'react';
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
import { CustomerQuickPaste } from './CustomerQuickPaste';
import { useStore } from '../../store';
import { maskPhone } from '../../lib/utils';
import type { Customer } from '../../types';
import { toast } from '../../hooks/useToast';

const defaultEndereco = {
  rua: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  cep: '',
};

interface QuickCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

export function QuickCustomerModal({ open, onClose, onSaved }: QuickCustomerModalProps) {
  const { addCustomer } = useStore();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ nome?: string; email?: string }>({});

  const handleClose = () => {
    setNome('');
    setEmail('');
    setTelefone('');
    setErrors({});
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { nome?: string; email?: string } = {};
    if (!nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      newErrors.email = 'E-mail inválido';
    }
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const customer = await addCustomer({
        tipo: 'pessoa_fisica',
        nome: nome.trim(),
        cpf_cnpj: '',
        telefone: telefone.trim() || '',
        email: email.trim() || '',
        endereco: defaultEndereco,
        observacoes: '',
      });

      toast({
        title: 'Cliente cadastrado',
        description: `${customer.nome} foi adicionado e já está selecionado.`,
        variant: 'success',
      });

      onSaved(customer);
      handleClose();
    } catch (error) {
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao cadastrar cliente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cliente (cadastro rápido)</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <CustomerQuickPaste
            onFill={(data) => {
              if (data.nome) setNome(data.nome);
              if (data.email) setEmail(data.email);
              if (data.telefone) setTelefone(maskPhone(data.telefone));
            }}
          />
          <div className="space-y-2">
            <Label htmlFor="quick-nome">Nome *</Label>
            <Input
              id="quick-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome ou razão social"
              error={!!errors.nome}
              disabled={isSubmitting}
            />
            {errors.nome && (
              <p className="text-sm text-red-500">{errors.nome}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-email">E-mail</Label>
            <Input
              id="quick-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@exemplo.com"
              error={!!errors.email}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="quick-telefone">Telefone</Label>
            <Input
              id="quick-telefone"
              value={telefone}
              onChange={(e) => setTelefone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar e selecionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
