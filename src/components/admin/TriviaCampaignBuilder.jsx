import React, { useState, useEffect, useCallback } from 'react';
import { FiArrowLeft, FiSettings, FiList, FiGift, FiAward, FiFlag, FiSave, FiAlertTriangle } from 'react-icons/fi';
import { usePlatform } from '../../context/PlatformContext';
import GlassCard from '../common/GlassCard';
import GameInstanceList from './trivia/GameInstanceList';
import GameInstanceForm from './trivia/GameInstanceForm';
import TriviaRewardConfig from './trivia/TriviaRewardConfig';
import TriviaRewardAssignments from './trivia/TriviaRewardAssignments';

const TriviaCampaignBuilder = ({ campaign, client, onBack }) => {
  const {
    updateCampaign,
    getGameInstancesByCampaign,
    getTriviaRewardsByCampaign,
    finalizeInstance,
    finalizeCampaign
  } = usePlatform();

  const [activeTab, setActiveTab] = useState('settings');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState(null);
  const [instances, setInstances] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [instanceFormOpen, setInstanceFormOpen] = useState(false);
  const [editingInstance, setEditingInstance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [finalizingInstance, setFinalizingInstance] = useState(null);
  const [finalizingCampaign, setFinalizingCampaign] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(null);

  const [settings, setSettings] = useState({
    leaderboard_scope: 'both',
    default_scoring_mode: 'accuracy_speed_weighted',
    default_geo_enabled: false
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [instancesResult, rewardsResult] = await Promise.all([
      getGameInstancesByCampaign(campaign.id),
      getTriviaRewardsByCampaign(campaign.id)
    ]);
    if (!instancesResult.error) setInstances(instancesResult.data);
    if (!rewardsResult.error) setRewards(rewardsResult.data);
    setIsLoading(false);
  }, [campaign.id, getGameInstancesByCampaign, getTriviaRewardsByCampaign]);

  useEffect(() => {
    if (campaign) {
      setSettings({
        leaderboard_scope: campaign.leaderboard_scope || campaign.config?.trivia?.leaderboardScope || 'both',
        default_scoring_mode: campaign.default_scoring_mode || campaign.config?.trivia?.scoringMode || 'accuracy_speed_weighted',
        default_geo_enabled: campaign.default_geo_enabled ?? campaign.config?.trivia?.geoEnabled ?? false
      });
      loadData();
    }
  }, [campaign, loadData]);

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCampaign(campaign.id, {
        leaderboard_scope: settings.leaderboard_scope,
        default_scoring_mode: settings.default_scoring_mode,
        default_geo_enabled: settings.default_geo_enabled,
        config: {
          ...campaign.config,
          trivia: {
            leaderboardScope: settings.leaderboard_scope,
            scoringMode: settings.default_scoring_mode,
            geoEnabled: settings.default_geo_enabled
          }
        }
      });
      setHasChanges(false);
      setSaveToast({ type: 'success', text: 'Campaign saved!' });
      setTimeout(() => setSaveToast(null), 3000);
    } catch (error) {
      setSaveToast({ type: 'error', text: 'Failed to save campaign' });
    }
    setIsSaving(false);
  };

  const handleInstanceCreated = () => {
    setInstanceFormOpen(false);
    setEditingInstance(null);
    loadData();
  };

  const handleEditInstance = (instance) => {
    setEditingInstance(instance);
    setInstanceFormOpen(true);
  };

  const handleFinalizeInstance = async (instanceId) => {
    setFinalizingInstance(instanceId);
    setConfirmFinalize(null);
    try {
      const { data, error } = await finalizeInstance(instanceId);
      if (error) throw error;
      if (data?.already_finalized) {
        setSaveToast({ type: 'info', text: 'Instance was already finalized' });
      } else {
        setSaveToast({
          type: 'success',
          text: `Finalized! ${data?.players_ranked || 0} players ranked, ${data?.rewards_assigned || 0} rewards assigned${data?.anonymous_excluded > 0 ? ` (${data.anonymous_excluded} anonymous plays excluded)` : ''}`
        });
      }
      loadData();
    } catch (error) {
      setSaveToast({ type: 'error', text: 'Failed to finalize instance' });
    }
    setFinalizingInstance(null);
    setTimeout(() => setSaveToast(null), 5000);
  };

  const handleFinalizeCampaign = async () => {
    setFinalizingCampaign(true);
    setConfirmFinalize(null);
    try {
      const { data, error } = await finalizeCampaign(campaign.id);
      if (error) throw error;
      if (data?.already_finalized) {
        setSaveToast({ type: 'info', text: 'Campaign was already finalized' });
      } else {
        setSaveToast({
          type: 'success',
          text: `Campaign finalized! ${data?.players_ranked || 0} players ranked, ${data?.rewards_assigned || 0} rewards assigned${data?.anonymous_excluded > 0 ? ` (${data.anonymous_excluded} anonymous plays excluded)` : ''}`
        });
      }
      loadData();
    } catch (error) {
      setSaveToast({ type: 'error', text: 'Failed to finalize campaign' });
    }
    setFinalizingCampaign(false);
    setTimeout(() => setSaveToast(null), 5000);
  };

  const handleRewardsUpdated = () => {
    loadData();
  };

  const finalizedInstanceCount = instances.filter(i => i.finalized_at).length;
  const totalInstanceCount = instances.length;
  const showInstanceRewards = settings.leaderboard_scope === 'instance' || settings.leaderboard_scope === 'both';
  const showCampaignRewards = settings.leaderboard_scope === 'campaign' || settings.leaderboard_scope === 'both';

  const tabs = [
    { id: 'settings', label: 'Settings', icon: FiSettings },
    { id: 'instances', label: 'Game Instances', icon: FiList, badge: instances.length },
    { id: 'rewards', label: 'Rewards', icon: FiGift },
    { id: 'assignments', label: 'Winners', icon: FiAward },
    { id: 'finalize', label: 'Finalization', icon: FiFlag }
  ];

  return (
    <div className="h-full flex flex-col bg-zinc-900 text-white">
      {saveToast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm font-medium shadow-lg ${
          saveToast.type === 'success' ? 'bg-green-600 text-white' :
          saveToast.type === 'info' ? 'bg-blue-600 text-white' :
          'bg-red-600 text-white'
        }`}>
          {saveToast.text}
        </div>
      )}

      <header className="h-14 md:h-16 border-b border-white/10 bg-zinc-800 flex items-center justify-between px-3 md:px-6 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors flex-shrink-0"
          >
            <FiArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-bold text-white truncate">{campaign.name}</h1>
            <div className="hidden md:flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-teal-500/20 text-teal-400 border border-teal-500/30">
                Trivia
              </span>
              {campaign.finalized_at && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Finalized
                </span>
              )}
              <span className={`w-2 h-2 rounded-full ${hasChanges ? 'bg-amber-500' : 'bg-green-500'}`}></span>
              <span className="text-xs text-gray-500">
                {hasChanges ? 'Changes unsaved' : 'All changes saved'}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="hidden md:flex bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium items-center gap-2 shadow-lg shadow-teal-500/20 transition-colors"
        >
          <FiSave className="w-4 h-4" />
          <span>{isSaving ? 'Saving...' : 'Save'}</span>
        </button>

        {hasChanges && (
          <div className="md:hidden flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="text-xs text-amber-400">Unsaved</span>
          </div>
        )}
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <nav className="hidden md:flex w-64 border-r border-white/5 bg-zinc-800/50 flex-col">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-teal-500/10 text-teal-400 border-l-2 border-teal-500'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="ml-auto bg-zinc-700 text-gray-300 text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <nav className="md:hidden flex overflow-x-auto border-b border-white/5 bg-zinc-800/50 px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-teal-400 border-teal-500'
                  : 'text-gray-400 border-transparent'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {activeTab === 'settings' && (
            <div className="max-w-2xl">
              <GlassCard>
                <h2 className="text-lg font-semibold mb-4">Campaign Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Leaderboard Scope</label>
                    <select
                      className="select w-full"
                      value={settings.leaderboard_scope}
                      onChange={(e) => handleSettingsChange('leaderboard_scope', e.target.value)}
                    >
                      <option value="instance">Instance Only</option>
                      <option value="campaign">Campaign Only</option>
                      <option value="both">Both</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      {settings.leaderboard_scope === 'instance' && 'Each game instance has separate leaderboards and rewards.'}
                      {settings.leaderboard_scope === 'campaign' && 'Single leaderboard aggregating scores across all instances.'}
                      {settings.leaderboard_scope === 'both' && 'Both instance-level and campaign-level leaderboards and rewards.'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Default Scoring Mode</label>
                    <select
                      className="select w-full"
                      value={settings.default_scoring_mode}
                      onChange={(e) => handleSettingsChange('default_scoring_mode', e.target.value)}
                    >
                      <option value="accuracy_only">Accuracy Only</option>
                      <option value="accuracy_speed_weighted">Accuracy + Speed Weighted</option>
                      <option value="accuracy_then_fastest_time">Accuracy, then Speed Tiebreaker</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-white/10">
                    <div>
                      <p className="text-sm font-medium">Location Verification</p>
                      <p className="text-xs text-gray-500">Require players to be at location to play</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSettingsChange('default_geo_enabled', !settings.default_geo_enabled)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${settings.default_geo_enabled ? 'bg-teal-500' : 'bg-gray-600'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${settings.default_geo_enabled ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}

          {activeTab === 'instances' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Game Instances</h2>
                <button
                  onClick={() => { setEditingInstance(null); setInstanceFormOpen(true); }}
                  className="btn bg-teal-600 hover:bg-teal-500 text-white"
                >
                  Add Instance
                </button>
              </div>
              {isLoading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : (
                <GameInstanceList
                  instances={instances}
                  onEdit={handleEditInstance}
                  onRefresh={loadData}
                  campaignId={campaign.id}
                />
              )}
            </div>
          )}

          {activeTab === 'rewards' && (
            <TriviaRewardConfig
              campaignId={campaign.id}
              instances={instances}
              leaderboardScope={settings.leaderboard_scope}
              rewards={rewards}
              onUpdate={handleRewardsUpdated}
            />
          )}

          {activeTab === 'assignments' && (
            <TriviaRewardAssignments
              campaignId={campaign.id}
              instances={instances}
            />
          )}

          {activeTab === 'finalize' && (
            <div className="max-w-2xl space-y-6">
              {showInstanceRewards && (
                <GlassCard>
                  <h2 className="text-lg font-semibold mb-4">Instance Finalization</h2>
                  <p className="text-sm text-gray-400 mb-4">
                    Finalize individual game instances to lock leaderboards and assign instance-level rewards.
                  </p>
                  {instances.length === 0 ? (
                    <p className="text-gray-500 text-sm">No game instances created yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {instances.map(instance => (
                        <div
                          key={instance.id}
                          className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{instance.name}</p>
                            <p className="text-xs text-gray-500">
                              Status: {instance.status}
                              {instance.finalized_at && (
                                <span className="ml-2 text-blue-400">
                                  Finalized {new Date(instance.finalized_at).toLocaleDateString()}
                                </span>
                              )}
                            </p>
                          </div>
                          {instance.finalized_at ? (
                            <span className="text-xs text-blue-400 bg-blue-500/10 px-2 py-1 rounded">
                              Finalized
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmFinalize({ type: 'instance', id: instance.id, name: instance.name })}
                              disabled={finalizingInstance === instance.id}
                              className="btn btn-sm bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                            >
                              {finalizingInstance === instance.id ? 'Finalizing...' : 'Finalize'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              )}

              {showCampaignRewards && (
                <GlassCard>
                  <h2 className="text-lg font-semibold mb-4">Campaign Finalization</h2>
                  <p className="text-sm text-gray-400 mb-4">
                    Finalize the entire campaign to compute aggregate leaderboard and assign campaign-level rewards.
                    This uses cumulative scores across all finalized instances.
                  </p>

                  <div className="flex items-center gap-2 mb-4 p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{finalizedInstanceCount}</span> of <span className="font-medium">{totalInstanceCount}</span> instances finalized
                      </p>
                      {finalizedInstanceCount < totalInstanceCount && (
                        <p className="text-xs text-amber-400 flex items-center gap-1 mt-1">
                          <FiAlertTriangle className="w-3 h-3" />
                          Some instances are not finalized. Only finalized instances contribute to campaign leaderboard.
                        </p>
                      )}
                    </div>
                  </div>

                  {campaign.finalized_at ? (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <p className="text-blue-400 text-sm">
                        Campaign was finalized on {new Date(campaign.finalized_at).toLocaleDateString()}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmFinalize({ type: 'campaign' })}
                      disabled={finalizingCampaign || totalInstanceCount === 0}
                      className="btn bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 w-full"
                    >
                      {finalizingCampaign ? 'Finalizing Campaign...' : 'Finalize Campaign'}
                    </button>
                  )}
                </GlassCard>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile save button */}
      {hasChanges && (
        <div className="md:hidden fixed bottom-4 left-4 right-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-gray-600 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 shadow-lg"
          >
            <FiSave className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      )}

      {/* Instance form modal */}
      {instanceFormOpen && (
        <GameInstanceForm
          campaignId={campaign.id}
          instance={editingInstance}
          defaultScoringMode={settings.default_scoring_mode}
          onClose={() => { setInstanceFormOpen(false); setEditingInstance(null); }}
          onSaved={handleInstanceCreated}
        />
      )}

      {/* Confirmation modal */}
      {confirmFinalize && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-2">
              {confirmFinalize.type === 'instance' ? 'Finalize Instance' : 'Finalize Campaign'}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
              {confirmFinalize.type === 'instance'
                ? `Are you sure you want to finalize "${confirmFinalize.name}"? This will lock the leaderboard and assign rewards.`
                : 'Are you sure you want to finalize the campaign? This will compute the aggregate leaderboard and assign campaign-level rewards.'
              }
            </p>
            <p className="text-xs text-amber-400 mb-4 flex items-center gap-1">
              <FiAlertTriangle className="w-3 h-3" />
              Anonymous plays (without lead info) will be excluded from rewards.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmFinalize(null)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmFinalize.type === 'instance') {
                    handleFinalizeInstance(confirmFinalize.id);
                  } else {
                    handleFinalizeCampaign();
                  }
                }}
                className="btn bg-blue-600 hover:bg-blue-500 text-white flex-1"
              >
                Finalize
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TriviaCampaignBuilder;
