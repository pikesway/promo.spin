import React, { useState } from 'react';
import { FiEdit2, FiTrash2, FiPlay, FiPause, FiCheck, FiArchive, FiMoreVertical } from 'react-icons/fi';
import { usePlatform } from '../../../context/PlatformContext';
import GlassCard from '../../common/GlassCard';

const STATUS_COLORS = {
  draft: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  active: 'bg-green-500/20 text-green-400 border-green-500/30',
  paused: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  completed: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  archived: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
};

const GameInstanceList = ({ instances, onEdit, onRefresh, campaignId }) => {
  const { updateGameInstance, archiveGameInstance } = usePlatform();
  const [actionMenu, setActionMenu] = useState(null);
  const [isUpdating, setIsUpdating] = useState(null);

  const handleStatusChange = async (instanceId, newStatus) => {
    setIsUpdating(instanceId);
    setActionMenu(null);
    try {
      await updateGameInstance(instanceId, { status: newStatus });
      onRefresh();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
    setIsUpdating(null);
  };

  const handleArchive = async (instanceId) => {
    setIsUpdating(instanceId);
    setActionMenu(null);
    try {
      await archiveGameInstance(instanceId);
      onRefresh();
    } catch (error) {
      console.error('Failed to archive:', error);
    }
    setIsUpdating(null);
  };

  const getAvailableActions = (instance) => {
    const actions = [];
    switch (instance.status) {
      case 'draft':
        actions.push({ label: 'Activate', icon: FiPlay, status: 'active' });
        actions.push({ label: 'Schedule', icon: FiCheck, status: 'scheduled' });
        break;
      case 'scheduled':
        actions.push({ label: 'Activate', icon: FiPlay, status: 'active' });
        actions.push({ label: 'Back to Draft', icon: FiEdit2, status: 'draft' });
        break;
      case 'active':
        actions.push({ label: 'Pause', icon: FiPause, status: 'paused' });
        actions.push({ label: 'Complete', icon: FiCheck, status: 'completed' });
        break;
      case 'paused':
        actions.push({ label: 'Resume', icon: FiPlay, status: 'active' });
        actions.push({ label: 'Complete', icon: FiCheck, status: 'completed' });
        break;
      case 'completed':
        break;
      default:
        break;
    }
    return actions;
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
    <div className="space-y-3">
      {instances.map(instance => {
        const actions = getAvailableActions(instance);
        const isFinalized = !!instance.finalized_at;

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
                      onClick={() => onEdit(instance)}
                      className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                      title="Edit"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>

                    {actions.length > 0 && !isFinalized && (
                      <div className="relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === instance.id ? null : instance.id)}
                          className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                        >
                          <FiMoreVertical className="w-4 h-4" />
                        </button>

                        {actionMenu === instance.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActionMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-white/10 rounded-lg shadow-xl z-20 py-1 min-w-[150px]">
                              {actions.map((action, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleStatusChange(instance.id, action.status)}
                                  className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-gray-300 hover:text-white"
                                >
                                  <action.icon className="w-4 h-4" />
                                  {action.label}
                                </button>
                              ))}
                              <div className="border-t border-white/10 my-1" />
                              <button
                                onClick={() => handleArchive(instance.id)}
                                className="w-full px-4 py-2 text-left text-sm hover:bg-white/5 flex items-center gap-2 text-red-400 hover:text-red-300"
                              >
                                <FiArchive className="w-4 h-4" />
                                Archive
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
};

export default GameInstanceList;
