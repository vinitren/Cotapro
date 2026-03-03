import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { toast } from '../hooks/useToast';
import type { Quote } from '../types';

const SUGESTOES = [
  { label: 'Lembrete', text: (nome: string) => `Olá ${nome}, conseguiu analisar o orçamento?` },
  { label: 'Consultivo', text: (nome: string) => `${nome}, ficou alguma dúvida ou ponto que possamos ajustar no orçamento?` },
  { label: 'Direto', text: (nome: string) => `${nome}, podemos confirmar o orçamento para dar andamento?` },
  { label: 'Agressivo estratégico', text: (nome: string) => `${nome}, estou fechando a agenda e preciso confirmar se seguimos com seu pedido.` },
  { label: 'Urgência', text: (nome: string) => `${nome}, o orçamento está dentro do prazo, posso reservar para você?` },
] as const;

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: Quote;
}

export function FollowUpModal({ isOpen, onClose, quote }: FollowUpModalProps) {
  const [mensagem, setMensagem] = useState('');

  const cliente = quote?.cliente;
  const nomePrimeiro = cliente?.nome?.split(' ')[0] || cliente?.nome || 'Cliente';

  useEffect(() => {
    if (isOpen) {
      setMensagem('');
    }
  }, [isOpen]);

  const handleEnviarWhatsApp = () => {
    if (!mensagem.trim()) {
      toast({
        title: 'Digite uma mensagem',
        description: 'Preencha o campo de mensagem antes de enviar.',
        variant: 'destructive',
      });
      return;
    }

    const telefoneLimpo = (cliente?.telefone ?? '').replace(/\D/g, '');
    if (!telefoneLimpo || telefoneLimpo.length < 10) {
      toast({
        title: 'Telefone não cadastrado',
        description: 'O cliente não possui um telefone válido cadastrado.',
        variant: 'destructive',
      });
      return;
    }

    const telefone = telefoneLimpo.startsWith('55') ? telefoneLimpo : `55${telefoneLimpo}`;
    const url = `https://wa.me/${telefone}?text=${encodeURIComponent(mensagem.trim())}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar mensagem de follow-up</DialogTitle>
          <DialogDescription>
            Escolha uma abordagem ou escreva sua própria mensagem para enviar ao cliente via WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium text-[rgb(var(--fg))]">Sua mensagem</label>
            <Textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value.slice(0, 500))}
              placeholder="Digite sua mensagem..."
              rows={4}
              className="mt-2 resize-y"
              maxLength={500}
            />
            <p className="text-xs text-[rgb(var(--muted))] text-right mt-1">{mensagem.length} / 500</p>
          </div>

          <div>
            <p className="text-sm font-medium text-[rgb(var(--fg))] mb-2">Tipos de abordagem</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES.map(({ label, text }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setMensagem(text(nomePrimeiro).slice(0, 500))}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[rgb(var(--border))] bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={handleEnviarWhatsApp}
            disabled={!mensagem.trim()}
            className="w-full bg-[#25D366] hover:bg-[#20BD5A] text-white"
            title={!mensagem.trim() ? 'Digite uma mensagem' : undefined}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar mensagem
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
