import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiTrendingUp, FiTarget, FiDollarSign, FiPlus, FiChevronRight, FiEdit, FiSettings, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { usePlatform } from '../context/PlatformContext';
import ClientBrandingForm from '../components/ClientBrandingForm';
import StatusBadge from '../components/StatusBadge';
import FloatingActionButton from '../components/layout/FloatingActionButton';

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { clients, campaigns, leads, redemptions, createClient, updateClient, deleteClient, isLoading } = usePlatform();
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const statusBreakdown = useMemo(() => {
    return {
      prospect: clients.filter(c => c.status === 'prospect').length,
      active: clients.filter(c => c.status === 'active').length,
      idle: clients.filter(c => c.status === 'idle').length,
      paused: clients.filter(c => c.status === 'paused').length,
      churned: clients.filter(c => c.status === 'churned').length
    };
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (statusFilter === 'all') return clients;
    return clients.filter(c => c.status === statusFilter);
  }, [clients, statusFilter]);

  const stats = {
    totalClients: clients.length,
    totalCampaigns: campaigns.length,
    totalLeads: leads.length,
    totalRedemptions: redemptions.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length
  };

  const handleSaveClient = async (formData) => {
    try {
      if (editingClient) {
        await updateClient(editingClient.id, formData);
      } else {
        const client = await createClient({
          agencyId: null,
          ...formData
        });
        navigate(`/client/${client.id}`);
      }
      setShowClientModal(false);
      setEditingClient(null);
    } catch (error) {
      console.error('Error saving client:', error);
      throw error;
    }
  };

  const handleEditClient = (client, e) => {
    e.stopPropagation();
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleCloseModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async (clientId, e) => {
    e.stopPropagation();
    if (!confirm('Delete this client and all their campaigns?')) return;
    try {
      await deleteClient(clientId);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="container px-3 md:px-4 py-4 md:py-6">
        <header className="mb-4 md:mb-6">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-4xl font-bold mb-1 truncate" style={{ color: 'var(--text-primary)' }}>
                Agency Dashboard
              </h1>
              <p className="text-sm md:text-lg hidden md:block" style={{ color: 'var(--text-secondary)' }}>
                Manage all clients and monitor global campaign performance
              </p>
            </div>
            <div className="hidden md:flex gap-2 items-center flex-shrink-0">
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/users')}
                title="User Management"
              >
                <FiUsers /> Users
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => navigate('/profile')}
                title="Profile Settings"
              >
                <FiSettings />
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleSignOut}
                title="Sign Out"
              >
                <FiLogOut />
              </button>
            </div>
          </div>
        </header>

        <div className="horizontal-scroll hide-scrollbar md:grid-cols-4 mb-4 md:mb-6 -mx-3 px-3 md:mx-0 md:px-0">
          <div className="glass-card w-36 md:w-auto flex-shrink-0 p-3 md:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Clients</p>
                <p className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalClients}</p>
                <p className="text-[10px] md:text-xs mt-1 hidden md:block" style={{ color: 'var(--text-tertiary)' }}>
                  {statusBreakdown.active} Active
                </p>
              </div>
              <div className="hidden md:flex w-10 h-10 rounded-lg items-center justify-center" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                <FiUsers size={20} color="var(--brand-primary)" />
              </div>
            </div>
          </div>

          <div className="glass-card w-36 md:w-auto flex-shrink-0 p-3 md:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Active</p>
                <p className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.activeCampaigns}</p>
                <p className="text-[10px] md:text-xs mt-1 hidden md:block" style={{ color: 'var(--text-tertiary)' }}>campaigns</p>
              </div>
              <div className="hidden md:flex w-10 h-10 rounded-lg items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                <FiTrendingUp size={20} color="var(--success)" />
              </div>
            </div>
          </div>

          <div className="glass-card w-36 md:w-auto flex-shrink-0 p-3 md:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Leads</p>
                <p className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalLeads}</p>
              </div>
              <div className="hidden md:flex w-10 h-10 rounded-lg items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                <FiTarget size={20} color="var(--info)" />
              </div>
            </div>
          </div>

          <div className="glass-card w-36 md:w-auto flex-shrink-0 p-3 md:p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Redeemed</p>
                <p className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalRedemptions}</p>
              </div>
              <div className="hidden md:flex w-10 h-10 rounded-lg items-center justify-center" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                <FiDollarSign size={20} color="var(--warning)" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg md:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>Clients</h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input text-sm"
                style={{ width: 'auto', minWidth: '120px', padding: '6px 10px' }}
              >
                <option value="all">All</option>
                <option value="prospect">Prospects</option>
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <button className="btn btn-primary hidden md:flex" onClick={() => setShowClientModal(true)}>
              <FiPlus /> Add Client
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>No clients yet</p>
              <button className="btn btn-primary" onClick={() => setShowClientModal(true)}>
                Create Your First Client
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 md:gap-3">
              {filteredClients.map(client => {
                const clientCampaigns = campaigns.filter(c => c.client_id === client.id);
                const clientLeads = leads.filter(l => l.client_id === client.id);

                return (
                  <div
                    key={client.id}
                    onClick={() => navigate(`/client/${client.id}`)}
                    className="glass-card p-3 md:p-4 flex items-center gap-3 cursor-pointer transition-colors"
                    style={{ ':hover': { background: 'var(--card-hover-bg)' } }}
                  >
                    {client.logo_url ? (
                      <img
                        src={client.logo_url}
                        alt=""
                        className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-contain flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                        <FiUsers size={20} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base md:text-lg font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{client.name}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={client.status} size="sm" />
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                          {clientCampaigns.length} campaigns
                        </span>
                        <span className="text-xs hidden md:inline" style={{ color: 'var(--text-tertiary)' }}>
                          {clientLeads.length} leads
                        </span>
                      </div>
                    </div>

                    <div className="hidden md:flex gap-2 flex-shrink-0">
                      <button
                        className="btn btn-ghost p-2"
                        onClick={(e) => handleEditClient(client, e)}
                        title="Edit Client"
                      >
                        <FiEdit size={18} />
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => handleDeleteClient(client.id, e)}
                      >
                        Delete
                      </button>
                    </div>

                    <FiChevronRight size={20} className="flex-shrink-0 md:hidden" style={{ color: 'var(--text-tertiary)' }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FloatingActionButton
        onClick={() => setShowClientModal(true)}
        label="Add Client"
      />

      {showClientModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'var(--overlay-bg)' }}>
          <div
            className="glass-card w-full md:max-w-2xl md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-auto"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="sticky top-0 p-4" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="text-xl md:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {editingClient ? 'Edit Client' : 'Create New Client'}
              </h2>
            </div>
            <div className="p-4">
              <ClientBrandingForm
                client={editingClient}
                onSave={handleSaveClient}
                onCancel={handleCloseModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
