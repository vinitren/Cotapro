import { Loader2 } from 'lucide-react';

export function LoadingSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Carregando dados...</p>
        </div>
      </div>
    </div>
  );
}
