import { Link, useNavigate } from 'react-router-dom';
import { Plus, LogOut, User, Receipt } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useStore } from '../../store';

export function Header() {
  const { userName, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center lg:hidden">
          <Link to="/" className="flex items-center -ml-2 p-2 rounded-lg hover:bg-gray-100">
            <Receipt className="h-7 w-7 text-primary" />
            <span className="ml-2 text-lg font-bold text-gray-900">CotaPro</span>
          </Link>
        </div>

        <div className="hidden lg:block" />

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

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5 text-gray-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{userName}</span>
                    <span className="text-xs text-gray-500">Minha Conta</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
  );
}
