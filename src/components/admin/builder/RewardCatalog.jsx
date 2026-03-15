import React, { useState, useEffect } from 'react';
import { supabase } from '../../../supabase/client';
import { FiPlus, FiEdit2, FiTrash2, FiArrowUp, FiArrowDown, FiGift, FiCheck, FiX } from 'react-icons/fi';

const REWARD_TYPES = [
  { value: 'free_item', label: 'Free Item' },
  { value: 'discount', label: 'Discount' },
  { value: 'vip', label: 'VIP Experience' },
  { value: 'custom', label: 'Custom' },
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const emptyReward = { reward_name: '', threshold: '', reward_description: '', reward_type: 'custom', reward_value: '', active: true };
const emptyRule = { name: '', rule_type: 'day_of_week', day_of_week: 2, start_time: '16:00', end_time: '18:00', multiplier: 2, active: true };

const RewardTierForm = ({ initial, onSave, onCancel, existingThresholds }) => {
  const [form, setForm] = useState(initial || emptyReward);

  const handleSubmit = (e) => {
    e.preventDefault();
    const threshold = parseInt(form.threshold);
    if (!form.reward_name.trim()) return alert('Reward name is required');
    if (!threshold || threshold < 1) return alert('Threshold must be a positive number');
    if (existingThresholds.includes(threshold) && threshold !== initial?.threshold) {
      return alert(`A reward at ${threshold} stamps already exists`);
    }
    onSave({ ...form, threshold });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg border theme-border theme-bg-tertiary space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1">Reward Name *</label>
          <input
            type="text"
            value={form.reward_name}
            onChange={e => setForm(f => ({ ...f, reward_name: e.target.value }))}
            placeholder="Free Coffee"
            className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1">Stamps Required *</label>
          <input
            type="number"
            min="1"
            value={form.threshold}
            onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
            placeholder="10"
            className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1">Reward Type</label>
          <select
            value={form.reward_type}
            onChange={e => setForm(f => ({ ...f, reward_type: e.target.value }))}
            className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary"
          >
            {REWARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1">Value (optional)</label>
          <input
            type="text"
            value={form.reward_value || ''}
            onChange={e => setForm(f => ({ ...f, reward_value: e.target.value }))}
            placeholder="e.g. 10% or $5"
            className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary placeholder-gray-500"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium theme-text-secondary mb-1">Description</label>
        <textarea
          value={form.reward_description || ''}
          onChange={e => setForm(f => ({ ...f, reward_description: e.target.value }))}
          placeholder="Describe the reward..."
          rows={2}
          className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary placeholder-gray-500 resize-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="reward-active"
          checked={form.active}
          onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="reward-active" className="text-sm theme-text-secondary">Active</label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm theme-text-tertiary hover:theme-text-primary border theme-border rounded-lg">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm text-white rounded-lg font-medium" style={{ background: 'var(--brand-primary)' }}>
          Save Reward
        </button>
      </div>
    </form>
  );
};

const BonusRuleForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial || emptyRule);

  const getFriendlyLabel = () => {
    const mult = parseFloat(form.multiplier) || 1;
    const multLabel = mult === 2 ? 'Double Stamps' : `${mult}x Stamps`;
    if (form.rule_type === 'day_of_week') {
      return `${multLabel} on ${DAY_NAMES[form.day_of_week] || 'Selected Day'}`;
    }
    if (form.rule_type === 'time_window') {
      const dayPart = form.day_of_week != null ? ` on ${DAY_NAMES[form.day_of_week]}` : '';
      return `${multLabel}${dayPart} ${form.start_time}–${form.end_time}`;
    }
    return `${multLabel} (Always Active)`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return alert('Rule name is required');
    const mult = parseFloat(form.multiplier);
    if (!mult || mult <= 0) return alert('Multiplier must be greater than 0');
    onSave({ ...form, multiplier: mult });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg border theme-border theme-bg-tertiary space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1">Rule Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Tuesday Double Stamps"
            className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary placeholder-gray-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1">Multiplier</label>
          <input
            type="number"
            min="1.1"
            max="10"
            step="0.25"
            value={form.multiplier}
            onChange={e => setForm(f => ({ ...f, multiplier: e.target.value }))}
            className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium theme-text-secondary mb-1">Rule Type</label>
          <select
            value={form.rule_type}
            onChange={e => setForm(f => ({ ...f, rule_type: e.target.value }))}
            className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary"
          >
            <option value="day_of_week">Day of Week</option>
            <option value="time_window">Time Window</option>
            <option value="custom_simple">Always Active</option>
          </select>
        </div>
        {(form.rule_type === 'day_of_week' || form.rule_type === 'time_window') && (
          <div>
            <label className="block text-xs font-medium theme-text-secondary mb-1">Day of Week</label>
            <select
              value={form.day_of_week ?? 2}
              onChange={e => setForm(f => ({ ...f, day_of_week: parseInt(e.target.value) }))}
              className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary"
            >
              {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
        )}
        {form.rule_type === 'time_window' && (
          <>
            <div>
              <label className="block text-xs font-medium theme-text-secondary mb-1">Start Time</label>
              <input
                type="time"
                value={form.start_time || '16:00'}
                onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium theme-text-secondary mb-1">End Time</label>
              <input
                type="time"
                value={form.end_time || '18:00'}
                onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 text-sm theme-text-primary"
              />
            </div>
          </>
        )}
      </div>
      <div className="p-3 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
        <p className="text-xs theme-text-tertiary mb-1">Preview label:</p>
        <p className="text-sm font-medium theme-text-primary">{getFriendlyLabel()}</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rule-active"
          checked={form.active}
          onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
          className="rounded"
        />
        <label htmlFor="rule-active" className="text-sm theme-text-secondary">Active</label>
      </div>
      <div className="flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm theme-text-tertiary hover:theme-text-primary border theme-border rounded-lg">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm text-white rounded-lg font-medium" style={{ background: 'var(--brand-primary)' }}>
          Save Rule
        </button>
      </div>
    </form>
  );
};

const RewardCatalog = ({ campaignId, canEdit }) => {
  const [rewards, setRewards] = useState([]);
  const [bonusRules, setBonusRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingReward, setEditingReward] = useState(null);
  const [addingReward, setAddingReward] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [addingRule, setAddingRule] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = async () => {
    const [rewardsRes, rulesRes] = await Promise.all([
      supabase.from('campaign_rewards').select('*').eq('campaign_id', campaignId).order('sort_order').order('threshold'),
      supabase.from('campaign_bonus_rules').select('*').eq('campaign_id', campaignId).order('created_at'),
    ]);
    if (rewardsRes.data) setRewards(rewardsRes.data);
    if (rulesRes.data) setBonusRules(rulesRes.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [campaignId]);

  const handleSaveReward = async (formData) => {
    if (editingReward?.id) {
      await supabase.from('campaign_rewards').update({
        reward_name: formData.reward_name,
        threshold: formData.threshold,
        reward_description: formData.reward_description,
        reward_type: formData.reward_type,
        reward_value: formData.reward_value || null,
        active: formData.active,
      }).eq('id', editingReward.id);
    } else {
      const maxOrder = rewards.length > 0 ? Math.max(...rewards.map(r => r.sort_order || 1)) : 0;
      await supabase.from('campaign_rewards').insert({
        campaign_id: campaignId,
        reward_name: formData.reward_name,
        threshold: formData.threshold,
        reward_description: formData.reward_description,
        reward_type: formData.reward_type,
        reward_value: formData.reward_value || null,
        active: formData.active,
        sort_order: maxOrder + 1,
      });
    }
    setEditingReward(null);
    setAddingReward(false);
    fetchData();
  };

  const handleDeleteReward = async (id) => {
    await supabase.from('campaign_rewards').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchData();
  };

  const handleMoveReward = async (index, direction) => {
    const newList = [...rewards];
    const swapIdx = index + direction;
    if (swapIdx < 0 || swapIdx >= newList.length) return;
    const aOrder = newList[index].sort_order;
    const bOrder = newList[swapIdx].sort_order;
    await Promise.all([
      supabase.from('campaign_rewards').update({ sort_order: bOrder }).eq('id', newList[index].id),
      supabase.from('campaign_rewards').update({ sort_order: aOrder }).eq('id', newList[swapIdx].id),
    ]);
    fetchData();
  };

  const handleToggleReward = async (reward) => {
    await supabase.from('campaign_rewards').update({ active: !reward.active }).eq('id', reward.id);
    fetchData();
  };

  const handleSaveRule = async (formData) => {
    const payload = {
      campaign_id: campaignId,
      name: formData.name,
      rule_type: formData.rule_type,
      day_of_week: (formData.rule_type === 'day_of_week' || formData.rule_type === 'time_window') ? formData.day_of_week : null,
      start_time: formData.rule_type === 'time_window' ? formData.start_time : null,
      end_time: formData.rule_type === 'time_window' ? formData.end_time : null,
      multiplier: formData.multiplier,
      active: formData.active,
    };
    if (editingRule?.id) {
      await supabase.from('campaign_bonus_rules').update(payload).eq('id', editingRule.id);
    } else {
      await supabase.from('campaign_bonus_rules').insert(payload);
    }
    setEditingRule(null);
    setAddingRule(false);
    fetchData();
  };

  const handleDeleteRule = async (id) => {
    await supabase.from('campaign_bonus_rules').delete().eq('id', id);
    setDeleteConfirm(null);
    fetchData();
  };

  const handleToggleRule = async (rule) => {
    await supabase.from('campaign_bonus_rules').update({ active: !rule.active }).eq('id', rule.id);
    fetchData();
  };

  const getRuleLabel = (rule) => {
    const mult = parseFloat(rule.multiplier) || 1;
    const multLabel = mult === 2 ? 'Double Stamps' : `${mult}x Stamps`;
    if (rule.rule_type === 'day_of_week') return `${multLabel} on ${DAY_NAMES[rule.day_of_week] || '?'}`;
    if (rule.rule_type === 'time_window') {
      const dayPart = rule.day_of_week != null ? ` on ${DAY_NAMES[rule.day_of_week]}` : '';
      const t1 = rule.start_time?.slice(0, 5) || '';
      const t2 = rule.end_time?.slice(0, 5) || '';
      return `${multLabel}${dayPart} ${t1}–${t2}`;
    }
    return `${multLabel} (Always Active)`;
  };

  const typeColors = { free_item: '#10B981', discount: '#F59E0B', vip: '#8B5CF6', birthday: '#EC4899', custom: '#6B7280' };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--text-primary)' }} />
      </div>
    );
  }

  const existingThresholds = rewards.map(r => r.threshold);

  return (
    <div className="space-y-8">
      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold theme-text-primary">Reward Tiers</h2>
            <p className="text-sm theme-text-tertiary mt-1">Create multiple reward milestones for your members</p>
          </div>
          {canEdit && !addingReward && !editingReward && (
            <button
              onClick={() => setAddingReward(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium"
              style={{ background: 'var(--brand-primary)' }}
            >
              <FiPlus className="w-4 h-4" />
              Add Tier
            </button>
          )}
        </div>

        <div className="space-y-3">
          {rewards.length === 0 && !addingReward && (
            <div className="text-center py-8 theme-text-tertiary">
              <FiGift className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No reward tiers yet. Add your first tier above.</p>
            </div>
          )}

          {rewards.map((reward, index) => {
            if (editingReward?.id === reward.id) {
              return (
                <RewardTierForm
                  key={reward.id}
                  initial={editingReward}
                  onSave={handleSaveReward}
                  onCancel={() => setEditingReward(null)}
                  existingThresholds={existingThresholds.filter(t => t !== reward.threshold)}
                />
              );
            }
            return (
              <div key={reward.id} className="flex items-start gap-3 p-4 rounded-lg border theme-border" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex flex-col gap-1 pt-1">
                  {canEdit && (
                    <>
                      <button onClick={() => handleMoveReward(index, -1)} disabled={index === 0} className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30">
                        <FiArrowUp className="w-3 h-3 theme-text-tertiary" />
                      </button>
                      <button onClick={() => handleMoveReward(index, 1)} disabled={index === rewards.length - 1} className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30">
                        <FiArrowDown className="w-3 h-3 theme-text-tertiary" />
                      </button>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: typeColors[reward.reward_type] || '#6B7280' }}>
                      {reward.threshold} stamps
                    </span>
                    <span className="font-medium theme-text-primary text-sm">{reward.reward_name}</span>
                    {reward.reward_value && <span className="text-xs theme-text-tertiary">· {reward.reward_value}</span>}
                  </div>
                  {reward.reward_description && (
                    <p className="text-xs theme-text-tertiary mt-1 truncate">{reward.reward_description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleReward(reward)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${reward.active ? 'bg-green-500' : 'bg-gray-600'}`}
                    disabled={!canEdit}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${reward.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  {canEdit && (
                    <>
                      <button onClick={() => setEditingReward(reward)} className="p-1.5 hover:bg-white/10 rounded theme-text-tertiary hover:theme-text-primary">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      {deleteConfirm === reward.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteReward(reward.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded">
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-white/10 rounded theme-text-tertiary">
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(reward.id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {addingReward && (
            <RewardTierForm
              initial={null}
              onSave={handleSaveReward}
              onCancel={() => setAddingReward(false)}
              existingThresholds={existingThresholds}
            />
          )}
        </div>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold theme-text-primary">Bonus Stamp Rules</h2>
            <p className="text-sm theme-text-tertiary mt-1">Award extra stamps during special days or hours</p>
          </div>
          {canEdit && !addingRule && !editingRule && (
            <button
              onClick={() => setAddingRule(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded-lg font-medium"
              style={{ background: 'var(--brand-primary)' }}
            >
              <FiPlus className="w-4 h-4" />
              Add Rule
            </button>
          )}
        </div>

        <div className="space-y-3">
          {bonusRules.length === 0 && !addingRule && (
            <div className="text-center py-8 theme-text-tertiary">
              <p className="text-sm">No bonus rules yet. Add a rule to award extra stamps.</p>
            </div>
          )}

          {bonusRules.map((rule) => {
            if (editingRule?.id === rule.id) {
              return (
                <BonusRuleForm
                  key={rule.id}
                  initial={editingRule}
                  onSave={handleSaveRule}
                  onCancel={() => setEditingRule(null)}
                />
              );
            }
            return (
              <div key={rule.id} className="flex items-center gap-3 p-4 rounded-lg border theme-border" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium theme-text-primary text-sm">{rule.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--bg-primary)', color: 'var(--text-tertiary)' }}>
                      {parseFloat(rule.multiplier)}x
                    </span>
                  </div>
                  <p className="text-xs theme-text-tertiary mt-0.5">{getRuleLabel(rule)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleToggleRule(rule)}
                    className={`w-8 h-4 rounded-full transition-colors relative ${rule.active ? 'bg-green-500' : 'bg-gray-600'}`}
                    disabled={!canEdit}
                  >
                    <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${rule.active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  {canEdit && (
                    <>
                      <button onClick={() => setEditingRule(rule)} className="p-1.5 hover:bg-white/10 rounded theme-text-tertiary hover:theme-text-primary">
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      {deleteConfirm === rule.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleDeleteRule(rule.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded">
                            <FiCheck className="w-4 h-4" />
                          </button>
                          <button onClick={() => setDeleteConfirm(null)} className="p-1.5 hover:bg-white/10 rounded theme-text-tertiary">
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setDeleteConfirm(rule.id)} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {addingRule && (
            <BonusRuleForm
              initial={null}
              onSave={handleSaveRule}
              onCancel={() => setAddingRule(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default RewardCatalog;
