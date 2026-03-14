import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlatform } from '../context/PlatformContext';
import { supabase } from '../supabase/client';
import { FiPlus, FiEdit2, FiLock, FiUnlock, FiArrowLeft, FiSearch, FiUsers } from 'react-icons/fi';
import UserBrandPermissionsModal from '../components/agency/UserBrandPermissionsModal';

const ROLES = [
  { value: 'admin', label: 'Admin (Agency)' },
  { value: 'client_admin', label: 'Client Admin' },
  { value: 'client_user', label: 'Client User' },
];

export default function UserManagement() {
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { clients } = usePlatform();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState(null);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'client_user', client_id: '', is_active: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*, clients(name, primary_color)')
      .order('created_at', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ email: '', password: '', full_name: '', role: 'client_user', client_id: '', is_active: true });
    setError('');
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setForm({ email: user.email, password: '', full_name: user.full_name || '', role: user.role, client_id: user.client_id || '', is_active: user.is_active });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!editingUser && !form.password.trim()) { setError('Password is required for new users.'); return; }

    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        await supabase.from('profiles').update({
          full_name: form.full_name,
          role: form.role,
          client_id: form.client_id || null,
          is_active: form.is_active,
        }).eq('id', editingUser.id);
      } else {
        const { error: fnError } = await supabase.functions.invoke('admin-users', {
          body: {
            action: 'create',
            email: form.email,
            password: form.password,
            fullName: form.full_name,
            role: form.role,
            clientId: form.client_id || null,
          }
        });
        if (fnError) throw fnError;
      }
      await fetchUsers();
      setShowModal(false);
    } catch (err) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user) => {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id);
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !user.is_active } : u));
  };

  const filteredUsers = users.filter(u => {
    const matchesClient = clientFilter === 'all' || u.client_id === clientFilter;
    const q = search.toLowerCase();
    const matchesSearch = !q || (u.email || '').toLowerCase().includes(q) || (u.full_name || '').toLowerCase().includes(q);
    return matchesClient && matchesSearch;
  });

  const groupedByClient = clients.reduce((acc, client) => {
    const clientUsers = filteredUsers.filter(u => u.client_id === client.id);
    if (clientUsers.length > 0 || clientFilter === client.id) acc[client.id] = { client, users: clientUsers };
    return acc;
  }, {});
  const agencyUsers = filteredUsers.filter(u => !u.client_id || u.role === 'admin' || u.role === 'super_admin');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/agency')} className="p-2 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-secondary)' }}>
            <FiArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>User Management</h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{users.length} total users</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            <FiPlus size={14} />
            New User
          </button>
        </div>

        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
            />
          </div>
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            <option value="all">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
        ) : (
          <div className="space-y-6">
            {agencyUsers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                  <FiUsers size={13} />
                  Agency / Admin
                </h3>
                <UserTable users={agencyUsers} onEdit={openEdit} onToggle={handleToggleActive} onPermissions={null} />
              </div>
            )}

            {Object.values(groupedByClient).map(({ client, users: clientUsers }) => (
              <div key={client.id}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
                    style={{ background: `${client.primary_color}20`, color: client.primary_color }}>
                    {client.name.charAt(0)}
                  </div>
                  <h3 className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{client.name}</h3>
                  <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>({clientUsers.length})</span>
                </div>
                <UserTable
                  users={clientUsers}
                  onEdit={openEdit}
                  onToggle={handleToggleActive}
                  onPermissions={(user) => setSelectedUserForPerms(user)}
                  clientId={client.id}
                />
              </div>
            ))}

            {filteredUsers.length === 0 && (
              <p className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>No users found.</p>
            )}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <h2 className="text-lg font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
              {editingUser ? 'Edit User' : 'New User'}
            </h2>

            {error && (
              <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
                <input type="text" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  disabled={!!editingUser}
                  className="w-full px-3 py-2.5 rounded-lg text-sm disabled:opacity-60"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
              </div>
              {!editingUser && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Password *</label>
                  <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }} />
                </div>
              )}
              <div>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Role</label>
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                  {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              {(form.role === 'client_admin' || form.role === 'client_user' || form.role === 'client' || form.role === 'staff') && (
                <div>
                  <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>Client</label>
                  <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    <option value="">No client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded" />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                style={{ background: 'var(--accent)', color: '#fff' }}>
                {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUserForPerms && (
        <UserBrandPermissionsModal
          user={selectedUserForPerms}
          clientId={selectedUserForPerms.client_id}
          onClose={() => setSelectedUserForPerms(null)}
        />
      )}
    </div>
  );
}

function UserTable({ users, onEdit, onToggle, onPermissions, clientId }) {
  if (users.length === 0) return <p className="text-xs px-1" style={{ color: 'var(--text-tertiary)' }}>No users.</p>;

  return (
    <div className="glass-card divide-y" style={{ divideColor: 'var(--border-color)' }}>
      {users.map(user => (
        <div key={user.id} className="px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
            {(user.full_name || user.email || '?').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user.full_name || '—'}</p>
            <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded hidden sm:block" style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
            {user.role}
          </span>
          <div className="flex gap-1 flex-shrink-0">
            {onPermissions && (
              <button onClick={() => onPermissions(user)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs"
                style={{ color: 'var(--text-tertiary)' }} title="Edit brand permissions">
                Perms
              </button>
            )}
            <button onClick={() => onEdit(user)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: 'var(--text-tertiary)' }}>
              <FiEdit2 size={13} />
            </button>
            <button onClick={() => onToggle(user)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: user.is_active ? '#10B981' : 'var(--text-tertiary)' }}>
              {user.is_active ? <FiUnlock size={13} /> : <FiLock size={13} />}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
