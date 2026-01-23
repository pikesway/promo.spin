import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import MobileBottomNav from './MobileBottomNav';

const PUBLIC_ROUTES = ['/login', '/signup', '/play', '/redeem'];

export default function AppLayout({ children }) {
  const location = useLocation();
  const { user } = useAuth();

  const isPublicRoute = PUBLIC_ROUTES.some(route => location.pathname.startsWith(route));
  const showBottomNav = user && !isPublicRoute;

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <main className={showBottomNav ? 'safe-bottom' : ''}>
        {children}
      </main>
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}
