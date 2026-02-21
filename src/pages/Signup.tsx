import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card';
import { AuthLayout } from '../components/layout/AuthLayout';
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
    <AuthLayout variant="signup">
      <Card className="w-full max-w-md mx-auto border border-gray-100 shadow-xl shadow-gray-200/50 rounded-2xl">
        <CardHeader className="text-center pb-8 pt-2 lg:pt-8 px-8">
          <div className="flex flex-col items-center gap-0 lg:gap-1">
            {/* Logo completa - somente mobile */}
            <img
              src="/brand/Cota%20pro%20logo%20preta%20completa%20png.png"
              alt="CotaPro"
              className="lg:hidden w-64 h-auto object-contain mx-auto mb-3"
            />
            {/* Título mobile */}
            <h1 className="lg:hidden text-2xl font-extrabold text-[rgb(var(--fg))] tracking-tight">
              Criar conta
            </h1>
            {/* Título desktop */}
            <p className="hidden lg:block text-xs sm:text-sm font-semibold uppercase tracking-wide text-[rgb(var(--fg))]">
              CRIAR CONTA NO
            </p>
            <h1 className="hidden lg:block text-3xl sm:text-4xl font-extrabold tracking-tight">
              <span className="text-[rgb(var(--fg))]">Cota</span><span className="text-primary">Pro</span>
            </h1>
            <CardDescription className="text-base text-[rgb(var(--muted))] font-normal mt-1 lg:mt-2">
              Comece a criar orçamentos profissionais agora
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          {!isSupabaseConfigured && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              Supabase não configurado. Defina <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> nas variáveis de ambiente da Vercel e faça um novo deploy.
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[rgb(var(--fg))]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={!!errors.email}
                disabled={loading}
                className="h-12 rounded-xl"
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[rgb(var(--fg))]">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={!!errors.password}
                disabled={loading}
                className="h-12 rounded-xl"
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_name" className="text-sm font-medium text-[rgb(var(--fg))]">
                Nome da empresa
              </Label>
              <Input
                id="company_name"
                type="text"
                placeholder="Minha Empresa LTDA"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                error={!!errors.company_name}
                disabled={loading}
                className="h-12 rounded-xl"
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name}</p>
              )}
            </div>

            {errors.submit && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}
            {confirmMessage && (
              <p className="text-sm text-primary-600 bg-primary-50 p-3 rounded-xl border border-primary-100">
                {confirmMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary-hover text-white shadow-sm transition-colors"
              disabled={loading || !isSupabaseConfigured}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Button>
          </form>

          <div className="relative pt-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-100"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-[rgb(var(--card))] text-[rgb(var(--muted))]">Já tem conta?</span>
            </div>
          </div>

          <p className="text-center text-sm text-[rgb(var(--muted))] pt-1">
            <Link
              to="/login"
              className="text-primary hover:text-primary-hover font-semibold hover:underline transition-colors"
            >
              Fazer login
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Benefícios Mobile */}
      <div className="lg:hidden mt-6 space-y-1 text-center px-4">
        <p className="text-sm text-[rgb(var(--muted))] font-medium leading-tight">Propostas prontas antes do cliente pedir.</p>
        <p className="text-sm text-[rgb(var(--muted))] font-medium leading-tight">Pagamento sem complicação.</p>
        <p className="text-sm text-[rgb(var(--muted))] font-medium leading-tight">Mais fechamentos comprovados.</p>
      </div>
    </AuthLayout>
  );
}
