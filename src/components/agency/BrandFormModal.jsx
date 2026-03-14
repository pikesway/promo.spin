import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';
import { usePlatform } from '../../context/PlatformContext';

export default function BrandFormModal({ brand, clientId, onClose }) {
  const { createBrand, updateBrand } = usePlatform();
  const isEditing = !!brand;

  const [form, setForm] = useState({
    name: brand?.name || '',
    primary_color: brand?.primary_color || '#0EA5E9',
    secondary_color: brand?.secondary_color || '#0284C7',
    background_color: brand?.background_color || '#09090B',
    unlock_pin: brand?.unlock_pin || '',
    loyalty_members_limit: brand?.loyalty_members_limit || 500,
    active: brand?.active ?? true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Brand name is required.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{isEditing ? 'Edit Brand' : 'New Brand'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-secondary)' }}><FiX size={18} /></button>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>
            {error}
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
          {field('loyalty_members_limit', 'Max Loyalty Members', 'number', { min: 1 })}

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
