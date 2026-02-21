import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, getProfile, isSupabaseConfigured } from '../lib/supabase';
import { useStore } from '../store';
import { toast } from '../hooks/useToast';
import { Loader2 } from 'lucide-react';

/**
 * Página de callback OAuth. Troca o código de autorização por sessão e redireciona.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const { setSessionFromUser } = useStore();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Erro',
        description: 'Supabase não configurado.',
        variant: 'destructive',
      });
      navigate('/login', { replace: true });
      return;
    }

    const handleCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');
        const hashParams = new URLSearchParams(window.location.hash?.substring(1) || '');
        const codeFromHash = hashParams.get('code');

        const authCode = code || codeFromHash;

        if (!authCode) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const profile = await getProfile(session.user.id).catch(() => null);
            setSessionFromUser(session.user.id, session.user.email ?? '', profile);
            navigate('/', { replace: true });
            return;
          }
          throw new Error('Código de autorização não encontrado.');
        }

        const { data, error } = await supabase.auth.exchangeCodeForSession(authCode);

        if (error) {
          throw error;
        }

        if (data?.session?.user) {
          const profile = await getProfile(data.session.user.id).catch(() => null);
          setSessionFromUser(data.session.user.id, data.session.user.email ?? '', profile);
          navigate('/', { replace: true });
        } else {
          throw new Error('Sessão não retornada.');
        }
      } catch (err) {
        setStatus('error');
        toast({
          title: 'Não foi possível entrar com Google',
          description: 'Tente novamente.',
          variant: 'destructive',
        });
        navigate('/login', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, setSessionFromUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))] p-4">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-sm text-[rgb(var(--muted))]">
          {status === 'loading' ? 'Entrando...' : 'Redirecionando...'}
        </p>
      </div>
    </div>
  );
}
