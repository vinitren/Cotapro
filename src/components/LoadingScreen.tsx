import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))]">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-[rgb(var(--fg))]">CotaPro</h2>
          <p className="text-sm text-[rgb(var(--muted))] mt-1">Carregando...</p>
        </div>
      </div>
    </div>
  );
}
