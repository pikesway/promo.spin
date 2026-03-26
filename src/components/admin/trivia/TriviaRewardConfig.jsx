import React, { useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiX } from 'react-icons/fi';
import { usePlatform } from '../../../context/PlatformContext';
import GlassCard from '../../common/GlassCard';

const TriviaRewardConfig = ({ campaignId, instances, leaderboardScope, rewards, onUpdate }) => {
  const { createTriviaReward, updateTriviaReward, deleteTriviaReward } = usePlatform();
  const [editingReward, setEditingReward] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formScope, setFormScope] = useState('campaign');
  const [formInstanceId, setFormInstanceId] = useState(null);

  const showCampaignRewards = leaderboardScope === 'campaign' || leaderboardScope === 'both';
  const showInstanceRewards = leaderboardScope === 'instance' || leaderboardScope === 'both';

  const campaignRewards = rewards.filter(r => r.scope === 'campaign');
  const instanceRewards = rewards.filter(r => r.scope === 'instance');

  const handleAddReward = (scope, instanceId = null) => {
    setEditingReward(null);
    setFormScope(scope);
    setFormInstanceId(instanceId);
    setIsFormOpen(true);
  };

  const handleEditReward = (reward) => {
    setEditingReward(reward);
    setFormScope(reward.scope);
    setFormInstanceId(reward.instance_id);
    setIsFormOpen(true);
  };

  const handleDeleteReward = async (rewardId) => {
    if (!confirm('Are you sure you want to delete this reward tier?')) return;
    await deleteTriviaReward(rewardId);
    onUpdate();
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingReward(null);
  };

  const handleFormSave = async (data) => {
    if (editingReward) {
      await updateTriviaReward(editingReward.id, data);
    } else {
      await createTriviaReward({
        ...data,
        campaign_id: campaignId,
        scope: formScope,
        instance_id: formScope === 'instance' ? formInstanceId : null
      });
    }
    onUpdate();
    handleFormClose();
  };

  const getInstanceRewards = (instanceId) => {
    return instanceRewards.filter(r => r.instance_id === instanceId);
  };

  return (
    <div className="space-y-6">
      {showCampaignRewards && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Campaign-Level Rewards</h2>
              <p className="text-xs text-gray-500">Awarded based on aggregate leaderboard across all instances</p>
            </div>
            <button
              onClick={() => handleAddReward('campaign')}
              className="btn btn-sm bg-teal-600 hover:bg-teal-500 text-white flex items-center gap-1"
            >
              <FiPlus className="w-4 h-4" />
              Add Reward
            </button>
          </div>

          {campaignRewards.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">No campaign rewards configured</p>
          ) : (
            <div className="space-y-2">
              {campaignRewards.map(reward => (
                <RewardTierRow
                  key={reward.id}
                  reward={reward}
                  onEdit={() => handleEditReward(reward)}
                  onDelete={() => handleDeleteReward(reward.id)}
                />
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {showInstanceRewards && (
        <GlassCard>
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Instance-Level Rewards</h2>
            <p className="text-xs text-gray-500">Awarded per game instance leaderboard</p>
          </div>

          {instances.length === 0 ? (
            <p className="text-gray-500 text-sm py-4 text-center">Create game instances first to configure rewards</p>
          ) : (
            <div className="space-y-4">
              {instances.map(instance => {
                const instRewards = getInstanceRewards(instance.id);
                return (
                  <div key={instance.id} className="p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm">{instance.name}</h3>
                      <button
                        onClick={() => handleAddReward('instance', instance.id)}
                        className="btn btn-xs bg-zinc-700 hover:bg-zinc-600 text-white flex items-center gap-1"
                      >
                        <FiPlus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                    {instRewards.length === 0 ? (
                      <p className="text-xs text-gray-500">No rewards configured for this instance</p>
                    ) : (
                      <div className="space-y-1">
                        {instRewards.map(reward => (
                          <RewardTierRow
                            key={reward.id}
                            reward={reward}
                            compact
                            onEdit={() => handleEditReward(reward)}
                            onDelete={() => handleDeleteReward(reward.id)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      )}

      {isFormOpen && (
        <RewardFormModal
          reward={editingReward}
          scope={formScope}
          onClose={handleFormClose}
          onSave={handleFormSave}
        />
      )}
    </div>
  );
};

const RewardTierRow = ({ reward, compact, onEdit, onDelete }) => {
  const rankDisplay = reward.rank_min === reward.rank_max
    ? `#${reward.rank_min}`
    : `#${reward.rank_min}-${reward.rank_max}`;

  return (
    <div className={`flex items-center justify-between ${compact ? 'py-2 px-2 bg-zinc-700/30 rounded' : 'py-3 px-3 bg-zinc-800/50 rounded-lg'}`}>
      <div className="flex items-center gap-3">
        <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-teal-400 min-w-[60px]`}>
          {rankDisplay}
        </span>
        <div>
          <p className={`${compact ? 'text-xs' : 'text-sm'} font-medium`}>{reward.reward_name}</p>
          {reward.reward_value && (
            <p className="text-xs text-gray-500">{reward.reward_value}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className={`text-xs px-2 py-0.5 rounded ${
          reward.fulfillment_method === 'platform'
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-gray-500/20 text-gray-400'
        }`}>
          {reward.fulfillment_method}
        </span>
        <button
          onClick={onEdit}
          className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-white"
        >
          <FiEdit2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 hover:bg-white/5 rounded text-gray-400 hover:text-red-400"
        >
          <FiTrash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

const RewardFormModal = ({ reward, scope, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    rank_min: reward?.rank_min || 1,
    rank_max: reward?.rank_max || 1,
    reward_name: reward?.reward_name || '',
    reward_description: reward?.reward_description || '',
    reward_value: reward?.reward_value || '',
    fulfillment_method: reward?.fulfillment_method || 'manual',
    quantity_limit: reward?.quantity_limit || '',
    active: reward?.active ?? true
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reward_name.trim()) {
      setError('Reward name is required');
      return;
    }
    if (formData.rank_min > formData.rank_max) {
      setError('Rank min cannot be greater than rank max');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        rank_min: parseInt(formData.rank_min),
        rank_max: parseInt(formData.rank_max),
        reward_name: formData.reward_name.trim(),
        reward_description: formData.reward_description.trim() || null,
        reward_value: formData.reward_value.trim() || null,
        fulfillment_method: formData.fulfillment_method,
        quantity_limit: formData.quantity_limit ? parseInt(formData.quantity_limit) : null,
        active: formData.active
      });
    } catch (err) {
      setError(err.message || 'Failed to save reward');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">
            {reward ? 'Edit Reward Tier' : 'Add Reward Tier'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div className="p-2 bg-zinc-700/30 rounded-lg text-center text-xs text-gray-400">
              Scope: <span className="font-medium text-white capitalize">{scope}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rank From</label>
                <input
                  type="number"
                  className="input w-full"
                  value={formData.rank_min}
                  onChange={(e) => handleChange('rank_min', e.target.value)}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rank To</label>
                <input
                  type="number"
                  className="input w-full"
                  value={formData.rank_max}
                  onChange={(e) => handleChange('rank_max', e.target.value)}
                  min="1"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 -mt-2">
              {formData.rank_min === formData.rank_max
                ? `Reward for rank #${formData.rank_min}`
                : `Reward for ranks #${formData.rank_min} through #${formData.rank_max}`}
            </p>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Reward Name *</label>
              <input
                type="text"
                className="input w-full"
                value={formData.reward_name}
                onChange={(e) => handleChange('reward_name', e.target.value)}
                placeholder="$50 Gift Card"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                className="input w-full"
                rows={2}
                value={formData.reward_description}
                onChange={(e) => handleChange('reward_description', e.target.value)}
                placeholder="Additional details about the reward..."
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Value (display)</label>
              <input
                type="text"
                className="input w-full"
                value={formData.reward_value}
                onChange={(e) => handleChange('reward_value', e.target.value)}
                placeholder="$50"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Fulfillment Method</label>
              <select
                className="select w-full"
                value={formData.fulfillment_method}
                onChange={(e) => handleChange('fulfillment_method', e.target.value)}
              >
                <option value="manual">Manual - Admin marks as issued</option>
                <option value="platform">Platform - Creates redemption code</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Quantity Limit (optional)</label>
              <input
                type="number"
                className="input w-full"
                value={formData.quantity_limit}
                onChange={(e) => handleChange('quantity_limit', e.target.value)}
                placeholder="Leave empty for no limit"
                min="1"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-sm">Active</span>
              <button
                type="button"
                onClick={() => handleChange('active', !formData.active)}
                className={`w-11 h-6 rounded-full transition-colors relative ${formData.active ? 'bg-teal-500' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow ${formData.active ? 'left-6' : 'left-1'}`} />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </form>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <button type="button" onClick={onClose} className="btn btn-secondary flex-1">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn bg-teal-600 hover:bg-teal-500 text-white flex-1 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TriviaRewardConfig;
