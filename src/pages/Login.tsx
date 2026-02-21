import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/useToast';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card';
import { AuthLayout } from '../components/layout/AuthLayout';
import { useStore } from '../store';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getProfile } from '../lib/supabase';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; submit?: string }>({});
  const { setSessionFromUser, isAuthenticated } = useStore();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string; submit?: string } = {};

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

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    if (!isSupabaseConfigured) {
      setErrors({
        submit:
          'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY na Vercel (Settings → Environment Variables) e faça um novo deploy.',
      });
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrors({
          submit:
            error.message === 'Invalid login credentials'
              ? 'Email ou senha incorretos.'
              : error.message,
        });
        setLoading(false);
        return;
      }
      if (!data.user) {
        setErrors({ submit: 'Erro ao fazer login. Tente novamente.' });
        setLoading(false);
        return;
      }
      const profile = await getProfile(data.user.id).catch(() => null);
      setSessionFromUser(data.user.id, data.user.email ?? email, profile);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Erro ao conectar. Verifique o Supabase.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isSupabaseConfigured) {
      toast({
        title: 'Supabase não configurado',
        description: 'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast({
          title: 'Erro ao entrar com Google',
          description: error.message || 'Tente novamente.',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível entrar com Google. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-md mx-auto border border-gray-100 shadow-xl shadow-gray-200/50 rounded-2xl">
            <CardHeader className="text-center pb-8 pt-2 lg:pt-8 px-8">
              <div className="flex flex-col items-center gap-0 lg:gap-1">
                {/* Logo completa - somente mobile */}
                <img
                  src="/brand/Cota%20pro%20logo%20preta%20completa%20png.png"
                  alt="CotaPro"
                  className="lg:hidden w-64 h-auto object-contain mx-auto mb-3"
                />
                {/* Título mobile: Bem-vindo de volta */}
                <h1 className="lg:hidden text-2xl font-extrabold text-gray-900 tracking-tight">
                  Bem-vindo de volta
                </h1>
                {/* Título desktop: BEM-VINDO DE VOLTA AO + CotaPro */}
                <p className="hidden lg:block text-xs sm:text-sm font-semibold uppercase tracking-wide text-gray-700">
                  BEM-VINDO DE VOLTA AO
                </p>
                <h1 className="hidden lg:block text-3xl sm:text-4xl font-extrabold tracking-tight">
                  <span className="text-gray-900">Cota</span><span className="text-primary">Pro</span>
                </h1>
                <CardDescription className="text-base text-gray-500 font-normal mt-1 lg:mt-2">
                  Entre com sua conta para continuar
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 px-8 pb-8">
              {!isSupabaseConfigured && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Supabase não configurado. Defina <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> nas variáveis de ambiente da Vercel e faça um novo deploy.
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl text-base font-semibold border-gray-200 hover:bg-gray-50 gap-2"
                onClick={handleGoogleLogin}
                disabled={!isSupabaseConfigured}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar com Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">ou</span>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
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
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    Senha
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
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

                {errors.submit && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{errors.submit}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 rounded-xl text-base font-semibold bg-primary hover:bg-primary-hover text-white shadow-sm transition-colors" 
                  disabled={loading || !isSupabaseConfigured}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <div className="relative pt-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Novo por aqui?</span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-500 pt-1">
                <Link 
                  to="/signup" 
                  className="text-primary hover:text-primary-hover font-semibold hover:underline transition-colors"
                >
                  Começar grátis
                </Link>
              </p>
            </CardContent>
          </Card>

      {/* Benefícios Mobile */}
      <div className="lg:hidden mt-6 space-y-1 text-center px-4">
        <p className="text-sm text-gray-500 font-medium leading-tight">Propostas prontas antes do cliente pedir.</p>
        <p className="text-sm text-gray-500 font-medium leading-tight">Pagamento sem complicação.</p>
        <p className="text-sm text-gray-500 font-medium leading-tight">Mais fechamentos comprovados.</p>
      </div>
    </AuthLayout>
  );
}
