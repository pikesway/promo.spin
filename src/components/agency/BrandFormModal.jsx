import React, { useState, useEffect } from 'react';
import { FiX, FiHeart, FiMail, FiAlertTriangle } from 'react-icons/fi';
import { usePlatform } from '../../context/PlatformContext';
import { supabase } from '../../supabase/client';

export default function BrandFormModal({ brand, clientId, allocationSummary, onClose }) {
  const { createBrand, updateBrand } = usePlatform();
  const isEditing = !!brand;

  const [form, setForm] = useState({
    name: brand?.name || '',
    primary_color: brand?.primary_color || '#0EA5E9',
    secondary_color: brand?.secondary_color || '#0284C7',
    background_color: brand?.background_color || '#09090B',
    unlock_pin: brand?.unlock_pin || '',
    loyalty_members_limit: brand?.loyalty_members_limit || 500,
    leads_limit: brand?.leads_limit || 500,
    active: brand?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [enrolledCount, setEnrolledCount] = useState(0);

  useEffect(() => {
    if (isEditing && brand?.id && supabase) {
      supabase
        .from('loyalty_accounts')
        .select('*', { count: 'exact', head: true })
        .eq('brand_id', brand.id)
        .then(({ count }) => setEnrolledCount(count || 0));
    }
  }, [isEditing, brand?.id]);

  const otherBrandsLoyaltyAllocated = allocationSummary
    ? allocationSummary.loyaltyMembersLimit - allocationSummary.remainingLoyalty - (isEditing ? (brand?.loyalty_members_limit || 0) : 0)
    : 0;
  const otherBrandsLeadsAllocated = allocationSummary
    ? allocationSummary.leadsLimit - allocationSummary.remainingLeads - (isEditing ? (brand?.leads_limit || 0) : 0)
    : 0;

  const maxLoyalty = allocationSummary
    ? allocationSummary.loyaltyMembersLimit - otherBrandsLoyaltyAllocated
    : null;
  const maxLeads = allocationSummary
    ? allocationSummary.leadsLimit - otherBrandsLeadsAllocated
    : null;

  const loyaltyRemaining = maxLoyalty !== null ? maxLoyalty - form.loyalty_members_limit : null;
  const leadsRemaining = maxLeads !== null ? maxLeads - form.leads_limit : null;

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Brand name is required.');
      return;
    }
    if (isEditing && form.loyalty_members_limit < enrolledCount) {
      setError(`Cannot set loyalty members limit below ${enrolledCount} — there are already ${enrolledCount} enrolled members.`);
      return;
    }
    if (maxLoyalty !== null && form.loyalty_members_limit > maxLoyalty) {
      setError(`Loyalty members limit cannot exceed ${maxLoyalty} (the remaining allocation for this client).`);
      return;
    }
    if (maxLeads !== null && form.leads_limit > maxLeads) {
      setError(`Leads limit cannot exceed ${maxLeads} (the remaining allocation for this client).`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (isEditing) {
        const { error: e } = await updateBrand(brand.id, form);
        if (e) throw e;
      } else {
        const { error: e } = await createBrand({ ...form, client_id: clientId });
        if (e) throw e;
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save brand.');
    } finally {
      setLoading(false);
    }
  };

  const field = (key, label, type = 'text', props = {}) => (
    <div>
      <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={e => setForm(p => ({ ...p, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
        className="w-full px-3 py-2.5 rounded-lg text-sm"
        style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
        {...props}
      />
    </div>
  );

  const AllocationHint = ({ icon: Icon, value, max, color }) => {
    if (max === null) return null;
    const isOver = value > max;
    const isNear = !isOver && value > max * 0.9;
    const remaining = max - value;
    return (
      <div className="flex items-center gap-1.5 mt-1">
        <Icon size={11} style={{ color: isOver ? '#EF4444' : isNear ? '#F59E0B' : color }} />
        <span className="text-xs" style={{ color: isOver ? '#EF4444' : isNear ? '#F59E0B' : 'var(--text-tertiary)' }}>
          {isOver
            ? `Exceeds limit by ${value - max}`
            : `${remaining} of ${max} available after this brand`}
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{isEditing ? 'Edit Brand' : 'New Brand'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><FiX size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            <FiAlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-4">
          {field('name', 'Brand Name *', 'text', { placeholder: 'e.g. Main Street Location' })}

          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'primary_color', label: 'Primary' },
              { key: 'secondary_color', label: 'Secondary' },
              { key: 'background_color', label: 'Background' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-secondary)' }}>{label}</label>
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                  <input type="color" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer" />
                  <span className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>{form[key]}</span>
                </div>
              </div>
            ))}
          </div>

          {field('unlock_pin', 'Unlock PIN', 'text', { placeholder: '1234', maxLength: 8 })}

          <div className="pt-3" style={{ borderTop: '1px solid var(--border-color)' }}>
            <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>Allocate from your client pool</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <FiHeart size={11} />
                  Max Loyalty Members
                </label>
                <input
                  type="number"
                  value={form.loyalty_members_limit}
                  onChange={e => setForm(p => ({ ...p, loyalty_members_limit: parseInt(e.target.value) || 0 }))}
                  min={isEditing ? enrolledCount : 1}
                  max={maxLoyalty || undefined}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'var(--glass-bg)',
                    border: `1px solid ${form.loyalty_members_limit > (maxLoyalty || Infinity) ? '#EF4444' : 'var(--border-color)'}`,
                    color: 'var(--text-primary)'
                  }}
                />
                {isEditing && enrolledCount > 0 && (
                  <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{enrolledCount} already enrolled</p>
                )}
                <AllocationHint icon={FiHeart} value={form.loyalty_members_limit} max={maxLoyalty} color="#F59E0B" />
              </div>
              <div>
                <label className="text-xs mb-1.5 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                  <FiMail size={11} />
                  Max Leads
                </label>
                <input
                  type="number"
                  value={form.leads_limit}
                  onChange={e => setForm(p => ({ ...p, leads_limit: parseInt(e.target.value) || 0 }))}
                  min={1}
                  max={maxLeads || undefined}
                  className="w-full px-3 py-2.5 rounded-lg text-sm"
                  style={{
                    background: 'var(--glass-bg)',
                    border: `1px solid ${form.leads_limit > (maxLeads || Infinity) ? '#EF4444' : 'var(--border-color)'}`,
                    color: 'var(--text-primary)'
                  }}
                />
                <AllocationHint icon={FiMail} value={form.leads_limit} max={maxLeads} color="#3B82F6" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="brandActive" checked={form.active}
              onChange={e => setForm(p => ({ ...p, active: e.target.checked }))} className="rounded" />
            <label htmlFor="brandActive" className="text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>Active</label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm transition-colors"
            style={{ color: 'var(--text-secondary)' }}>Cancel</button>
          <button onClick={handleSave} disabled={loading} className="px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            style={{ background: 'var(--accent)', color: '#fff' }}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Brand'}
          </button>
        </div>
      </div>
    </div>
  );
}
