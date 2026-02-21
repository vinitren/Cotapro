import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Package, Settings, Receipt, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

const LOGO_COMPLETA_SRC = '/brand/cotapro-logo-cropped.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/quotes', icon: FileText, label: 'Orçamentos' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/catalog', icon: Package, label: 'Catálogo' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
  { to: '/ajuda', icon: HelpCircle, label: 'Ajuda' },
];

export function Sidebar() {
  const [logoError, setLogoError] = useState(false);

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
      <div className="flex items-center h-16 px-6 border-b border-gray-200">
        <Link to="/" className="flex items-center min-w-0">
          {logoError ? (
            <>
              <Receipt className="h-8 w-8 shrink-0 text-primary" />
              <span className="ml-2 text-xl font-bold text-gray-900">CotaPro</span>
            </>
          ) : (
            <img
              src={LOGO_COMPLETA_SRC}
              alt="CotaPro"
              onError={() => setLogoError(true)}
              className="h-10 w-auto object-contain object-left"
            />
          )}
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="h-5 w-5 mr-3" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
