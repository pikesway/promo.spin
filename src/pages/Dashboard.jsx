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
    } else if (isStaff() && profile.client_id) {
      navigate('/staff', { replace: true });
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome, {profile?.full_name || 'User'}
            </h1>
            <p className="text-gray-600 mt-1">
              Role: <span className="font-medium capitalize">{profile?.role?.replace('_', ' ')}</span>
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-red-600 transition-colors"
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
              <div className="p-3 bg-gray-100 rounded-lg">
                <FiSettings className="text-2xl text-gray-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Profile Settings</h3>
                <p className="text-gray-600 text-sm">Update your profile and password</p>
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
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <FiUsers className="text-2xl text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">User Management</h3>
                    <p className="text-gray-600 text-sm">Manage users and access control</p>
                  </div>
                </div>
              </GlassCard>

              <GlassCard
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate('/agency')}
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FiGrid className="text-2xl text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">Agency Dashboard</h3>
                    <p className="text-gray-600 text-sm">Manage clients and campaigns</p>
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
                <div className="p-3 bg-green-100 rounded-lg">
                  <FiGrid className="text-2xl text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">My Client Portal</h3>
                  <p className="text-gray-600 text-sm">View and manage your campaigns</p>
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
                <div className="p-3 bg-rose-100 rounded-lg">
                  <FiHeart className="text-2xl text-rose-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">Staff Dashboard</h3>
                  <p className="text-gray-600 text-sm">Manage loyalty members and rewards</p>
                </div>
              </div>
            </GlassCard>
          )}
        </div>

        {isClient() && !profile?.client_id && (
          <GlassCard className="mt-6">
            <div className="text-center py-8">
              <p className="text-gray-600">
                Your account is not linked to a client yet. Please contact an administrator.
              </p>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
