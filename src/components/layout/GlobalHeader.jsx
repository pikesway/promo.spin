import { useAuth } from '../../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { FiMenu, FiX } from 'react-icons/fi';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function GlobalHeader() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isPublicRoute = ['/login', '/signup', '/play', '/redeem', '/loyalty'].some(
    (route) => location.pathname.startsWith(route)
  );

  if (isPublicRoute && !user) {
    return (
      <header
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          background: 'var(--nav-bg)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--nav-border)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div
            className="font-semibold text-lg cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => navigate('/')}
          >
            BizGamez
          </div>
          <ThemeToggle />
        </div>
      </header>
    );
  }

  if (!user) {
    return null;
  }

  const navItems = [
    { label: 'Dashboard', path: '/', show: true },
    { label: 'Agency', path: '/agency', show: isAdmin() },
    { label: 'Settings', path: '/profile', show: true },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--nav-border)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div
            className="font-semibold text-lg cursor-pointer"
            style={{ color: 'var(--text-primary)' }}
            onClick={() => navigate('/')}
          >
            BizGamez
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                    style={{
                      color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--glass-bg)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {profile?.full_name || profile?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="text-sm px-3 py-1.5 rounded-md transition-colors"
              style={{
                color: 'var(--text-secondary)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--error)';
                e.currentTarget.style.background = 'var(--error-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Sign Out
            </button>
          </div>

          <ThemeToggle />

          <button
            className="md:hidden p-2 rounded-lg"
            style={{
              color: 'var(--text-primary)',
              background: 'var(--glass-bg)',
            }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileMenuOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          className="md:hidden px-4 py-3"
          style={{
            background: 'var(--bg-secondary)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div className="flex flex-col gap-1">
            {navItems
              .filter((item) => item.show)
              .map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setMobileMenuOpen(false);
                    }}
                    className="px-3 py-2 rounded-md text-sm font-medium text-left transition-colors"
                    style={{
                      color: isActive ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'var(--glass-bg)' : 'transparent',
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            <div
              className="my-2"
              style={{
                height: '1px',
                background: 'var(--border-color)',
              }}
            />
            <div
              className="px-3 py-2 text-sm"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {profile?.full_name || profile?.email}
            </div>
            <button
              onClick={() => {
                handleSignOut();
                setMobileMenuOpen(false);
              }}
              className="px-3 py-2 rounded-md text-sm font-medium text-left transition-colors"
              style={{
                color: 'var(--error)',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}