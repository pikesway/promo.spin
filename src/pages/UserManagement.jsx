import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import { FiEdit2, FiTrash2, FiPlus, FiUsers, FiLock, FiUnlock, FiMail, FiChevronRight } from 'react-icons/fi';
import FloatingActionButton from '../components/layout/FloatingActionButton';

export default function UserManagement() {
  const { isSuperAdmin } = useAuth();
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

  const handleDelete = async (userId, e) => {
    if (e) e.stopPropagation();
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

  const handleToggleActive = async (user, e) => {
    if (e) e.stopPropagation();
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
    const color = colors[role] || colors.client;
    return (
      <span
        className="px-2 py-0.5 rounded text-[10px] md:text-xs font-medium"
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
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="container px-3 md:px-4 py-4 md:py-6">
        <div className="flex justify-between items-start mb-4 md:mb-6">
          <div>
            <h1 className="text-xl md:text-3xl font-bold flex items-center gap-2 text-white">
              <FiUsers className="text-blue-500" size={24} />
              <span className="hidden md:inline">User Management</span>
              <span className="md:hidden">Users</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1 hidden md:block">Manage system users and their access</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary hidden md:flex"
          >
            <FiPlus /> Add User
          </button>
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

        <div className="hidden md:block glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-white">{user.full_name || '-'}</td>
                    <td className="py-3 px-4 text-white">{user.email}</td>
                    <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                    <td className="py-3 px-4 text-white">{user.clients?.name || '-'}</td>
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
                      <div className="flex justify-end gap-1">
                        {canEditUser(user) && (
                          <>
                            <button
                              onClick={() => handleToggleActive(user)}
                              className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                            >
                              {user.is_active ? <FiLock size={16} /> : <FiUnlock size={16} />}
                            </button>
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 size={16} />
                            </button>
                            {isSuperAdmin() && (
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 size={16} />
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
        </div>

        <div className="md:hidden flex flex-col gap-2">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => canEditUser(user) && handleEdit(user)}
              className={`glass-card p-3 ${canEditUser(user) ? 'cursor-pointer active:bg-white/10' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--bg-tertiary)' }}>
                  <FiUsers className="text-gray-400" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-medium truncate">{user.full_name || 'Unnamed'}</span>
                    {getRoleBadge(user.role)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <FiMail size={12} />
                    <span className="truncate">{user.email}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        background: user.is_active ? 'var(--success-bg)' : 'var(--error-bg)',
                        color: user.is_active ? 'var(--success)' : 'var(--error)'
                      }}
                    >
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                    {user.clients?.name && (
                      <span className="text-[10px] text-gray-500">{user.clients.name}</span>
                    )}
                  </div>
                </div>
                {canEditUser(user) && (
                  <FiChevronRight className="text-gray-500 flex-shrink-0" size={20} />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <FloatingActionButton
        onClick={() => setShowModal(true)}
        label="Add User"
      />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.8)' }}>
          <div
            className="glass-card w-full md:max-w-md md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-auto"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="sticky top-0 p-4 border-b border-white/10" style={{ background: 'var(--bg-secondary)' }}>
              <h2 className="text-xl font-bold text-white">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-400">
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
                  <label className="block text-sm font-medium mb-1 text-gray-400">
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
                <label className="block text-sm font-medium mb-1 text-gray-400">
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
                <label className="block text-sm font-medium mb-1 text-gray-400">
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
                  <label className="block text-sm font-medium mb-1 text-gray-400">
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
                  style={{ accentColor: 'var(--brand-primary)' }}
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-400">
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

              <div className="flex gap-3 pt-2">
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
          </div>
        </div>
      )}
    </div>
  );
}
