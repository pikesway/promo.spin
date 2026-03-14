import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from './MobileBottomNav';
import GlobalHeader from './GlobalHeader';

const PUBLIC_ROUTES = ['/loyalty'];

export default function AppLayout({ children }) {
  const location = useLocation();
  const { user } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));
  const isAuthRoute = ['/login', '/signup'].includes(location.pathname);
  const showHeader = !isPublicRoute;
  const showBottomNav = user && !isPublicRoute && !isAuthRoute;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      {showHeader && <GlobalHeader />}
      <main className={`${showBottomNav ? 'safe-bottom' : ''} ${showHeader ? 'pt-14' : ''}`}>
        {children}
      </main>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}