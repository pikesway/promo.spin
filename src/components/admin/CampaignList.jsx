import React from 'react';
import { FiCopy, FiTrash2, FiExternalLink, FiPlay, FiPause, FiGrid, FiChevronRight, FiTarget } from 'react-icons/fi';
import GlassCard from '../common/GlassCard';

const CampaignList = ({
  campaigns,
  onEditCampaign,
  onDeleteCampaign,
  onDuplicateCampaign,
  onToggleStatus,
  onShowQR,
  getCampaignAnalytics
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'scheduled': return '#F59E0B';
      case 'completed': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getCampaignUrl = (campaign) => {
    return `${window.location.origin}${window.location.pathname}#/play/${campaign.slug}`;
  };

  if (campaigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/5">
        <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-3 md:mb-4">
          <FiTarget className="w-6 h-6 md:w-8 md:h-8 text-blue-400" />
        </div>
        <h3 className="text-lg md:text-xl font-semibold text-white mb-2">No campaigns yet</h3>
        <p className="text-sm md:text-base text-gray-400 max-w-sm mx-auto">Create your first campaign to start engaging your audience.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
      {campaigns.map((campaign) => {
        const analytics = getCampaignAnalytics ? getCampaignAnalytics(campaign.id) : (campaign.analytics || {});
        const views = analytics.views || 0;
        const leads = analytics.leads || 0;
        const winRate = analytics.win_rate || 0;
        const isActive = campaign.status === 'active';

        return (
          <div
            key={campaign.id}
            onClick={() => onEditCampaign(campaign)}
            className="glass-card p-3 md:p-4 cursor-pointer hover:bg-white/5 transition-colors active:bg-white/10 border-l-4 md:flex md:flex-col"
            style={{ borderLeftColor: getStatusColor(campaign.status) }}
          >
            <div className="flex items-center gap-3 md:block">
              <div className="flex-1 min-w-0 md:mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base md:text-lg font-bold text-white truncate">
                    {campaign.name}
                  </h3>
                  {campaign.type === 'bizgamez' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30 flex-shrink-0">
                      BG
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`
                    px-2 py-0.5 rounded text-[10px] font-bold uppercase
                    ${isActive ? 'bg-green-500/10 text-green-400' :
                      campaign.status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-400' :
                      campaign.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                      'bg-gray-500/10 text-gray-400'}
                  `}>
                    {getStatusLabel(campaign.status)}
                  </span>
                  <span className="text-xs text-blue-400 font-semibold">{leads} leads</span>
                </div>
              </div>

              <FiChevronRight className="text-gray-500 flex-shrink-0 md:hidden" size={20} />

              <div className="hidden md:block">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400">Views</div>
                    <div className="text-sm font-bold text-white">{views}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400">Leads</div>
                    <div className="text-sm font-bold text-blue-400">{leads}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400">Win Rate</div>
                    <div className={`text-sm font-bold ${campaign.type === 'bizgamez' ? 'text-gray-500' : 'text-green-400'}`}>
                      {campaign.type === 'bizgamez' ? '-' : `${winRate}%`}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex space-x-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); onToggleStatus(campaign.id, campaign.status); }}
                      className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title={isActive ? "Pause" : "Activate"}
                    >
                      {isActive ? <FiPause className="w-4 h-4" /> : <FiPlay className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicateCampaign(campaign.id); }}
                      className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="Duplicate"
                    >
                      <FiCopy className="w-4 h-4" />
                    </button>
                    {campaign.type !== 'bizgamez' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onShowQR(campaign); }}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="QR Code & Share"
                      >
                        <FiGrid className="w-4 h-4" />
                      </button>
                    )}
                    {campaign.type !== 'bizgamez' && (
                      <a
                        href={getCampaignUrl(campaign)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title="Open Live"
                      >
                        <FiExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteCampaign(campaign.id); }}
                    className="p-2 hover:bg-red-500/20 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampaignList;
