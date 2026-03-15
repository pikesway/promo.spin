import React from 'react';
import { FiTag, FiUsers, FiActivity, FiHeart, FiMail } from 'react-icons/fi';

function UsageBar({ label, used, limit, icon: Icon, color, subtitle }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon size={13} style={{ color: 'var(--text-tertiary)' }} />
          <div>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
            {subtitle && <span className="text-xs ml-1.5" style={{ color: 'var(--text-tertiary)' }}>{subtitle}</span>}
          </div>
        </div>
        <span className={`text-sm font-medium ${isAtLimit ? 'text-red-400' : isNearLimit ? 'text-amber-400' : ''}`}
          style={!isAtLimit && !isNearLimit ? { color: 'var(--text-primary)' } : {}}>
          {used} / {limit ?? '∞'}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--glass-bg)' }}>
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: isAtLimit ? '#EF4444' : isNearLimit ? '#F59E0B' : color
          }}
        />
      </div>
    </div>
  );
}

export default function ClientLimitsPanel({ client, usage, editable = false, onSave }) {
  const [editing, setEditing] = React.useState(false);
  const [form, setForm] = React.useState({
    active_brands_limit: client?.active_brands_limit ?? 5,
    active_users_limit: client?.active_users_limit ?? 10,
    active_campaigns_limit: client?.active_campaigns_limit ?? 20,
    loyalty_members_limit: client?.loyalty_members_limit ?? 1000,
    leads_limit: client?.leads_limit ?? 5000,
  });

  React.useEffect(() => {
    setForm({
      active_brands_limit: client?.active_brands_limit ?? 5,
      active_users_limit: client?.active_users_limit ?? 10,
      active_campaigns_limit: client?.active_campaigns_limit ?? 20,
      loyalty_members_limit: client?.loyalty_members_limit ?? 1000,
      leads_limit: client?.leads_limit ?? 5000,
    });
  }, [client]);

  const handleSave = async () => {
    if (onSave) {
      await onSave(form);
      setEditing(false);
    }
  };

  if (!client || !usage) return null;

  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Usage &amp; Limits</h3>
        {editable && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
          >
            Edit Limits
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditing(false); }}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--glass-bg)', color: 'var(--text-secondary)' }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="text-xs px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              Save
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Resource limits (controlled by Super Admin)</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'active_brands_limit', label: 'Active Brands', icon: FiTag },
              { key: 'active_users_limit', label: 'Active Users', icon: FiUsers },
              { key: 'active_campaigns_limit', label: 'Active Campaigns', icon: FiActivity },
            ].map(({ key, label, icon: Icon }) => (
              <div key={key}>
                <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <Icon size={12} />
                  {label}
                </label>
                <input
                  type="number"
                  min="1"
                  value={form[key]}
                  onChange={e => setForm(prev => ({ ...prev, [key]: parseInt(e.target.value) || 1 }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                />
              </div>
            ))}
          </div>
          <div className="pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>Pool limits — allocated across brands by the client admin</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'loyalty_members_limit', label: 'Total Loyalty Members', icon: FiHeart },
                { key: 'leads_limit', label: 'Total Leads', icon: FiMail },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key}>
                  <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                    <Icon size={12} />
                    {label}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={form[key]}
                    onChange={e => setForm(prev => ({ ...prev, [key]: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <UsageBar
            label="Active Brands"
            used={usage.activeBrands}
            limit={usage.activeBrandsLimit}
            icon={FiTag}
            color="var(--accent)"
          />
          <UsageBar
            label="Active Campaigns"
            used={usage.activeCampaigns}
            limit={usage.activeCampaignsLimit}
            icon={FiActivity}
            color="#10B981"
          />
          <div className="pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>Allocated across brands</p>
            <UsageBar
              label="Loyalty Members"
              used={usage.allocatedLoyaltyMembers ?? 0}
              limit={usage.loyaltyMembersLimit}
              icon={FiHeart}
              color="#F59E0B"
              subtitle="allocated"
            />
            <div className="mt-3">
              <UsageBar
                label="Leads"
                used={usage.allocatedLeads ?? 0}
                limit={usage.leadsLimit}
                icon={FiMail}
                color="#3B82F6"
                subtitle="allocated"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
