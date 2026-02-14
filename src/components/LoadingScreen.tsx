import { Loader2 } from 'lucide-react';

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-white">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <Loader2 className="h-12 w-12 text-emerald-600 animate-spin" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">CotaPro</h2>
          <p className="text-sm text-gray-500 mt-1">Carregando...</p>
        </div>
      </div>
    </div>
  );
}
