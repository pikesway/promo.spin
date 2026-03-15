import React, { useState, useEffect } from 'react';
import { FiX, FiShield } from 'react-icons/fi';
import { supabase } from '../../supabase/client';
import { usePlatform } from '../../context/PlatformContext';

const PERMISSION_LABELS = {
  is_brand_manager: 'Brand Manager',
  can_view_stats: 'View Stats',
  can_add_campaign: 'Add Campaigns',
  can_edit_campaign: 'Edit Campaigns',
  can_activate_pause_campaign: 'Activate / Pause',
  can_delete_campaign: 'Delete Campaigns',
};

export default function UserBrandPermissionsModal({ user, clientId, onClose }) {
  const { brands } = usePlatform();
  const clientBrands = brands.filter(b => b.client_id === clientId);

  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('user_brand_permissions')
        .select('*')
        .eq('user_id', user.id);

      const map = {};
      (data || []).forEach(p => { map[p.brand_id] = p; });
      setPermissions(map);
      setLoading(false);
    };
    load();
  }, [user.id]);

  const getPermission = (brandId) => permissions[brandId] || {
    active: false,
    is_brand_manager: false,
    can_view_stats: false,
    can_add_campaign: true,
    can_edit_campaign: true,
    can_activate_pause_campaign: true,
    can_delete_campaign: false,
  };

  const toggleBrandActive = (brandId) => {
    const current = getPermission(brandId);
    setPermissions(prev => ({
      ...prev,
      [brandId]: { ...current, active: !current.active }
    }));
  };

  const togglePermission = (brandId, key) => {
    const current = getPermission(brandId);
    setPermissions(prev => ({
      ...prev,
      [brandId]: { ...current, [key]: !current[key] }
    }));
  };

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    try {
      for (const brand of clientBrands) {
        const perm = permissions[brand.id];
        if (!perm) continue;

        const existing = await supabase
          .from('user_brand_permissions')
          .select('id')
          .eq('user_id', user.id)
          .eq('brand_id', brand.id)
          .maybeSingle();

        const payload = {
          user_id: user.id,
          brand_id: brand.id,
          active: perm.active,
          is_brand_manager: perm.is_brand_manager,
          can_view_stats: perm.can_view_stats ?? false,
          can_add_campaign: perm.can_add_campaign,
          can_edit_campaign: perm.can_edit_campaign,
          can_activate_pause_campaign: perm.can_activate_pause_campaign,
          can_delete_campaign: perm.can_delete_campaign,
        };

        if (existing.data?.id) {
          await supabase.from('user_brand_permissions').update(payload).eq('id', existing.data.id);
        } else if (perm.active) {
          await supabase.from('user_brand_permissions').insert(payload);
        }
      }
      onClose();
    } catch (err) {
      console.error('Failed to save permissions:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-2xl rounded-2xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>Brand Permissions</h2>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><FiX size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {loading ? (
            <p style={{ color: 'var(--text-tertiary)' }}>Loading...</p>
          ) : clientBrands.length === 0 ? (
            <p style={{ color: 'var(--text-tertiary)' }}>No brands for this client yet.</p>
          ) : (
            <div className="space-y-4">
              {clientBrands.map(brand => {
                const perm = getPermission(brand.id);
                return (
                  <div key={brand.id} className="rounded-xl p-4" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{ background: `${brand.primary_color}20`, color: brand.primary_color }}>
                          {brand.name.charAt(0)}
                        </div>
                        <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{brand.name}</p>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Access</span>
                        <div
                          onClick={() => toggleBrandActive(brand.id)}
                          className="w-10 h-5 rounded-full relative cursor-pointer transition-colors"
                          style={{ background: perm.active ? 'var(--accent)' : 'var(--border-color)' }}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all"
                            style={{ left: perm.active ? '22px' : '3px' }} />
                        </div>
                      </label>
                    </div>

                    {perm.active && (
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <div
                              onClick={() => togglePermission(brand.id, key)}
                              className="w-4 h-4 rounded flex items-center justify-center cursor-pointer transition-colors flex-shrink-0"
                              style={{ background: perm[key] ? 'var(--accent)' : 'var(--glass-bg)', border: `1px solid ${perm[key] ? 'var(--accent)' : 'var(--border-color)'}` }}
                            >
                              {perm[key] && <div className="w-2 h-2 rounded-sm bg-white" />}
                            </div>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-5 flex justify-end gap-3" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </div>
    </div>
  );
}
