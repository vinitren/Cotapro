import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Receipt, CheckCircle2, Zap, Shield, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Lado Esquerdo - Branding e Benefícios (Desktop) */}
        <div className="hidden lg:block text-white space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Receipt className="h-7 w-7 text-white" />
              </div>
              <h1 className="text-4xl font-bold">CotaPro</h1>
            </div>
            <h2 className="text-3xl font-bold leading-tight">
              Aumente suas vendas com orçamentos profissionais em poucos minutos
            </h2>
            <p className="text-lg text-emerald-50 leading-relaxed">
              No celular ou computador, com rapidez e aparência profissional.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Pare de perder tempo com ferramentas complicadas</h3>
                <p className="text-emerald-50 text-sm">
                  Nada de Canva demorado, planilhas ultrapassadas ou orçamentos sem credibilidade.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Mais profissionalismo no atendimento</h3>
                <p className="text-emerald-50 text-sm">
                  Envie propostas com visual moderno e valores organizados.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Acompanhe suas vendas no dashboard</h3>
                <p className="text-emerald-50 text-sm">
                  Visualize orçamentos enviados, valores e status em um só lugar.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 h-6 w-6 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Pensado para quem vende de verdade</h3>
                <p className="text-emerald-50 text-sm">
                  Interface rápida, simples e otimizada para uso no celular.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito - Card de Login */}
        <div className="w-full">
          <Card className="w-full max-w-md mx-auto shadow-2xl border-0 rounded-3xl">
            <CardHeader className="text-center space-y-3 pb-6">
              {/* Logo mobile */}
              <div className="flex justify-center lg:hidden mb-2">
                <div className="h-14 w-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
                  <Receipt className="h-7 w-7 text-emerald-600" />
                </div>
              </div>
              <CardTitle className="text-3xl font-bold text-gray-900">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-base text-gray-600">
                Entre com sua conta para continuar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isSupabaseConfigured && (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
                  Supabase não configurado. Defina <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> nas variáveis de ambiente da Vercel e faça um novo deploy.
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
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
                    className="h-11 rounded-xl"
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
                    className="h-11 rounded-xl"
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
                  className="w-full h-12 rounded-xl text-base font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg hover:shadow-xl transition-all duration-200" 
                  disabled={loading || !isSupabaseConfigured}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Novo por aqui?</span>
                </div>
              </div>

              <p className="text-center text-sm text-gray-600">
                <Link 
                  to="/signup" 
                  className="text-emerald-600 hover:text-emerald-700 font-semibold hover:underline transition-colors"
                >
                  Criar uma conta gratuita
                </Link>
              </p>
            </CardContent>
          </Card>

          {/* Benefícios Mobile */}
          <div className="lg:hidden mt-8 space-y-3 text-white text-center px-4">
            <p className="text-sm text-emerald-50 font-medium">
              ✓ Orçamentos profissionais • ✓ Catálogo de produtos • ✓ Dados seguros
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
