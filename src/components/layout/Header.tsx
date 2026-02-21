import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Receipt, Sun, Moon } from 'lucide-react';
import { Button } from '../ui/button';
import { useTheme } from '../../context/ThemeContext';

const LOGO_BLACK = '/brand/cotapro-logo-cropped.png';
const LOGO_WHITE = '/brand/cotapro-logo-branca-login.png';

export function Header() {
  const [logoError, setLogoError] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 bg-[rgb(var(--card))] border-b border-[rgb(var(--border))]">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center flex-1 lg:hidden">
          <Link to="/" className="flex items-center -ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10">
            {logoError ? (
              <>
                <Receipt className="h-7 w-7 shrink-0 text-primary" />
                <span className="ml-2 text-lg font-bold text-[rgb(var(--fg))] truncate">CotaPro</span>
              </>
            ) : (
              <>
                <img src={LOGO_BLACK} alt="CotaPro" onError={() => setLogoError(true)} className="h-10 w-auto object-contain flex-shrink-0 dark:hidden" />
                <img src={LOGO_WHITE} alt="CotaPro" onError={() => setLogoError(true)} className="h-10 w-auto object-contain flex-shrink-0 hidden dark:block" />
              </>
            )}
          </Link>
        </div>
        <div className="hidden lg:block flex-1" />

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-[rgb(var(--fg))] hover:bg-gray-100 dark:hover:bg-white/10"
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
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
