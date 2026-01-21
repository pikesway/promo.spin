import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiTrendingUp, FiTarget, FiDollarSign, FiPlus, FiExternalLink, FiEdit, FiSettings, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { usePlatform } from '../context/PlatformContext';
import ClientBrandingForm from '../components/ClientBrandingForm';
import StatusBadge from '../components/StatusBadge';
import { getStatusConfig } from '../utils/brandingHelpers';

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();
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

  const handleEditClient = (client) => {
    setEditingClient(client);
    setShowClientModal(true);
  };

  const handleCloseModal = () => {
    setShowClientModal(false);
    setEditingClient(null);
  };

  const handleDeleteClient = async (clientId) => {
    if (!confirm('Delete this client and all their campaigns?')) return;
    try {
      await deleteClient(clientId);
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 'var(--space-4)' }}>
      <div className="container">
        <header style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
              Agency Dashboard
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>
              Manage all clients and monitor global campaign performance
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
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
        </header>

        <div className="bento-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="glass-card bento-item" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Total Clients</p>
                <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {stats.totalClients}
                </p>
                <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                  {statusBreakdown.active} Active, {statusBreakdown.idle} Idle, {statusBreakdown.prospect} Prospects
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiUsers size={24} color="var(--brand-primary)" />
              </div>
            </div>
          </div>

          <div className="glass-card bento-item" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Active Campaigns</p>
                <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {stats.activeCampaigns}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiTrendingUp size={24} color="var(--success)" />
              </div>
            </div>
          </div>

          <div className="glass-card bento-item" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Total Leads</p>
                <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {stats.totalLeads}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiTarget size={24} color="var(--info)" />
              </div>
            </div>
          </div>

          <div className="glass-card bento-item" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Redemptions</p>
                <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {stats.totalRedemptions}
                </p>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                background: 'rgba(245, 158, 11, 0.1)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <FiDollarSign size={24} color="var(--warning)" />
              </div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                Clients
              </h2>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
                style={{ width: 'auto', minWidth: '150px' }}
              >
                <option value="all">All Statuses</option>
                <option value="prospect">Prospects</option>
                <option value="active">Active</option>
                <option value="idle">Idle</option>
                <option value="paused">Paused</option>
                <option value="churned">Churned</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={() => setShowClientModal(true)}>
              <FiPlus /> Add Client
            </button>
          </div>

          {clients.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>No clients yet</p>
              <button className="btn btn-primary" onClick={() => setShowClientModal(true)}>
                Create Your First Client
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {filteredClients.map(client => {
                const clientCampaigns = campaigns.filter(c => c.client_id === client.id);
                const clientLeads = leads.filter(l => l.client_id === client.id);
                const statusConfig = getStatusConfig(client.status);

                return (
                  <div key={client.id} className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                        {client.logo_url && (
                          <img
                            src={client.logo_url}
                            alt={`${client.name} logo`}
                            style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                            {client.name}
                          </h3>
                          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                            {client.email}
                          </p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                        <StatusBadge status={client.status} showAction={true} />
                        {(client.primary_color || client.secondary_color) && (
                          <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Brand:</span>
                            {client.primary_color && (
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: client.primary_color,
                                  border: '1px solid var(--border-color)'
                                }}
                                title={`Primary: ${client.primary_color}`}
                              />
                            )}
                            {client.secondary_color && (
                              <div
                                style={{
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  backgroundColor: client.secondary_color,
                                  border: '1px solid var(--border-color)'
                                }}
                                title={`Secondary: ${client.secondary_color}`}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                        <span>{clientCampaigns.length} campaigns</span>
                        <span>{clientLeads.length} leads</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                      <button
                        className="btn btn-ghost"
                        onClick={() => handleEditClient(client)}
                        title="Edit Client"
                      >
                        <FiEdit />
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/client/${client.id}`)}
                      >
                        <FiExternalLink /> Dashboard
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteClient(client.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showClientModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)',
          padding: 'var(--space-3)',
          overflow: 'auto'
        }}>
          <div className="glass-card" style={{
            maxWidth: '800px',
            width: '100%',
            padding: 'var(--space-6)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            maxHeight: '90vh',
            overflow: 'auto',
            margin: 'var(--space-4)'
          }}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              {editingClient ? 'Edit Client' : 'Create New Client'}
            </h2>
            <ClientBrandingForm
              client={editingClient}
              onSave={handleSaveClient}
              onCancel={handleCloseModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}