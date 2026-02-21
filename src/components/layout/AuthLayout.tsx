import { CheckCircle2, Zap, TrendingUp, Target, MessageSquare, Users, Puzzle } from 'lucide-react';

interface BulletItem {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
}

interface LeftPanelContent {
  title: string;
  subtitle: string;
  bullets: BulletItem[];
  footer?: string;
}

const LOGIN_PANEL: LeftPanelContent = {
  title: 'O cliente não espera. Sua venda também não deveria.',
  subtitle: 'Negociações esfriam rápido. Quem acompanha fecha. Quem esquece, perde.\n\nCrie orçamentos profissionais em PDF com QR Code Pix automático em minutos — e mantenha suas oportunidades sob controle.',
  bullets: [
    { title: 'Orçamento pronto para enviar em 1 minuto', subtitle: 'PDF profissional com seus dados e Pix configurado automaticamente.', icon: <Zap className="h-4 w-4 text-primary-400" /> },
    { title: 'Retome negociações no momento certo', subtitle: 'Saiba exatamente quais clientes precisam de atenção hoje.', icon: <Target className="h-4 w-4 text-primary-400" /> },
    { title: 'Evite perder vendas pela correria', subtitle: 'Organize suas propostas e acompanhe cada oportunidade.', icon: <CheckCircle2 className="h-4 w-4 text-primary-400" /> },
    { title: 'Venda com método, não na memória', subtitle: 'Tenha controle real das negociações em andamento.', icon: <TrendingUp className="h-4 w-4 text-primary-400" /> },
  ],
};

const SIGNUP_PANEL: LeftPanelContent = {
  title: 'Não perca mais vendas por falta de acompanhamento.',
  subtitle: 'O CotaPro ajuda você a organizar seus clientes, acompanhar negociações e agir na hora certa — sem depender da memória ou da correria do dia a dia.',
  bullets: [
    { title: 'Saiba exatamente quem precisa de atenção hoje', subtitle: 'Visualize rapidamente quais orçamentos estão aguardando resposta.', icon: <Target className="h-4 w-4 text-primary-400" /> },
    { title: 'Cuide melhor das oportunidades que geram faturamento', subtitle: 'Organize seus clientes e foque em quem realmente pode fechar.', icon: <Users className="h-4 w-4 text-primary-400" /> },
    { title: 'Envie a mensagem certa no momento certo', subtitle: 'Tenha sugestões prontas para retomar negociações com segurança.', icon: <MessageSquare className="h-4 w-4 text-primary-400" /> },
    { title: 'Trabalhe junto com o que você já usa', subtitle: 'O CotaPro complementa sua rotina, sem substituir suas ferramentas.', icon: <Puzzle className="h-4 w-4 text-primary-400" /> },
  ],
  footer: 'Mais de 1.000 vendedores já usam o CotaPro para vender com mais organização.',
};

interface AuthLayoutProps {
  children: React.ReactNode;
  /** 'login' = painel padrão (funcionalidades). 'signup' = painel focado em benefícios. */
  variant?: 'login' | 'signup';
}

/**
 * Layout compartilhado para páginas de autenticação (login/signup).
 * Duas colunas no desktop: painel esquerdo escuro com logo + headline + bullets,
 * card branco à direita. Mobile: coluna única, stack centralizado.
 */
export function AuthLayout({ children, variant = 'login' }: AuthLayoutProps) {
  const panel = variant === 'signup' ? SIGNUP_PANEL : LOGIN_PANEL;
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
                  {panel.title}
                </h2>
                <p className="text-lg text-gray-300 leading-relaxed whitespace-pre-line">
                  {panel.subtitle}
                </p>
              </div>

              <div className="space-y-6">
                {panel.bullets.map((bullet, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="mt-0.5 h-7 w-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0">
                      {bullet.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-base text-white">{bullet.title}</h3>
                      {bullet.subtitle && (
                        <p className="text-gray-400 text-sm mt-0.5">{bullet.subtitle}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {panel.footer && (
                <p className="text-sm text-gray-500 pt-2">
                  {panel.footer}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Coluna direita - Card do formulário */}
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
