import React from 'react';
import { FiCopy, FiTrash2, FiExternalLink, FiPlay, FiPause, FiGrid } from 'react-icons/fi';
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
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-dashed border-white/10 bg-white/5">
        <div className="w-16 h-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
          <FiPlay className="w-8 h-8 text-indigo-400 ml-1" />
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">No campaigns yet</h3>
        <p className="text-gray-400 max-w-sm mx-auto">Create your first spin-to-win campaign to start engaging your audience.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {campaigns.map((campaign) => {
        const analytics = getCampaignAnalytics ? getCampaignAnalytics(campaign.id) : (campaign.analytics || {});
        const views = analytics.views || 0;
        const leads = analytics.leads || 0;
        const winRate = analytics.win_rate || 0;
        const isActive = campaign.status === 'active';

        return (
          <GlassCard
            key={campaign.id}
            hoverEffect={true}
            onClick={() => onEditCampaign(campaign)}
            className="group flex flex-col h-full border-l-4"
            style={{ borderLeftColor: getStatusColor(campaign.status) }}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors line-clamp-1">
                    {campaign.name}
                  </h3>
                  {campaign.type === 'bizgamez' && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      BG
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-mono mt-1">ID: {campaign.id.substring(0, 8)}...</p>
              </div>
              <div className={`
                px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                ${isActive ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                  campaign.status === 'scheduled' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                  campaign.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                  'bg-gray-500/10 text-gray-400 border border-gray-500/20'}
              `}>
                {getStatusLabel(campaign.status)}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-400">Views</div>
                <div className="text-sm font-bold text-white">{views}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-400">Leads</div>
                <div className="text-sm font-bold text-indigo-400">{leads}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <div className="text-xs text-gray-400">Win Rate</div>
                <div className={`text-sm font-bold ${campaign.type === 'bizgamez' ? 'text-gray-500' : 'text-green-400'}`}>
                  {campaign.type === 'bizgamez' ? 'Unknown' : `${winRate}%`}
                </div>
              </div>
            </div>

            <div className="flex-1"></div>

            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-2">
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
          </GlassCard>
        );
      })}
    </div>
  );
};

export default CampaignList;
