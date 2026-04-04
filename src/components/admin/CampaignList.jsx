import React from 'react';
import { FiCopy, FiTrash2, FiExternalLink, FiPlay, FiPause, FiGrid, FiChevronRight, FiTarget, FiTag } from 'react-icons/fi';

const CampaignList = ({
  campaigns,
  brands = [],
  leads = null,
  onEditCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  onToggleStatus,
  onShowQR,
  getCampaignAnalytics,
  showStats = true
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'scheduled': return '#F59E0B';
      case 'completed': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getTypeLabel = (type) => {
    if (type === 'bizgamez') return { label: 'BG', bg: 'rgba(249,115,22,0.15)', color: '#F97316', border: 'rgba(249,115,22,0.3)' };
    if (type === 'loyalty') return { label: '♥', bg: 'rgba(244,63,94,0.15)', color: '#F43F5E', border: 'rgba(244,63,94,0.3)' };
    return null;
  };

  const getLoyaltyUrl = (campaign) => `${window.location.origin}/loyalty/${campaign.slug}`;

  const getBrandName = (brandId) => {
    if (!brandId || brands.length === 0) return null;
    return brands.find(b => b.id === brandId)?.name || null;
  };

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-color)', background: 'var(--glass-bg)' }}>
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-3 md:mb-4" style={{ background: 'var(--info-bg)' }}>
          <FiTarget className="w-6 h-6 md:w-8 md:h-8" style={{ color: 'var(--info)' }} />
        </div>
        <h3 className="text-lg md:text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>No campaigns yet</h3>
        <p className="text-sm md:text-base max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
          Create your first campaign to start engaging your audience.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
      {campaigns.map((campaign) => {
        const analytics = getCampaignAnalytics ? getCampaignAnalytics(campaign.id) : (campaign.analytics || {});
        const leadsCount = leads
          ? leads.filter(l => l.metadata?.campaign_id === campaign.id).length
          : (analytics.totalLeads || analytics.leads || 0);
        const isActive = campaign.status === 'active';
        const typeLabel = getTypeLabel(campaign.type);
        const brandName = getBrandName(campaign.brand_id);

        return (
          <div
            key={campaign.id}
            onClick={() => onEditCampaign && onEditCampaign(campaign)}
            className={`glass-card p-3 md:p-4 transition-colors active:scale-[0.99] md:flex md:flex-col border-l-4 ${onEditCampaign ? 'cursor-pointer' : ''}`}
            style={{ borderLeftColor: getStatusColor(campaign.status), background: 'var(--card-bg)' }}
          >
            <div className="flex items-center gap-3 md:block">
              <div className="flex-1 min-w-0 md:mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base md:text-lg font-bold truncate" style={{ color: 'var(--text-primary)' }}>{campaign.name}</h3>
                  {typeLabel && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold flex-shrink-0" style={{ background: typeLabel.bg, color: typeLabel.color, border: `1px solid ${typeLabel.border}` }}>
                      {typeLabel.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase" style={{
                    background: isActive ? 'var(--success-bg)' : campaign.status === 'scheduled' ? 'var(--warning-bg)' : campaign.status === 'completed' ? 'var(--info-bg)' : 'var(--bg-tertiary)',
                    color: isActive ? 'var(--success-text, var(--success))' : campaign.status === 'scheduled' ? 'var(--warning-text, var(--warning))' : campaign.status === 'completed' ? 'var(--info-text, var(--info))' : 'var(--text-tertiary)'
                  }}>
                    {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                  </span>
                  {showStats && <span className="text-xs font-semibold" style={{ color: 'var(--info)' }}>{leadsCount} leads</span>}
                  {brandName && (
                    <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--glass-bg)', color: 'var(--text-tertiary)' }}>
                      <FiTag size={9} />
                      {brandName}
                    </span>
                  )}
                </div>
              </div>

              <FiChevronRight className="flex-shrink-0 md:hidden" size={20} style={{ color: 'var(--icon-muted)' }} />

              <div className="hidden md:block">
                {showStats && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Leads</div>
                      <div className="text-sm font-bold" style={{ color: 'var(--info)' }}>{leadsCount}</div>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Type</div>
                      <div className="text-sm font-bold capitalize" style={{ color: 'var(--text-primary)' }}>{campaign.type}</div>
                    </div>
                  </div>
                )}

                {(onToggleStatus || onDuplicateCampaign || onShowQR || onDeleteCampaign) && (
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
                    <div className="flex space-x-1">
                      {onToggleStatus && (
                        <button onClick={(e) => { e.stopPropagation(); onToggleStatus(campaign.id, campaign.status); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--icon-secondary)' }} title={isActive ? 'Pause' : 'Activate'}>
                          {isActive ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
                        </button>
                      )}
                      {onDuplicateCampaign && (
                        <button onClick={(e) => { e.stopPropagation(); onDuplicateCampaign(campaign.id); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--icon-secondary)' }} title="Duplicate">
                          <FiCopy className="w-4 h-4" />
                        </button>
                      )}
                      {campaign.type === 'loyalty' && onShowQR && (
                        <button onClick={(e) => { e.stopPropagation(); onShowQR(campaign); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--icon-secondary)' }} title="QR Code & Share">
                          <FiGrid className="w-4 h-4" />
                        </button>
                      )}
                      {campaign.type === 'loyalty' && (
                        <a href={getLoyaltyUrl(campaign)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--icon-secondary)' }} title="Open Enrollment Page">
                          <FiExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    {onDeleteCampaign && (
                      <button onClick={(e) => { e.stopPropagation(); onDeleteCampaign(campaign.id); }} className="p-2 rounded-lg transition-colors" style={{ color: 'var(--text-tertiary)' }} title="Delete">
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampaignList;
