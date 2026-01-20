import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiDownload, FiCopy, FiSettings, FiLogOut } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../context/AuthContext';
import CampaignWizard from '../components/CampaignWizard';
import CampaignBuilder from '../components/admin/CampaignBuilder';
import CampaignList from '../components/admin/CampaignList';
import QRCode from 'qrcode.react';
import StatusBadge from '../components/StatusBadge';
import ClientBrandingForm from '../components/ClientBrandingForm';

export default function ClientDashboard() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { clients, campaigns, leads, getCampaignsByClient, getLeadsByClient, deleteCampaign, duplicateCampaign, toggleCampaignStatus, updateClient } = usePlatform();
  const [activeTab, setActiveTab] = useState('campaigns');
  const [showWizard, setShowWizard] = useState(false);
  const [showQRModal, setShowQRModal] = useState(null);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);

  const client = clients.find(c => c.id === clientId);
  const clientCampaigns = getCampaignsByClient(clientId);
  const clientLeads = getLeadsByClient(clientId);

  const campaignsByStatus = {
    draft: clientCampaigns.filter(c => c.status === 'draft'),
    scheduled: clientCampaigns.filter(c => c.status === 'scheduled'),
    active: clientCampaigns.filter(c => c.status === 'active'),
    completed: clientCampaigns.filter(c => c.status === 'completed')
  };

  const exportLeadsCSV = () => {
    if (clientLeads.length === 0) {
      alert('No leads to export');
      return;
    }

    const headers = ['Date', 'Campaign', 'Name', 'Email', 'Phone'];
    const rows = clientLeads.map(lead => {
      const campaign = campaigns.find(c => c.id === lead.campaign_id);
      return [
        new Date(lead.created_at).toLocaleDateString(),
        campaign?.name || 'Unknown',
        lead.data.name || '',
        lead.data.email || '',
        lead.data.phone || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${client?.name || 'export'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getCampaignURL = (campaign) => {
    return `${window.location.origin}${window.location.pathname}#/play/${campaign.slug}`;
  };

  const getIFrameCode = (campaign) => {
    const url = getCampaignURL(campaign);
    return `<iframe src="${url}" width="100%" height="800px" frameborder="0" allow="camera; microphone"></iframe>`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Delete this campaign?')) return;
    try {
      await deleteCampaign(campaignId);
    } catch (error) {
      console.error('Error deleting campaign:', error);
      alert('Failed to delete campaign');
    }
  };

  const handleDuplicateCampaign = async (campaignId) => {
    try {
      const newCampaign = await duplicateCampaign(campaignId);
      setEditingCampaign(newCampaign);
    } catch (error) {
      console.error('Error duplicating campaign:', error);
      alert('Failed to duplicate campaign');
    }
  };

  const handleToggleStatus = async (campaignId, currentStatus) => {
    try {
      await toggleCampaignStatus(campaignId, currentStatus);
    } catch (error) {
      console.error('Error toggling campaign status:', error);
      alert('Failed to update campaign status');
    }
  };

  const handleSaveBranding = async (formData) => {
    try {
      await updateClient(clientId, formData);
      setShowBrandingModal(false);
    } catch (error) {
      console.error('Error updating branding:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>Client not found</p>
          <button className="btn btn-primary" onClick={() => navigate('/agency')}>
            Back to Agency Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (editingCampaign) {
    return (
      <CampaignBuilder
        campaign={editingCampaign}
        client={client}
        onBack={() => setEditingCampaign(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: 'var(--space-4)' }}>
      <div className="container">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <button className="btn btn-ghost" onClick={() => navigate('/agency')} style={{ marginBottom: 'var(--space-3)' }}>
            <FiArrowLeft /> Back to Agency
          </button>

          <div className="glass-card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center', flex: 1 }}>
                {client.logo_url && (
                  <img
                    src={client.logo_url}
                    alt={`${client.name} logo`}
                    style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: 'var(--radius-lg)' }}
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-1)' }}>
                    {client.name}
                  </h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
                    {client.email}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
                    <StatusBadge status={client.status} />
                    {(client.primary_color || client.secondary_color) && (
                      <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>Brand Colors:</span>
                        {client.primary_color && (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: client.primary_color,
                              border: '2px solid var(--border-color)'
                            }}
                            title={`Primary: ${client.primary_color}`}
                          />
                        )}
                        {client.secondary_color && (
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: client.secondary_color,
                              border: '2px solid var(--border-color)'
                            }}
                            title={`Secondary: ${client.secondary_color}`}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowBrandingModal(true)}
                >
                  <FiSettings /> Edit Branding
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
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-6)', borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-2)' }}>
          <button
            onClick={() => setActiveTab('campaigns')}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: activeTab === 'campaigns' ? 'var(--brand-primary)' : 'transparent',
              color: activeTab === 'campaigns' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)'
            }}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              background: activeTab === 'leads' ? 'var(--brand-primary)' : 'transparent',
              color: activeTab === 'leads' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--font-medium)'
            }}
          >
            Leads ({clientLeads.length})
          </button>
        </div>

        {activeTab === 'campaigns' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)' }}>Campaign Overview</h2>
              <button className="btn btn-primary" onClick={() => setShowWizard(true)}>
                <FiPlus /> Create Campaign
              </button>
            </div>

            <div className="bento-grid" style={{ marginBottom: 'var(--space-6)' }}>
              {Object.entries(campaignsByStatus).map(([status, statusCampaigns]) => (
                <div key={status} className="glass-card bento-item" style={{ padding: 'var(--space-4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                    <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', textTransform: 'capitalize' }}>
                      {status}
                    </h3>
                    <span className={`badge badge-${status}`}>
                      {statusCampaigns.length}
                    </span>
                  </div>
                  {statusCampaigns.length === 0 ? (
                    <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>No campaigns</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {statusCampaigns.slice(0, 3).map(campaign => (
                        <div key={campaign.id} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                          {campaign.name}
                        </div>
                      ))}
                      {statusCampaigns.length > 3 && (
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                          +{statusCampaigns.length - 3} more
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
                All Campaigns
              </h3>
              <CampaignList
                campaigns={clientCampaigns}
                onEditCampaign={setEditingCampaign}
                onDeleteCampaign={handleDeleteCampaign}
                onDuplicateCampaign={handleDuplicateCampaign}
                onToggleStatus={handleToggleStatus}
                onShowQR={setShowQRModal}
              />
            </div>
          </>
        )}

        {activeTab === 'leads' && (
          <div className="glass-card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h3 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-semibold)' }}>
                Lead Collection
              </h3>
              <button className="btn btn-success" onClick={exportLeadsCSV} disabled={clientLeads.length === 0}>
                <FiDownload /> Export CSV
              </button>
            </div>

            {clientLeads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <p style={{ color: 'var(--text-secondary)' }}>No leads collected yet</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: 'var(--text-sm)' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>Date</th>
                      <th style={{ padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>Campaign</th>
                      <th style={{ padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>Name</th>
                      <th style={{ padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>Email</th>
                      <th style={{ padding: 'var(--space-2)', color: 'var(--text-secondary)' }}>Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientLeads.map(lead => {
                      const campaign = campaigns.find(c => c.id === lead.campaign_id);
                      return (
                        <tr key={lead.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                          <td style={{ padding: 'var(--space-2)' }}>
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                          <td style={{ padding: 'var(--space-2)' }}>
                            {campaign?.name || 'Unknown'}
                          </td>
                          <td style={{ padding: 'var(--space-2)' }}>{lead.data.name || '-'}</td>
                          <td style={{ padding: 'var(--space-2)' }}>{lead.data.email || '-'}</td>
                          <td style={{ padding: 'var(--space-2)' }}>{lead.data.phone || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {showWizard && (
        <CampaignWizard
          clientId={clientId}
          onClose={() => setShowWizard(false)}
          onCampaignCreated={(campaign) => {
            setShowWizard(false);
            setEditingCampaign(campaign);
          }}
        />
      )}

      {showQRModal && (
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
        }} onClick={() => setShowQRModal(null)}>
          <div className="glass-card" style={{
            maxWidth: '600px',
            width: '100%',
            padding: 'var(--space-6)',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
              Share Campaign
            </h2>

            <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
              <div style={{ background: 'white', padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', display: 'inline-block' }}>
                <QRCode value={getCampaignURL(showQRModal)} size={200} />
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-3)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                Campaign URL
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <input className="input" value={getCampaignURL(showQRModal)} readOnly style={{ flex: 1 }} />
                <button className="btn btn-secondary" onClick={() => copyToClipboard(getCampaignURL(showQRModal))}>
                  <FiCopy />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label style={{ display: 'block', marginBottom: 'var(--space-1)', color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                iFrame Embed Code
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <textarea
                  className="input"
                  value={getIFrameCode(showQRModal)}
                  readOnly
                  rows={3}
                  style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}
                />
                <button className="btn btn-secondary" onClick={() => copyToClipboard(getIFrameCode(showQRModal))}>
                  <FiCopy />
                </button>
              </div>
            </div>

            <button className="btn btn-primary w-full" onClick={() => setShowQRModal(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {showBrandingModal && (
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
              Edit Client Branding
            </h2>
            <ClientBrandingForm
              client={client}
              onSave={handleSaveBranding}
              onCancel={() => setShowBrandingModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}