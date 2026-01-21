import { useState, useEffect } from 'react';
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
    status_notes: client?.status_notes || ''
  });

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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Client Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Acme Corporation"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Contact Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contact@acme.com"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-white mb-2">
          Client Status
        </label>
        <StatusSelector
          currentStatus={formData.status}
          onStatusChange={handleStatusChange}
          showNotes={true}
        />
        {formData.status_notes && (
          <p className="mt-2 text-sm text-gray-400">
            Notes: {formData.status_notes}
          </p>
        )}
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-semibold text-white mb-4">Client Logo</h3>
        <LogoUploader
          logoType={formData.logo_type}
          logoUrl={formData.logo_url}
          onLogoChange={handleLogoChange}
          clientName={formData.name}
        />
      </div>

      <div className="border-t border-white/10 pt-6">
        <h3 className="text-lg font-semibold text-white mb-2">Brand Colors</h3>
        <p className="text-sm text-gray-400 mb-4">
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

        <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
          <p className="text-sm font-medium text-white mb-3">Brand Preview</p>
          <div className="flex gap-3">
            <div
              className="h-20 flex-1 rounded-lg"
              style={{ background: brandingPreview.gradient }}
            />
            <div className="space-y-2">
              <div className="flex gap-2">
                <div
                  className="w-16 h-8 rounded border border-white/20"
                  style={{ backgroundColor: formData.primary_color }}
                />
                <span className="text-xs text-gray-400">Primary</span>
              </div>
              <div className="flex gap-2">
                <div
                  className="w-16 h-8 rounded border border-white/20"
                  style={{ backgroundColor: formData.secondary_color }}
                />
                <span className="text-xs text-gray-400">Secondary</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="flex gap-3 pt-4 border-t border-white/10">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : client ? 'Update Client' : 'Create Client'}
        </button>
      </div>
    </form>
  );
};

export default ClientBrandingForm;
