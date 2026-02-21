import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { WatermarkBrand } from './WatermarkBrand';
import { useStore } from '../../store';

export function Layout() {
  const { isAuthenticated } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="relative min-h-[100svh] min-h-screen bg-[rgb(var(--bg))] text-[rgb(var(--fg))]">
      <WatermarkBrand />
      <div className="relative z-10">
        <Sidebar />
        <div className="lg:pl-64">
          <Header />
          <main className="pb-20 lg:pb-8 bg-transparent">
            <Outlet />
          </main>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
