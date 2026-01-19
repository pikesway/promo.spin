import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUsers, FiTrendingUp, FiTarget, FiDollarSign, FiPlus, FiExternalLink } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';

export default function AgencyDashboard() {
  const navigate = useNavigate();
  const { clients, campaigns, leads, redemptions, createClient, deleteClient, isLoading } = usePlatform();
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', email: '' });

  const stats = {
    totalClients: clients.length,
    totalCampaigns: campaigns.length,
    totalLeads: leads.length,
    totalRedemptions: redemptions.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      const client = await createClient({
        agencyId: null,
        name: newClient.name,
        email: newClient.email
      });
      setShowClientModal(false);
      setNewClient({ name: '', email: '' });
      navigate(`/client/${client.id}`);
    } catch (error) {
      console.error('Error creating client:', error);
      alert('Failed to create client');
    }
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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 'var(--space-4)' }}>
      <div className="container">
        <header style={{ marginBottom: 'var(--space-6)' }}>
          <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            Agency Dashboard
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>
            Manage all clients and monitor global campaign performance
          </p>
        </header>

        <div className="bento-grid" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="glass-card bento-item" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>Total Clients</p>
                <p style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>
                  {stats.totalClients}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
              Clients
            </h2>
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
              {clients.map(client => {
                const clientCampaigns = campaigns.filter(c => c.client_id === client.id);
                const clientLeads = leads.filter(l => l.client_id === client.id);

                return (
                  <div key={client.id} className="glass-card" style={{ padding: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBottom: 'var(--space-1)' }}>
                        {client.name}
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                        {client.email}
                      </p>
                      <div style={{ display: 'flex', gap: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)' }}>
                        <span>{clientCampaigns.length} campaigns</span>
                        <span>{clientLeads.length} leads</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/client/${client.id}`)}
                      >
                        <FiExternalLink /> Open Dashboard
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
          padding: 'var(--space-3)'
        }}>
          <div className="glass-card" style={{
            maxWidth: '500px',
            width: '100%',
            padding: 'var(--space-6)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Create New Client
            </h2>
            <form onSubmit={handleCreateClient}>
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  Client Name
                </label>
                <input
                  className="input"
                  type="text"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  placeholder="Acme Corporation"
                  required
                />
              </div>
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{ display: 'block', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                  Contact Email
                </label>
                <input
                  className="input"
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  placeholder="contact@acme.com"
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowClientModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Client
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}