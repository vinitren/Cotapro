import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { CheckCircle2, Zap, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader } from '../components/ui/card';
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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-primary-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Coluna esquerda - Painel de branding (oculto no mobile) - dark mode premium */}
        <div className="hidden lg:flex relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl shadow-black/30 backdrop-blur-sm">
          {/* Container dos efeitos neon - filete */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0">
            {/* 1) Glow radial verde - canto inferior esquerdo */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse 70% 50% at 20% 100%, rgba(22, 163, 74, 0.1) 0%, transparent 55%)',
                filter: 'blur(64px)',
              }}
            />
            {/* 2) Filete/feixe diagonal verde */}
            <div
              className="absolute w-[200%] h-[200%]"
              style={{
                left: '-50%',
                top: '-50%',
                background: 'linear-gradient(135deg, transparent 48%, rgba(22, 163, 74, 0.1) 50%, transparent 52%)',
                filter: 'blur(28px)',
                transform: 'rotate(-12deg)',
              }}
            />
          </div>
          {/* Conteúdo */}
          <div className="relative z-10 flex flex-col justify-center px-8 py-12 text-white">
            <div className="space-y-10">
              <div className="space-y-6">
                <img
                  src="/brand/cotapro-logo-branca-login.png"
                  alt="CotaPro"
                  className="h-12 w-auto object-contain object-left"
                />
                <h2 className="text-3xl xl:text-4xl font-bold leading-tight text-white">
                  Venda mais rápido. Receba mais fácil.
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed">
                  O CotaPro transforma seus orçamentos em propostas profissionais com QR Code Pix automático e tudo pronto para fechar.
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-7 w-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white">Proposta pronta em 1 minuto.</h3>
                    <p className="text-gray-400 text-sm mt-0.5">
                      Ganhe tempo no seu dia a dia.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-7 w-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white">QR Code Pix automático em todos os orçamentos.</h3>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-7 w-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white">Personalizado com a identidade da sua empresa.</h3>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-7 w-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white">Feito por vendedor, pensado para quem vende de verdade.</h3>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="mt-0.5 h-7 w-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-primary-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-white">Totalmente otimizado para ganhar tempo no celular.</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna direita - Card do formulário */}
        <div className="w-full">
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
        </div>
      </div>
    </div>
  );
}
