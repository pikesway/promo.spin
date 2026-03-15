import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTag, FiUsers, FiActivity, FiPlus, FiEdit, FiEye, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabase/client';
import ClientLimitsPanel from '../components/agency/ClientLimitsPanel';
import BrandFormModal from '../components/agency/BrandFormModal';
import UserBrandPermissionsModal from '../components/agency/UserBrandPermissionsModal';

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { clients, brands, campaigns, updateClient, createBrand, updateBrand, deleteBrand, getClientUsage, getBrandAllocationSummary, startImpersonation } = usePlatform();
  const { isSuperAdmin } = useAuth();

  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState('brands');
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  const client = clients.find(c => c.id === clientId);
  const clientBrands = brands.filter(b => b.client_id === clientId);
  const clientCampaigns = campaigns.filter(c => c.client_id === clientId);
  const usage = getClientUsage(clientId);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!supabase) return;
      setLoadingUsers(true);
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      setUsers(data || []);

      const { data: notifData } = await supabase
        .from('client_notifications')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(10);
      setNotifications(notifData || []);
      setLoadingUsers(false);
    };
    if (clientId) fetchUsers();
  }, [clientId]);

  const handleSaveLimits = async (limits) => {
    await updateClient(clientId, limits);
  };

  const handleToggleBrand = async (brand) => {
    await updateBrand(brand.id, { active: !brand.active });
  };

  const handleDeleteBrand = async (brandId) => {
    if (!confirm('Delete this brand and all its campaigns and members? This cannot be undone.')) return;
    await deleteBrand(brandId);
  };

  const handleImpersonate = async () => {
    await startImpersonation(clientId);
    navigate(`/client/${clientId}`);
  };

  const handleOpenPermissions = (user) => {
    setSelectedUser(user);
    setShowPermissionsModal(true);
  };

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>Client not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate('/agency')} className="p-2 rounded-lg transition-colors hover:bg-white/10" style={{ color: 'var(--text-secondary)' }}>
            <FiArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{client.name}</h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{client.email}</p>
          </div>
          <button
            onClick={handleImpersonate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors"
            style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
          >
            <FiEye size={14} />
            View as Client
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="glass-card p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold"
                style={{ background: `${client.primary_color}20`, color: client.primary_color }}>
                {client.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{client.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded ${client.status === 'active' ? 'text-green-400' : 'text-amber-400'}`}
                  style={{ background: client.status === 'active' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)' }}>
                  {client.status}
                </span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Brands</span>
                <span style={{ color: 'var(--text-primary)' }}>{clientBrands.filter(b => b.active).length} active</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Campaigns</span>
                <span style={{ color: 'var(--text-primary)' }}>{clientCampaigns.filter(c => c.status === 'active').length} active</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--text-tertiary)' }}>Users</span>
                <span style={{ color: 'var(--text-primary)' }}>{users.length}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            {usage && (
              <ClientLimitsPanel
                client={client}
                usage={usage}
                editable={isSuperAdmin()}
                onSave={handleSaveLimits}
              />
            )}
          </div>
        </div>

        <div className="flex gap-1 mb-5" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {[
            { id: 'brands', label: 'Brands', icon: FiTag, count: clientBrands.length },
            { id: 'users', label: 'Users', icon: FiUsers, count: users.length },
            { id: 'notifications', label: 'Notifications', icon: FiActivity, count: notifications.filter(n => !n.read_at).length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px"
              style={{
                borderBottomColor: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)'
              }}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.count > 0 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'brands' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Brands</h3>
              <button
                onClick={() => { setEditingBrand(null); setShowBrandModal(true); }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--accent)', color: '#fff' }}
              >
                <FiPlus size={13} />
                New Brand
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {clientBrands.map(brand => {
                const brandCampaigns = campaigns.filter(c => c.brand_id === brand.id);
                return (
                  <div key={brand.id} className="glass-card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ background: `${brand.primary_color}20`, color: brand.primary_color }}>
                          {brand.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{brand.name}</p>
                          <span className={`text-xs ${brand.active ? 'text-green-400' : 'text-gray-500'}`}>
                            {brand.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingBrand(brand); setShowBrandModal(true); }}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                          <FiEdit size={13} />
                        </button>
                        <button onClick={() => handleToggleBrand(brand)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: 'var(--text-tertiary)' }}>
                          {brand.active ? <FiToggleRight size={13} style={{ color: '#10B981' }} /> : <FiToggleLeft size={13} />}
                        </button>
                        <button onClick={() => handleDeleteBrand(brand.id)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" style={{ color: '#EF4444' }}>
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-tertiary)' }}>Campaigns</span>
                        <span style={{ color: 'var(--text-primary)' }}>{brandCampaigns.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span style={{ color: 'var(--text-tertiary)' }}>Member Limit</span>
                        <span style={{ color: 'var(--text-primary)' }}>{brand.loyalty_members_limit}</span>
                      </div>
                      {brand.unlock_pin && (
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--text-tertiary)' }}>Unlock PIN</span>
                          <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{'•'.repeat(brand.unlock_pin.length)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {clientBrands.length === 0 && (
                <div className="col-span-3 text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
                  No brands yet. Create your first brand.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Users</h3>
            </div>
            {loadingUsers ? (
              <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
            ) : users.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)' }}>No users assigned to this client.</p>
            ) : (
              <div className="glass-card divide-y" style={{ divideColor: 'var(--border-color)' }}>
                {users.map(user => (
                  <div key={user.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
                      {(user.full_name || user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{user.full_name || '—'}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{user.email}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded" style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}>
                      {user.role}
                    </span>
                    <button
                      onClick={() => handleOpenPermissions(user)}
                      className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                    >
                      Permissions
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'notifications' && (
          <div>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Recent Notifications</h3>
            {notifications.length === 0 ? (
              <p style={{ color: 'var(--text-tertiary)' }}>No notifications.</p>
            ) : (
              <div className="glass-card divide-y" style={{ divideColor: 'var(--border-color)' }}>
                {notifications.map(n => (
                  <div key={n.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        {new Date(n.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showBrandModal && (
        <BrandFormModal
          brand={editingBrand}
          clientId={clientId}
          allocationSummary={getBrandAllocationSummary(clientId)}
          onClose={() => { setShowBrandModal(false); setEditingBrand(null); }}
        />
      )}

      {showPermissionsModal && selectedUser && (
        <UserBrandPermissionsModal
          user={selectedUser}
          clientId={clientId}
          onClose={() => { setShowPermissionsModal(false); setSelectedUser(null); }}
        />
      )}
    </div>
  );
}
