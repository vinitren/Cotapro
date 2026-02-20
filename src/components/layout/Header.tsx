import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Receipt } from 'lucide-react';
import { Button } from '../ui/button';

const LOGO_SRC = '/brand/cotapro-logo-cropped.png';

export function Header() {
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center flex-1 lg:hidden">
          <Link to="/" className="flex items-center -ml-2 p-2 rounded-lg hover:bg-gray-100">
            {logoError ? (
              <>
                <Receipt className="h-7 w-7 shrink-0 text-primary" />
                <span className="ml-2 text-lg font-bold text-gray-900 truncate">CotaPro</span>
              </>
            ) : (
              <img
                src={LOGO_SRC}
                alt="CotaPro"
                onError={() => setLogoError(true)}
                className="h-10 w-auto object-contain flex-shrink-0"
              />
            )}
          </Link>
        </div>
        <div className="hidden lg:block flex-1" />

        <div className="flex items-center gap-3">
          <Link to="/quotes/new">
            <Button size="sm" className="hidden sm:flex">
              <Plus className="h-4 w-4 mr-2" />
              Novo Orcamento
            </Button>
            <Button size="icon" className="sm:hidden">
              <Plus className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
