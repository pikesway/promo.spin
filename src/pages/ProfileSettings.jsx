import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import GlassCard from '../common/GlassCard';
import { FiUser, FiLock, FiArrowLeft, FiSave } from 'react-icons/fi';

export default function ProfileSettings() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [profileData, setProfileData] = useState({
    full_name: profile?.full_name || ''
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { error: updateError } = await updateProfile({
        full_name: profileData.full_name
      });

      if (updateError) throw updateError;
      setSuccess('Profile updated successfully');
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (passwordError) throw passwordError;

      setSuccess('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 mb-6 transition-colors"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <FiArrowLeft /> Back to Dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Profile Settings</h1>
          <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Manage your account settings</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{
            background: 'var(--error-bg)',
            border: '1px solid var(--error)',
            color: 'var(--error)'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success)',
            color: 'var(--success)'
          }}>
            {success}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('profile')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: activeTab === 'profile' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
              color: activeTab === 'profile' ? 'white' : 'var(--text-secondary)',
              border: activeTab === 'profile' ? 'none' : '1px solid var(--border-color)'
            }}
          >
            <FiUser /> Profile
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors"
            style={{
              background: activeTab === 'password' ? 'var(--brand-primary)' : 'var(--bg-secondary)',
              color: activeTab === 'password' ? 'white' : 'var(--text-secondary)',
              border: activeTab === 'password' ? 'none' : '1px solid var(--border-color)'
            }}
          >
            <FiLock /> Password
          </button>
        </div>

        {activeTab === 'profile' && (
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="input"
                  style={{ opacity: 0.6 }}
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Email cannot be changed</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  className="input"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Role
                </label>
                <input
                  type="text"
                  value={profile?.role?.replace('_', ' ').toUpperCase() || ''}
                  disabled
                  className="input"
                  style={{ opacity: 0.6 }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                <FiSave /> {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          </GlassCard>
        )}

        {activeTab === 'password' && (
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Change Password</h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  minLength={6}
                  className="input"
                  placeholder="Enter new password"
                />
                <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>Must be at least 6 characters</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                  minLength={6}
                  className="input"
                  placeholder="Confirm new password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
              >
                <FiLock /> {loading ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
