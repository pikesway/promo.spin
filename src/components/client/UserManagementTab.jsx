import React, { useState } from 'react';
import { FiPlus, FiX, FiAlertTriangle, FiCheck, FiToggleLeft, FiToggleRight, FiShield, FiTrash2, FiEye, FiEyeOff } from 'react-icons/fi';
import { supabase } from '../../supabase/client';
import UserBrandPermissionsModal from '../agency/UserBrandPermissionsModal';

const ROLE_LABELS = {
  client_admin: 'Client Admin',
  client: 'Client Admin',
  client_user: 'Staff',
  staff: 'Staff',
};

function InviteUserModal({ clientId, brands, usage, onClose, onCreated }) {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'client_user',
    brandIds: [],
  });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const activeUserCount = usage?.activeUsers || 0;
  const userLimit = usage?.activeUsersLimit || 0;
  const atLimit = userLimit > 0 && activeUserCount >= userLimit;

  const toggleBrand = (brandId) => {
    setForm(p => ({
      ...p,
      brandIds: p.brandIds.includes(brandId)
        ? p.brandIds.filter(id => id !== brandId)
        : [...p.brandIds, brandId],
    }));
  };

  const handleSubmit = async () => {
    if (!form.email.trim() || !form.password.trim()) {
      setError('Email and password are required.');
      return;
    }
    if (atLimit) {
      setError(`User limit reached (${userLimit}). Contact your administrator to increase the limit.`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke('admin-users', {
        body: {
          action: 'create',
          email: form.email.trim(),
          password: form.password,
          fullName: form.full_name.trim(),
          role: form.role,
          clientId,
          brandIds: form.role === 'client_user' ? form.brandIds : [],
        },
      });
      if (res.error) throw new Error(res.error.message || 'Failed to create user.');
      const resData = await res.data;
      if (resData?.error) throw new Error(resData.error);
      onCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Invite User</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><FiX size={18} /></button>
        </div>

        {atLimit && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
            <FiAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>User limit reached ({userLimit}). Contact your administrator to increase the limit.</span>
          </div>
        )}

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            <FiAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
              placeholder="Jane Smith"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="jane@example.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Password *</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••"
                className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-tertiary)' }}>
                {showPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Role</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'client_user', label: 'Staff', desc: 'Brand-level access' },
                { value: 'client_admin', label: 'Client Admin', desc: 'Full client access' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, role: opt.value }))}
                  className="p-3 rounded-lg text-left transition-colors"
                  style={{
                    background: form.role === opt.value ? 'var(--accent)' : 'var(--glass-bg)',
                    border: `1px solid ${form.role === opt.value ? 'var(--accent)' : 'var(--border-color)'}`,
                    color: form.role === opt.value ? '#fff' : 'var(--text-primary)',
                  }}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs mt-0.5 opacity-75">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {form.role === 'client_user' && brands.length > 0 && (
            <div>
              <label className="text-xs mb-2 block" style={{ color: 'var(--text-secondary)' }}>Assign to Brands</label>
              <div className="space-y-1.5">
                {brands.map(brand => (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => toggleBrand(brand.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left"
                    style={{
                      background: form.brandIds.includes(brand.id) ? `${brand.primary_color}15` : 'var(--glass-bg)',
                      border: `1px solid ${form.brandIds.includes(brand.id) ? brand.primary_color : 'var(--border-color)'}`,
                    }}
                  >
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{ background: form.brandIds.includes(brand.id) ? brand.primary_color : 'var(--bg-tertiary)' }}>
                      {form.brandIds.includes(brand.id) && <FiCheck size={11} color="#fff" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: brand.primary_color }} />
                      <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{brand.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm"
            style={{ color: 'var(--text-secondary)' }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading || atLimit}
            className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserManagementTab({ clientId, users, brands, usage, onRefreshUsers }) {
  const [showInvite, setShowInvite] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState(null);
  const [error, setError] = useState('');
  const [loadingId, setLoadingId] = useState(null);

  const activeUserCount = users.filter(u => u.is_active).length;

  const handleToggleActive = async (user) => {
    setLoadingId(user.id);
    setError('');
    try {
      const { error: e } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);
      if (e) throw e;
      onRefreshUsers();
    } catch (err) {
      setError(err.message || 'Failed to update user.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (user) => {
    if (!confirm(`Remove ${user.full_name || user.email} from your account? This cannot be undone.`)) return;
    setLoadingId(user.id);
    setError('');
    try {
      const res = await supabase.functions.invoke(`admin-users/${user.id}`, {
        method: 'DELETE',
      });
      if (res.error) throw new Error(res.error.message);
      onRefreshUsers();
    } catch (err) {
      setError(err.message || 'Failed to remove user.');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
          <FiAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Users</h3>
          {usage && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {activeUserCount} of {usage.activeUsersLimit} active users
            </p>
          )}
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <FiPlus size={13} />
          Invite User
        </button>
      </div>

      {users.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>No users yet.</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Invite team members to help manage your brands and campaigns.</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
            {users.map(user => {
              const isLoading = loadingId === user.id;
              const userBrands = brands.filter(b =>
                b.client_id === clientId
              );
              return (
                <div key={user.id} className="px-5 py-4 flex items-center gap-4"
                  style={{ opacity: isLoading ? 0.5 : user.is_active ? 1 : 0.55 }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: 'var(--glass-bg)', color: 'var(--accent)' }}>
                    {(user.full_name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                      {user.full_name || '—'}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: user.role === 'client_admin' || user.role === 'client' ? 'rgba(14,165,233,0.15)' : 'var(--glass-bg)', color: user.role === 'client_admin' || user.role === 'client' ? '#0EA5E9' : 'var(--text-secondary)' }}>
                      {ROLE_LABELS[user.role] || user.role}
                    </span>
                    {!user.is_active && (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => setPermissionsUser(user)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Manage brand permissions">
                      <FiShield size={13} />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title={user.is_active ? 'Deactivate user' : 'Activate user'}>
                      {user.is_active
                        ? <FiToggleRight size={13} style={{ color: '#10B981' }} />
                        : <FiToggleLeft size={13} style={{ color: 'var(--text-tertiary)' }} />}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      style={{ color: '#EF4444' }}
                      title="Remove user">
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showInvite && (
        <InviteUserModal
          clientId={clientId}
          brands={brands}
          usage={{ ...usage, activeUsers: activeUserCount }}
          onClose={() => setShowInvite(false)}
          onCreated={onRefreshUsers}
        />
      )}

      {permissionsUser && (
        <UserBrandPermissionsModal
          user={permissionsUser}
          clientId={clientId}
          onClose={() => setPermissionsUser(null)}
        />
      )}
    </div>
  );
}
