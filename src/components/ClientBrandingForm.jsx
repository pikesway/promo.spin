import { useState } from 'react';
import LogoUploader from './LogoUploader';
import BrandColorPicker from './BrandColorPicker';
import StatusSelector from './StatusSelector';
import { getDefaultColors, getBrandingPreview } from '../utils/brandingHelpers';

const ClientBrandingForm = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: client?.name || '',
    email: client?.email || '',
    logo_type: client?.logo_type || 'url',
    logo_url: client?.logo_url || '',
    logo_file: null,
    primary_color: client?.primary_color || getDefaultColors().primary,
    secondary_color: client?.secondary_color || getDefaultColors().secondary,
    background_color: client?.background_color || getDefaultColors().background,
    status: client?.status || 'prospect',
    status_notes: client?.status_notes || '',
    unlock_pin: client?.unlock_pin || ''
  });
  const [unlockPinError, setUnlockPinError] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleLogoChange = (type, value) => {
    if (type === 'upload') {
      setFormData({
        ...formData,
        logo_type: 'upload',
        logo_file: value
      });
    } else {
      setFormData({
        ...formData,
        logo_type: 'url',
        logo_url: value,
        logo_file: null
      });
    }
  };

  const handleStatusChange = (status, notes) => {
    setFormData({
      ...formData,
      status,
      status_notes: notes
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Client name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Client email is required');
      return;
    }

    if (formData.unlock_pin && !/^\d{4,6}$/.test(formData.unlock_pin)) {
      setError('Unlock PIN must be 4-6 digits');
      return;
    }

    setIsSaving(true);

    try {
      await onSave(formData);
    } catch (err) {
      setError(err.message || 'Failed to save client');
      setIsSaving(false);
    }
  };

  const brandingPreview = getBrandingPreview({
    primary: formData.primary_color,
    secondary: formData.secondary_color,
    background: formData.background_color
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Client Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Acme Corporation"
            className="input"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Contact Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@acme.com"
            className="input"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Client Status
        </label>
        <StatusSelector
          currentStatus={formData.status}
          onStatusChange={handleStatusChange}
          showNotes={true}
        />
        {formData.status_notes && (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Notes: {formData.status_notes}
          </p>
        )}
      </div>

      <div className="pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
        <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Client Logo</h3>
        <LogoUploader
          logoType={formData.logo_type}
          logoUrl={formData.logo_url}
          onLogoChange={handleLogoChange}
          clientName={formData.name}
        />
      </div>

      <div className="pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Brand Colors</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          These colors will be used as defaults in all campaigns for this client
        </p>

        <div className="space-y-4">
          <BrandColorPicker
            label="Primary Color"
            description="Used for main buttons and primary elements"
            value={formData.primary_color}
            onChange={(color) => setFormData({ ...formData, primary_color: color })}
          />

          <BrandColorPicker
            label="Secondary Color"
            description="Used for accents and secondary elements"
            value={formData.secondary_color}
            onChange={(color) => setFormData({ ...formData, secondary_color: color })}
          />

          <BrandColorPicker
            label="Background Color"
            description="Optional background color for campaigns"
            value={formData.background_color}
            onChange={(color) => setFormData({ ...formData, background_color: color })}
          />
        </div>

        <div className="mt-5 p-4 rounded-lg" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
          <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Brand Preview</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              className="h-16 sm:h-20 flex-1 rounded-lg"
              style={{ background: brandingPreview.gradient }}
            />
            <div className="flex sm:flex-col gap-2 justify-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-8 rounded"
                  style={{ backgroundColor: formData.primary_color, border: '1px solid var(--border-color)' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Primary</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 sm:w-12 sm:h-8 rounded"
                  style={{ backgroundColor: formData.secondary_color, border: '1px solid var(--border-color)' }}
                />
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Secondary</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-5" style={{ borderTop: '1px solid var(--border-color)' }}>
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Loyalty Program Settings</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Configure settings that apply to all loyalty programs for this client
        </p>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Unlock PIN
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={6}
            value={formData.unlock_pin}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setFormData({ ...formData, unlock_pin: value });
              setUnlockPinError('');
            }}
            placeholder="Enter 4-6 digit PIN"
            className="input w-full max-w-xs tracking-widest text-center font-mono"
            style={unlockPinError ? { borderColor: 'var(--error)' } : {}}
          />
          {unlockPinError && (
            <p className="text-sm mt-1" style={{ color: 'var(--error)' }}>{unlockPinError}</p>
          )}
          <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
            This PIN is used by staff to unlock customer accounts that have been locked due to failed validation attempts.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg" style={{ background: 'var(--error-bg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4" style={{ borderTop: '1px solid var(--border-color)' }}>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="btn btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="btn btn-primary flex-1"
        >
          {isSaving ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </form>
  );
};

export default ClientBrandingForm;