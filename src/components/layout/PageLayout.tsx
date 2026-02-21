import { cn } from '../../lib/utils';

/** Classes padrão para o wrapper de páginas (padding e espaçamento vertical). */
export const pageLayoutClasses = 'p-4 lg:p-6 space-y-6 lg:space-y-8';

/** Classes padrão para cards de conteúdo (bordas, raio, sombra). */
export const pageCardClasses =
  'rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--card))]/80 dark:bg-[rgb(var(--card))]/90 backdrop-blur-sm shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.3)]';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return <div className={cn(pageLayoutClasses, className)}>{children}</div>;
}
