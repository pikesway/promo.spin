import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import GlassCard from '../common/GlassCard';
import { FiEdit2, FiTrash2, FiPlus, FiUsers, FiLock, FiUnlock } from 'react-icons/fi';

export default function UserManagement() {
  const { profile, isSuperAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'client',
    client_id: null,
    is_active: true
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchClients();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, clients(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      if (editingUser) {
        const updates = {
          full_name: formData.full_name,
          role: formData.role,
          client_id: formData.client_id || null,
          is_active: formData.is_active
        };

        const { error: updateError } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', editingUser.id);

        if (updateError) throw updateError;
        setSuccess('User updated successfully');
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/create`;

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            client_id: formData.client_id
          })
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create user');
        }

        setSuccess('User created successfully');
      }

      await fetchUsers();
      handleCloseModal();
    } catch (error) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users/${userId}`;

      const response = await fetch(apiUrl, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete user');
      }

      setSuccess('User deleted successfully');
      await fetchUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      setSuccess(`User ${!user.is_active ? 'activated' : 'deactivated'} successfully`);
      await fetchUsers();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      full_name: user.full_name || '',
      role: user.role,
      client_id: user.client_id,
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'client',
      client_id: null,
      is_active: true
    });
    setError('');
  };

  const canEditUser = (user) => {
    if (isSuperAdmin()) return true;
    if (user.role === 'super_admin' || user.role === 'admin') return false;
    return true;
  };

  const getRoleBadge = (role) => {
    const colors = {
      super_admin: { bg: 'rgba(168, 85, 247, 0.1)', text: '#C084FC', border: 'rgba(168, 85, 247, 0.2)' },
      admin: { bg: 'rgba(59, 130, 246, 0.1)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.2)' },
      client: { bg: 'rgba(16, 185, 129, 0.1)', text: '#34D399', border: 'rgba(16, 185, 129, 0.2)' }
    };
    const color = colors[role];
    return (
      <span
        className="px-2 py-1 rounded text-xs font-medium"
        style={{
          background: color.bg,
          color: color.text,
          border: `1px solid ${color.border}`
        }}
      >
        {role.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <FiUsers style={{ color: 'var(--brand-primary)' }} />
              User Management
            </h1>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>Manage system users and their access</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary"
          >
            <FiPlus /> Add User
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg" style={{
            background: 'var(--error-bg)',
            border: '1px solid var(--error)',
            color: 'var(--error)'
          }}>
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg" style={{
            background: 'var(--success-bg)',
            border: '1px solid var(--success)',
            color: 'var(--success)'
          }}>
            {success}
          </div>
        )}

        <GlassCard>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Name</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Email</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Role</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Client</th>
                  <th className="text-left py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                  <th className="text-right py-3 px-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{user.full_name || '-'}</td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{user.email}</td>
                    <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                    <td className="py-3 px-4" style={{ color: 'var(--text-primary)' }}>{user.clients?.name || '-'}</td>
                    <td className="py-3 px-4">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: user.is_active ? 'var(--success-bg)' : 'var(--error-bg)',
                          color: user.is_active ? 'var(--success)' : 'var(--error)',
                          border: `1px solid ${user.is_active ? 'var(--success)' : 'var(--error)'}`
                        }}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        {canEditUser(user) && (
                          <>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className="p-2 transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {user.is_active ? <FiLock /> : <FiUnlock />}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 transition-colors"
                              style={{ color: 'var(--text-tertiary)' }}
                              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                              title="Edit"
                            >
                              <FiEdit2 />
                            </button>
                            {isSuperAdmin() && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="p-2 transition-colors"
                                style={{ color: 'var(--text-tertiary)' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--error)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-tertiary)'}
                                title="Delete"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>

      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
          <GlassCard className="w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={editingUser}
                  required
                  className="input"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="input"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input"
                  disabled={!isSuperAdmin() && (editingUser?.role === 'admin' || editingUser?.role === 'super_admin')}
                >
                  <option value="client">Client</option>
                  {isSuperAdmin() && (
                    <>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </>
                  )}
                </select>
              </div>

              {formData.role === 'client' && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Client
                  </label>
                  <select
                    value={formData.client_id || ''}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value || null })}
                    className="input"
                  >
                    <option value="">Select a client</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 rounded"
                  style={{
                    accentColor: 'var(--brand-primary)'
                  }}
                />
                <label htmlFor="is_active" className="ml-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Active
                </label>
              </div>

              {error && (
                <div className="p-3 rounded-lg text-sm" style={{
                  background: 'var(--error-bg)',
                  border: '1px solid var(--error)',
                  color: 'var(--error)'
                }}>
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={submitting}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary flex-1"
                >
                  {submitting ? 'Saving...' : editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
