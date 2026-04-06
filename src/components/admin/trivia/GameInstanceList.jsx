import React, { useState } from 'react';
import { FiEdit2, FiPlay, FiPause, FiLink, FiCheck, FiAward } from 'react-icons/fi';
import { usePlatform } from '../../../context/PlatformContext';
import GlassCard from '../../common/GlassCard';
import { generateTriviaLaunchURL } from '../../../utils/triviaUrlGenerator';
import QRCodeModal from './QRCodeModal';

const STATUS_COLORS = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
};

const GameInstanceList = ({ instances, onEdit, onRefresh, campaignId }) => {
  const { updateGameInstance } = usePlatform();
  const [isUpdating, setIsUpdating] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState(null);

  const handleToggleStatus = async (instance) => {
    setIsUpdating(instance.id);
    try {
      const newStatus = instance.status === 'active' ? 'paused' : 'active';
      await updateGameInstance(instance.id, { status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setIsUpdating(null);
  };

  const handleCopyLink = async (instance) => {
    const url = generateTriviaLaunchURL(campaignId, instance.template_id, instance.id);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(instance.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleShowQRCode = (instance) => {
    setSelectedInstance(instance);
    setQrModalOpen(true);
  };

  const getLeaderboardUrl = (instance) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/public/leaderboard?instance_id=${instance.id}&campaign_id=${campaignId}`;
  };

  if (instances.length === 0) {
    return (
      <GlassCard>
        <div className="text-center py-12">
          <p className="text-gray-500 mb-2">No game instances yet</p>
          <p className="text-xs text-gray-600">Create your first game instance to get started</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <QRCodeModal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        url={selectedInstance ? getLeaderboardUrl(selectedInstance) : ''}
        instanceName={selectedInstance?.name}
      />
      <div className="space-y-3">
        {instances.map(instance => {
        const isFinalized = !!instance.finalized_at;
        const canToggleStatus = ['draft', 'paused', 'active'].includes(instance.status);

        return (
          <GlassCard key={instance.id}>
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium truncate">{instance.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STATUS_COLORS[instance.status]}`}>
                    {instance.status}
                  </span>
                  {isFinalized && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                      Finalized
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {instance.template_id && (
                    <span>Template: {instance.template_id}</span>
                  )}
                  {instance.start_at && (
                    <span>Start: {new Date(instance.start_at).toLocaleDateString()}</span>
                  )}
                  {instance.end_at && (
                    <span>End: {new Date(instance.end_at).toLocaleDateString()}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isUpdating === instance.id ? (
                  <span className="text-xs text-gray-500">Updating...</span>
                ) : (
                  <>
                    <button
                      onClick={() => handleShowQRCode(instance)}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Show QR Code for Leaderboard"
                    >
                      <FiAward className="w-4 h-4" />
                    </button>
                    {instance.template_id && (
                      <button
                        onClick={() => handleCopyLink(instance)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                        style={{
                          color: copiedId === instance.id ? 'var(--success)' : 'var(--text-tertiary)'
                        }}
                        title="Copy Launch URL"
                      >
                        {copiedId === instance.id ? (
                          <FiCheck className="w-4 h-4" />
                        ) : (
                          <FiLink className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {canToggleStatus && !isFinalized && (
                      <button
                        onClick={() => handleToggleStatus(instance)}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                        title={instance.status === 'active' ? 'Pause' : 'Activate'}
                      >
                        {instance.status === 'active' ? (
                          <FiPause className="w-4 h-4" />
                        ) : (
                          <FiPlay className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(instance)}
                      className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        );
        })}
      </div>
    </>
  );
};

export default GameInstanceList;
