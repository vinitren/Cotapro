import { useState } from 'react';
import { toast } from './useToast';
import { supabase } from '../lib/supabase';

export function useStripeCheckout() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async (userId: string, email: string) => {
    if (!email) {
      toast({
        title: 'Erro',
        description: 'Dados incompletos para ativar o plano.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.access_token) {
        throw new Error('Não foi possível obter a sessão de autenticação.');
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar checkout');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de checkout não retornada');
      }
    } catch (err) {
      toast({
        title: 'Erro ao ativar plano',
        description: err instanceof Error ? err.message : 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return { handleCheckout, loading };
}
