import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiDownload, FiCopy, FiSettings, FiLogOut, FiUser, FiMail, FiPhone, FiCalendar } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../context/AuthContext';
import CampaignWizard from '../components/CampaignWizard';
import CampaignBuilder from '../components/admin/CampaignBuilder';
import BizGamezCampaignBuilder from '../components/admin/BizGamezCampaignBuilder';
import CampaignList from '../components/admin/CampaignList';
import QRCode from 'qrcode.react';
import StatusBadge from '../components/StatusBadge';
import ClientBrandingForm from '../components/ClientBrandingForm';
import FloatingActionButton from '../components/layout/FloatingActionButton';

export default function ClientDashboard() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { signOut, isClient } = useAuth();
  const { clients, campaigns, leads, getCampaignsByClient, getLeadsByClient, deleteCampaign, duplicateCampaign, toggleCampaignStatus, updateClient, getCampaignAnalytics } = usePlatform();
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
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center p-4">
          <p className="text-gray-400 mb-3">Client not found</p>
          <button className="btn btn-primary" onClick={() => navigate('/agency')}>
            Back to Agency Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (editingCampaign) {
    if (editingCampaign.type === 'bizgamez') {
      return (
        <BizGamezCampaignBuilder
          campaign={editingCampaign}
          client={client}
          onBack={() => setEditingCampaign(null)}
        />
      );
    }
    return (
      <CampaignBuilder
        campaign={editingCampaign}
        client={client}
        onBack={() => setEditingCampaign(null)}
      />
    );
  }

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400';
      case 'scheduled': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="container px-3 md:px-4 py-4 md:py-6">
        {!isClient() && (
          <button
            className="btn btn-ghost text-sm mb-3 p-2"
            onClick={() => navigate('/agency')}
          >
            <FiArrowLeft size={18} /> <span className="hidden md:inline">Back to Agency</span>
          </button>
        )}

        <div className="glass-card p-3 md:p-4 mb-4">
          <div className="flex items-start gap-3">
            {client.logo_url ? (
              <img
                src={client.logo_url}
                alt=""
                className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-contain flex-shrink-0"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                <FiUser className="text-gray-500" size={24} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold text-white truncate mb-1">{client.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={client.status} size="sm" />
                <span className="text-xs text-gray-500 hidden md:inline">{client.email}</span>
              </div>
            </div>
            <div className="hidden md:flex gap-2 flex-shrink-0">
              <button className="btn btn-ghost p-2" onClick={() => setShowBrandingModal(true)}>
                <FiSettings size={18} />
              </button>
              <button className="btn btn-ghost p-2" onClick={handleSignOut}>
                <FiLogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 border-b border-white/10 pb-2 -mx-3 px-3 overflow-x-auto hide-scrollbar">
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === 'campaigns'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
              activeTab === 'leads'
                ? 'bg-blue-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Leads
            <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === 'leads' ? 'bg-white/20' : 'bg-white/10'}`}>
              {clientLeads.length}
            </span>
          </button>
        </div>

        {activeTab === 'campaigns' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-2xl font-semibold text-white">Overview</h2>
              <button className="btn btn-primary hidden md:flex" onClick={() => setShowWizard(true)}>
                <FiPlus /> Create Campaign
              </button>
            </div>

            <div className="horizontal-scroll hide-scrollbar md:grid-cols-4 mb-4 md:mb-6 -mx-3 px-3 md:mx-0 md:px-0">
              {Object.entries(campaignsByStatus).map(([status, statusCampaigns]) => (
                <div key={status} className="glass-card w-32 md:w-auto flex-shrink-0 p-3 md:p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400 capitalize">{status}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getStatusBadgeClass(status)}`}>
                      {statusCampaigns.length}
                    </span>
                  </div>
                  <p className="text-2xl md:text-3xl font-bold text-white">{statusCampaigns.length}</p>
                </div>
              ))}
            </div>

            <div>
              <h3 className="text-base md:text-xl font-semibold text-white mb-3">All Campaigns</h3>
              <CampaignList
                campaigns={clientCampaigns}
                onEditCampaign={setEditingCampaign}
                onDeleteCampaign={handleDeleteCampaign}
                onDuplicateCampaign={handleDuplicateCampaign}
                onToggleStatus={handleToggleStatus}
                onShowQR={setShowQRModal}
                getCampaignAnalytics={getCampaignAnalytics}
              />
            </div>
          </>
        )}

        {activeTab === 'leads' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-semibold text-white">Lead Collection</h3>
              <button
                className="btn btn-success btn-sm md:btn"
                onClick={exportLeadsCSV}
                disabled={clientLeads.length === 0}
              >
                <FiDownload /> <span className="hidden md:inline">Export CSV</span>
              </button>
            </div>

            {clientLeads.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <p className="text-gray-400">No leads collected yet</p>
              </div>
            ) : (
              <>
                <div className="hidden md:block glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left p-3 text-gray-400 font-medium">Date</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Campaign</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Name</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Email</th>
                          <th className="text-left p-3 text-gray-400 font-medium">Phone</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientLeads.map(lead => {
                          const campaign = campaigns.find(c => c.id === lead.campaign_id);
                          return (
                            <tr key={lead.id} className="border-b border-white/5 hover:bg-white/5">
                              <td className="p-3 text-white">{new Date(lead.created_at).toLocaleDateString()}</td>
                              <td className="p-3 text-white">{campaign?.name || 'Unknown'}</td>
                              <td className="p-3 text-white">{lead.data.name || '-'}</td>
                              <td className="p-3 text-white">{lead.data.email || '-'}</td>
                              <td className="p-3 text-white">{lead.data.phone || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="md:hidden flex flex-col gap-2">
                  {clientLeads.map(lead => {
                    const campaign = campaigns.find(c => c.id === lead.campaign_id);
                    return (
                      <div key={lead.id} className="glass-card p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FiUser className="text-gray-400" size={14} />
                            <span className="text-white font-medium">{lead.data.name || 'Unknown'}</span>
                          </div>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <FiCalendar size={12} />
                            {new Date(lead.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mb-1 truncate">
                          {campaign?.name || 'Unknown Campaign'}
                        </div>
                        <div className="flex flex-wrap gap-3 text-xs text-gray-400">
                          {lead.data.email && (
                            <span className="flex items-center gap-1">
                              <FiMail size={12} />
                              <span className="truncate max-w-[140px]">{lead.data.email}</span>
                            </span>
                          )}
                          {lead.data.phone && (
                            <span className="flex items-center gap-1">
                              <FiPhone size={12} />
                              {lead.data.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <FloatingActionButton
        onClick={() => setShowWizard(true)}
        label="Create Campaign"
      />

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
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
          onClick={() => setShowQRModal(null)}
        >
          <div
            className="glass-card w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-auto"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <h2 className="text-xl font-semibold text-white mb-4">Share Campaign</h2>

              <div className="text-center mb-4">
                <div className="bg-white p-3 rounded-xl inline-block">
                  <QRCode value={getCampaignURL(showQRModal)} size={160} />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-gray-400 mb-1">Campaign URL</label>
                <div className="flex gap-2">
                  <input className="input flex-1 text-sm" value={getCampaignURL(showQRModal)} readOnly />
                  <button className="btn btn-secondary p-2" onClick={() => copyToClipboard(getCampaignURL(showQRModal))}>
                    <FiCopy size={18} />
                  </button>
                </div>
              </div>

              <div className="mb-4 hidden md:block">
                <label className="block text-xs text-gray-400 mb-1">iFrame Embed Code</label>
                <div className="flex gap-2">
                  <textarea
                    className="input flex-1 text-xs font-mono"
                    value={getIFrameCode(showQRModal)}
                    readOnly
                    rows={2}
                  />
                  <button className="btn btn-secondary p-2" onClick={() => copyToClipboard(getIFrameCode(showQRModal))}>
                    <FiCopy size={18} />
                  </button>
                </div>
              </div>

              <button className="btn btn-primary w-full" onClick={() => setShowQRModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showBrandingModal && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: 'rgba(0, 0, 0, 0.8)' }}
        >
          <div
            className="glass-card w-full md:max-w-2xl md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-auto"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          >
            <div className="sticky top-0 p-4 border-b border-white/10" style={{ background: 'var(--bg-secondary)' }}>
              <h2 className="text-xl font-semibold text-white">Edit Client Branding</h2>
            </div>
            <div className="p-4">
              <ClientBrandingForm
                client={client}
                onSave={handleSaveBranding}
                onCancel={() => setShowBrandingModal(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
