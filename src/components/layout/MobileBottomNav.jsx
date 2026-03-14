import { useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiTarget, FiUsers, FiSettings } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();

  const isAdminUser = isAdmin();
  const clientId = profile?.client_id;

  const getNavItems = () => {
    const items = [
      {
        id: 'home',
        icon: FiHome,
        label: 'Home',
        path: '/',
        show: true
      },
      {
        id: 'campaigns',
        icon: FiTarget,
        label: 'Campaigns',
        path: isAdminUser ? '/agency' : (clientId ? `/client/${clientId}` : '/'),
        show: true
      },
      {
        id: 'clients',
        icon: FiUsers,
        label: 'Clients',
        path: '/agency',
        show: isAdminUser
      },
      {
        id: 'settings',
        icon: FiSettings,
        label: 'Settings',
        path: '/profile',
        show: true
      }
    ];

    return items.filter(item => item.show);
  };

  const navItems = getNavItems();

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <div
        className="flex items-center justify-around px-2 py-2 pb-safe"
        style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1px solid var(--nav-border)'
        }}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl transition-all duration-200"
              style={{
                background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                color: active ? 'var(--brand-primary)' : 'var(--text-tertiary)'
              }}
            >
              <Icon
                size={22}
                style={{
                  strokeWidth: active ? 2.5 : 2,
                  marginBottom: '4px'
                }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: active ? 'var(--brand-primary)' : 'var(--text-tertiary)' }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}