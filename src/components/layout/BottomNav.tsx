import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Package, Settings } from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Início' },
  { to: '/quotes', icon: FileText, label: 'Orçamentos' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/catalog', icon: Package, label: 'Catálogo' },
  { to: '/settings', icon: Settings, label: 'Config.' },
];

export function BottomNav() {
  const { pathname } = useLocation();
  // Na tela de criação de orçamento (mobile), só existe o sticky footer com "Gerar Orçamento" — sem BottomNav
  if (pathname === '/quotes/new') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center flex-1 h-full px-2 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-gray-500'
              )
            }
          >
            <item.icon className="h-5 w-5 mb-1" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
