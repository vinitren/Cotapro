import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Receipt } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { useStore } from '../store';
import { supabase, upsertProfile, isSupabaseConfigured } from '../lib/supabase';
import { getProfile } from '../lib/supabase';

export function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    company_name?: string;
    submit?: string;
  }>({});
  const [confirmMessage, setConfirmMessage] = useState('');
  const { setSessionFromUser, isAuthenticated } = useStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }

    if (!password) {
      newErrors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (!companyName.trim()) {
      newErrors.company_name = 'Nome da empresa é obrigatório';
    }

    setErrors(newErrors);
    setConfirmMessage('');
    if (Object.keys(newErrors).length > 0) return;

    if (!isSupabaseConfigured) {
      setErrors({
        submit:
          'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel (Settings → Environment Variables) e faça um novo deploy.',
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { company_name: companyName.trim() },
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/`,
        },
      });

      if (error) {
        setErrors({
          submit:
            error.message.includes('already registered')
              ? 'Este e-mail já está cadastrado. Faça login.'
              : error.message,
        });
        setLoading(false);
        return;
      }

      if (!data.user) {
        setErrors({
          submit: 'Erro ao criar usuário. Tente novamente.',
        });
        setLoading(false);
        return;
      }

      // Só salva o perfil se houver uma sessão válida (usuário autenticado)
      if (data.session) {
        try {
          // Aguarda um pequeno delay para garantir que a sessão está totalmente estabelecida
          // Isso ajuda o RLS a reconhecer auth.uid() corretamente
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Verifica novamente a sessão antes de inserir
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (!currentSession) {
            throw new Error('Sessão não encontrada após cadastro.');
          }

          await upsertProfile({
            id: data.user.id,
            email: data.user.email ?? email,
            company_name: companyName.trim(),
          });
          
          const profile = await getProfile(data.user.id).catch(() => null);
          setSessionFromUser(data.user.id, data.user.email ?? email, profile);
          navigate('/', { replace: true });
        } catch (profileError: any) {
          console.error('Erro ao salvar perfil:', profileError);
          setErrors({
            submit: profileError?.message || 'Erro ao salvar dados do perfil. Tente fazer login novamente.',
          });
        }
      } else {
        // Se não há sessão (confirmação de email habilitada), o perfil será criado no trigger ou no primeiro login
        setConfirmMessage(
          'Conta criada! Verifique seu e-mail para confirmar o cadastro e depois faça login.'
        );
      }
    } catch (err) {
      console.error('Erro no cadastro:', err);
      setErrors({
        submit: err instanceof Error ? err.message : 'Erro ao cadastrar. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Receipt className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Criar conta</CardTitle>
          <CardDescription>
            Cadastre-se para usar o CotaPro
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSupabaseConfigured && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Supabase não configurado. Defina <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> nas variáveis de ambiente da Vercel e faça um novo deploy.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                disabled={loading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!errors.password}
                disabled={loading}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da empresa</Label>
              <Input
                id="company_name"
                type="text"
                placeholder="Minha Empresa LTDA"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={!!errors.company_name}
                disabled={loading}
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name}</p>
              )}
            </div>

            {errors.submit && (
              <p className="text-sm text-red-500">{errors.submit}</p>
            )}
            {confirmMessage && (
              <p className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                {confirmMessage}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
