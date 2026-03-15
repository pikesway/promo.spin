import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import GlassCard from '../common/GlassCard';
import { FiUsers, FiSettings, FiLogOut, FiGrid, FiHeart } from 'react-icons/fi';

export default function Dashboard() {
  const { profile, signOut, isAdmin, isClient, isStaff, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !profile) return;

    if (isAdmin()) {
      navigate('/agency', { replace: true });
    } else if (isClient() && profile.client_id) {
      navigate(`/client/${profile.client_id}`, { replace: true });
    }
  }, [profile, loading, isAdmin, isClient, isStaff, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Welcome, {profile?.full_name || 'User'}
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              Role: <span className="font-medium capitalize">{profile?.role?.replace('_', ' ')}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 transition-colors rounded-lg"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.background = 'var(--error-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <FiLogOut /> Sign Out
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GlassCard
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/profile')}
          >
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg" style={{ background: 'var(--glass-bg)' }}>
                <FiSettings className="text-2xl" style={{ color: 'var(--text-secondary)' }} />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Profile Settings</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Update your profile and password</p>
              </div>
            </div>
          </GlassCard>

          {isAdmin() && (
            <>
              <GlassCard
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/users')}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg" style={{ background: 'var(--info-bg)' }}>
                    <FiUsers className="text-2xl" style={{ color: 'var(--info)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>User Management</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage users and access control</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/agency')}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                    <FiGrid className="text-2xl" style={{ color: 'var(--brand-primary)' }} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Agency Dashboard</h3>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage clients and campaigns</p>
                  </div>
                </div>
              </GlassCard>
            </>
          )}

          {isClient() && profile?.client_id && (
            <GlassCard
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate(`/client/${profile.client_id}`)}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'var(--success-bg)' }}>
                  <FiGrid className="text-2xl" style={{ color: 'var(--success)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>My Client Portal</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>View and manage your campaigns</p>
                </div>
              </div>
            </GlassCard>
          )}

          {isStaff() && profile?.client_id && (
            <GlassCard
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/staff')}
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg" style={{ background: 'var(--error-bg)' }}>
                  <FiHeart className="text-2xl" style={{ color: 'var(--error)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Staff Dashboard</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage loyalty members and rewards</p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {isClient() && !profile?.client_id && (
          <GlassCard className="mt-6">
            <div className="text-center py-8">
              <p style={{ color: 'var(--text-secondary)' }}>
                Your account is not linked to a client yet. Please contact an administrator.
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}