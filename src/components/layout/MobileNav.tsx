import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, Users, Package, Settings, X, Receipt } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect } from 'react';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/quotes', icon: FileText, label: 'Orçamentos' },
  { to: '/customers', icon: Users, label: 'Clientes' },
  { to: '/catalog', icon: Package, label: 'Catálogo' },
  { to: '/settings', icon: Settings, label: 'Configurações' },
];

export function MobileNav({ open, onClose }: MobileNavProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="fixed inset-y-0 left-0 w-72 bg-[rgb(var(--card))] shadow-xl">
        <div className="flex items-center justify-between h-16 px-4 border-b border-[rgb(var(--border))]">
          <div className="flex items-center">
            <Receipt className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-bold text-[rgb(var(--fg))]">CotaPro</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <X className="h-5 w-5 text-[rgb(var(--muted))]" />
          </button>
        </div>

        <nav className="px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-[rgb(var(--muted))] hover:bg-white/10 hover:text-[rgb(var(--fg))]'
                )
              }
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
