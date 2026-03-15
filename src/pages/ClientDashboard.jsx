import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiDownload, FiCopy, FiSettings, FiLogOut, FiUser, FiMail, FiPhone, FiCalendar, FiHeart, FiTag, FiChevronDown, FiUsers } from 'react-icons/fi';
import { usePlatform } from '../context/PlatformContext';
import { useAuth } from '../context/AuthContext';
import CampaignWizard from '../components/CampaignWizard';
import BizGamezCampaignBuilder from '../components/admin/BizGamezCampaignBuilder';
import LoyaltyProgramBuilder from '../components/admin/LoyaltyProgramBuilder';
import CampaignList from '../components/admin/CampaignList';
import LoyaltyMemberManagement from '../components/admin/LoyaltyMemberManagement';
import ClientLimitsPanel from '../components/agency/ClientLimitsPanel';
import QRCode from 'qrcode.react';
import StatusBadge from '../components/StatusBadge';
import ClientBrandingForm from '../components/ClientBrandingForm';
import FloatingActionButton from '../components/layout/FloatingActionButton';

export default function ClientDashboard() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const {
    signOut, isClient, isClientAdmin, isClientUser,
    canAddCampaign, canEditCampaign, canDeleteCampaign, canActivatePause, canViewStats,
    getPermittedBrandIds
  } = useAuth();
  const {
    clients, brands, campaigns, leads,
    getCampaignsByBrand, getCampaignsByClient,
    deleteCampaign, duplicateCampaign, toggleCampaignStatus,
    updateClient, getCampaignAnalytics, getClientUsage,
    getBrandsByClient
  } = usePlatform();

  const [activeTab, setActiveTab] = useState('campaigns');
  const [showWizard, setShowWizard] = useState(false);
  const [showQRModal, setShowQRModal] = useState(null);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [selectedBrandId, setSelectedBrandId] = useState('all');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const client = clients.find(c => c.id === clientId);
  const allClientBrands = getBrandsByClient(clientId);

  const clientBrands = useMemo(() => {
    if (isClientAdmin()) return allClientBrands;
    const permittedIds = getPermittedBrandIds();
    return allClientBrands.filter(b => permittedIds.includes(b.id));
  }, [allClientBrands, isClientAdmin, getPermittedBrandIds]);

  const selectedBrand = selectedBrandId !== 'all' ? clientBrands.find(b => b.id === selectedBrandId) : null;

  const clientCampaigns = selectedBrandId === 'all'
    ? (isClientAdmin()
        ? getCampaignsByClient(clientId)
        : campaigns.filter(c => clientBrands.some(b => b.id === c.brand_id)))
    : getCampaignsByBrand(selectedBrandId);

  const clientLeads = selectedBrandId === 'all'
    ? leads.filter(l => l.client_id === clientId && clientBrands.some(b => b.id === l.brand_id))
    : leads.filter(l => l.brand_id === selectedBrandId);

  const usage = getClientUsage(clientId);

  const campaignsByStatus = {
    draft: clientCampaigns.filter(c => c.status === 'draft'),
    scheduled: clientCampaigns.filter(c => c.status === 'scheduled'),
    active: clientCampaigns.filter(c => c.status === 'active'),
    completed: clientCampaigns.filter(c => c.status === 'completed')
  };

  const showStats = isClientAdmin() || canViewStats(selectedBrandId);

  const userCanAdd = isClientAdmin() || canAddCampaign(selectedBrandId);
  const userCanEdit = isClientAdmin() || canEditCampaign(selectedBrandId);
  const userCanDelete = isClientAdmin() || canDeleteCampaign(selectedBrandId);
  const userCanToggle = isClientAdmin() || canActivatePause(selectedBrandId);

  const exportLeadsCSV = () => {
    if (clientLeads.length === 0) { alert('No leads to export'); return; }
    const headers = ['Date', 'Campaign', 'Brand', 'Name', 'Email', 'Phone'];
    const rows = clientLeads.map(lead => {
      const campaign = campaigns.find(c => c.id === lead.campaign_id);
      const brand = clientBrands.find(b => b.id === lead.brand_id);
      return [
        new Date(lead.created_at).toLocaleDateString(),
        campaign?.name || 'Unknown',
        brand?.name || 'Unknown',
        lead.data?.name || '',
        lead.data?.email || '',
        lead.data?.phone || ''
      ];
    });
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${client?.name || 'export'}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); alert('Copied to clipboard!'); };

  const handleDeleteCampaign = async (campaignId) => {
    if (!confirm('Delete this campaign?')) return;
    try { await deleteCampaign(campaignId); } catch (error) { alert('Failed to delete campaign'); }
  };

  const handleDuplicateCampaign = async (campaignId) => {
    try { const newCampaign = await duplicateCampaign(campaignId); setEditingCampaign(newCampaign); } catch (error) { alert('Failed to duplicate campaign'); }
  };

  const handleToggleStatus = async (campaignId, currentStatus) => {
    try { await toggleCampaignStatus(campaignId, currentStatus); } catch (error) { alert('Failed to update campaign status'); }
  };

  const handleSaveBranding = async (formData) => {
    try { await updateClient(clientId, formData); setShowBrandingModal(false); } catch (error) { throw error; }
  };

  const handleSignOut = async () => { await signOut(); navigate('/login'); };

  if (!client) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center p-4">
          <p className="mb-3" style={{ color: 'var(--text-secondary)' }}>Client not found</p>
          <button className="btn btn-primary" onClick={() => navigate('/agency')}>Back to Agency Dashboard</button>
        </div>
      </div>
    );
  }

  if (editingCampaign) {
    if (editingCampaign.type === 'bizgamez') {
      return <BizGamezCampaignBuilder campaign={editingCampaign} client={client} onBack={() => setEditingCampaign(null)} />;
    }
    if (editingCampaign.type === 'loyalty') {
      return <LoyaltyProgramBuilder campaign={editingCampaign} client={client} onBack={() => setEditingCampaign(null)} />;
    }
    setEditingCampaign(null);
    return null;
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
          <button className="btn btn-ghost text-sm mb-3 p-2" onClick={() => navigate('/agency')}>
            <FiArrowLeft size={18} /> <span className="hidden md:inline">Back to Agency</span>
          </button>
        )}

        <div className="glass-card p-3 md:p-4 mb-4">
          <div className="flex items-start gap-3">
            {client.logo_url ? (
              <img src={client.logo_url} alt="" className="w-12 h-12 md:w-16 md:h-16 rounded-lg object-contain flex-shrink-0" onError={(e) => { e.target.style.display = 'none'; }} />
            ) : (
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                <FiUser size={24} style={{ color: 'var(--text-tertiary)' }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-bold truncate mb-1" style={{ color: 'var(--text-primary)' }}>{client.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={client.status} size="sm" />
                <span className="text-xs hidden md:inline" style={{ color: 'var(--text-tertiary)' }}>{client.email}</span>
              </div>
            </div>
            <div className="hidden md:flex gap-2 flex-shrink-0 items-center">
              {isClientUser() && (
                <button
                  onClick={() => navigate('/staff')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <FiUsers size={14} />
                  Staff Terminal
                </button>
              )}
              {isClientAdmin() && (
                <button className="btn btn-ghost p-2" onClick={() => setShowBrandingModal(true)}><FiSettings size={18} /></button>
              )}
              <button className="btn btn-ghost p-2" onClick={handleSignOut}><FiLogOut size={18} /></button>
            </div>
          </div>
          {isClientUser() && (
            <div className="flex gap-2 mt-3 md:hidden">
              <button
                onClick={() => navigate('/staff')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <FiUsers size={14} />
                Staff Terminal
              </button>
            </div>
          )}
        </div>

        {clientBrands.length > 0 && (
          <div className="glass-card p-3 mb-4 flex items-center gap-3">
            <FiTag size={14} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Brand:</span>
            <div className="relative">
              <button
                onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
              >
                {selectedBrand ? (
                  <>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: selectedBrand.primary_color || 'var(--accent)' }} />
                    {selectedBrand.name}
                  </>
                ) : (
                  'All Brands'
                )}
                <FiChevronDown size={12} />
              </button>
              {showBrandDropdown && (
                <div className="absolute top-full left-0 mt-1 z-20 rounded-xl shadow-xl min-w-[160px]"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                  <button
                    onClick={() => { setSelectedBrandId('all'); setShowBrandDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors rounded-t-xl"
                    style={{ color: selectedBrandId === 'all' ? 'var(--accent)' : 'var(--text-primary)' }}
                  >
                    All Brands
                  </button>
                  {clientBrands.map(brand => (
                    <button
                      key={brand.id}
                      onClick={() => { setSelectedBrandId(brand.id); setShowBrandDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                      style={{ color: selectedBrandId === brand.id ? 'var(--accent)' : 'var(--text-primary)' }}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: brand.primary_color || 'var(--accent)' }} />
                      {brand.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedBrand && (
              <span className="text-xs ml-auto" style={{ color: 'var(--text-tertiary)' }}>
                {clientCampaigns.length} campaign{clientCampaigns.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {isClientAdmin() && usage && (
          <div className="mb-4">
            <ClientLimitsPanel client={client} usage={usage} editable={false} />
          </div>
        )}

        <div className="flex gap-2 mb-4 pb-2 -mx-3 px-3 overflow-x-auto hide-scrollbar" style={{ borderBottom: '1px solid var(--border-color)' }}>
          {['campaigns', 'leads', 'loyalty'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2"
              style={{
                background: activeTab === tab ? (tab === 'loyalty' ? 'var(--error)' : 'var(--brand-primary)') : 'transparent',
                color: activeTab === tab ? 'white' : 'var(--text-secondary)'
              }}
            >
              {tab === 'loyalty' && <FiHeart size={14} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'leads' && (
                <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: activeTab === tab ? 'rgba(255,255,255,0.2)' : 'var(--glass-bg)' }}>
                  {clientLeads.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'campaigns' && (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg md:text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {showStats ? 'Overview' : 'Campaigns'}
              </h2>
              {userCanAdd && (
                <button className="btn btn-primary hidden md:flex" onClick={() => setShowWizard(true)}><FiPlus /> Create Campaign</button>
              )}
            </div>

            {showStats && (
              <div className="horizontal-scroll hide-scrollbar md:grid-cols-4 mb-4 md:mb-6 -mx-3 px-3 md:mx-0 md:px-0">
                {Object.entries(campaignsByStatus).map(([status, statusCampaigns]) => (
                  <div key={status} className="glass-card w-32 md:w-auto flex-shrink-0 p-3 md:p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>{status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getStatusBadgeClass(status)}`}>{statusCampaigns.length}</span>
                    </div>
                    <p className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{statusCampaigns.length}</p>
                  </div>
                ))}
              </div>
            )}

            <div>
              {showStats && <h3 className="text-base md:text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>All Campaigns</h3>}
              <CampaignList
                campaigns={clientCampaigns}
                brands={clientBrands}
                onEditCampaign={userCanEdit ? setEditingCampaign : null}
                onDeleteCampaign={userCanDelete ? handleDeleteCampaign : null}
                onDuplicateCampaign={userCanEdit ? handleDuplicateCampaign : null}
                onToggleStatus={userCanToggle ? handleToggleStatus : null}
                onShowQR={setShowQRModal}
                getCampaignAnalytics={getCampaignAnalytics}
              />
            </div>
          </>
        )}

        {activeTab === 'leads' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Lead Collection</h3>
              <button className="btn btn-success btn-sm md:btn" onClick={exportLeadsCSV} disabled={clientLeads.length === 0}>
                <FiDownload /> <span className="hidden md:inline">Export CSV</span>
              </button>
            </div>
            {clientLeads.length === 0 ? (
              <div className="glass-card p-8 text-center"><p style={{ color: 'var(--text-secondary)' }}>No leads collected yet</p></div>
            ) : (
              <>
                <div className="hidden md:block glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                          {['Date', 'Brand', 'Campaign', 'Name', 'Email', 'Phone'].map(h => (
                            <th key={h} className="text-left p-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {clientLeads.map(lead => {
                          const campaign = campaigns.find(c => c.id === lead.campaign_id);
                          const brand = clientBrands.find(b => b.id === lead.brand_id);
                          return (
                            <tr key={lead.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                              <td className="p-3" style={{ color: 'var(--text-primary)' }}>{new Date(lead.created_at).toLocaleDateString()}</td>
                              <td className="p-3" style={{ color: 'var(--text-primary)' }}>{brand?.name || '—'}</td>
                              <td className="p-3" style={{ color: 'var(--text-primary)' }}>{campaign?.name || 'Unknown'}</td>
                              <td className="p-3" style={{ color: 'var(--text-primary)' }}>{lead.data?.name || '-'}</td>
                              <td className="p-3" style={{ color: 'var(--text-primary)' }}>{lead.data?.email || '-'}</td>
                              <td className="p-3" style={{ color: 'var(--text-primary)' }}>{lead.data?.phone || '-'}</td>
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
                    const brand = clientBrands.find(b => b.id === lead.brand_id);
                    return (
                      <div key={lead.id} className="glass-card p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FiUser size={14} style={{ color: 'var(--text-secondary)' }} />
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{lead.data?.name || 'Unknown'}</span>
                          </div>
                          <span className="text-xs flex items-center gap-1" style={{ color: 'var(--text-tertiary)' }}>
                            <FiCalendar size={12} />{new Date(lead.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs mb-1 truncate" style={{ color: 'var(--text-tertiary)' }}>{brand?.name} · {campaign?.name || 'Unknown Campaign'}</div>
                        <div className="flex flex-wrap gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {lead.data?.email && <span className="flex items-center gap-1"><FiMail size={12} /><span className="truncate max-w-[140px]">{lead.data.email}</span></span>}
                          {lead.data?.phone && <span className="flex items-center gap-1"><FiPhone size={12} />{lead.data.phone}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'loyalty' && (
          <LoyaltyMemberManagement clientId={clientId} campaigns={clientCampaigns} />
        )}
      </div>

      {userCanAdd && (
        <FloatingActionButton onClick={() => setShowWizard(true)} label="Create Campaign" />
      )}

      {showWizard && (
        <CampaignWizard
          clientId={clientId}
          brandId={selectedBrandId !== 'all' ? selectedBrandId : (clientBrands[0]?.id || null)}
          brands={clientBrands}
          onClose={() => setShowWizard(false)}
          onCampaignCreated={(campaign) => { setShowWizard(false); setEditingCampaign(campaign); }}
        />
      )}

      {showQRModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: 'var(--overlay-bg)' }} onClick={() => setShowQRModal(null)}>
          <div className="glass-card w-full md:max-w-lg rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Share Campaign</h2>
              <div className="text-center mb-4">
                <div className="bg-white p-3 rounded-xl inline-block">
                  <QRCode value={`${window.location.origin}/loyalty/${showQRModal.slug}`} size={160} />
                </div>
              </div>
              <div className="mb-3">
                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Campaign URL</label>
                <div className="flex gap-2">
                  <input className="input flex-1 text-sm" value={`${window.location.origin}/loyalty/${showQRModal.slug}`} readOnly />
                  <button className="btn btn-secondary p-2" onClick={() => copyToClipboard(`${window.location.origin}/loyalty/${showQRModal.slug}`)}>
                    <FiCopy size={18} />
                  </button>
                </div>
              </div>
              <button className="btn btn-primary w-full" onClick={() => setShowQRModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showBrandingModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'var(--overlay-bg)' }}>
          <div className="glass-card w-full md:max-w-2xl md:mx-4 rounded-t-2xl md:rounded-2xl max-h-[90vh] overflow-auto" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
            <div className="sticky top-0 p-4" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Edit Client Branding</h2>
            </div>
            <div className="p-4">
              <ClientBrandingForm client={client} onSave={handleSaveBranding} onCancel={() => setShowBrandingModal(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
