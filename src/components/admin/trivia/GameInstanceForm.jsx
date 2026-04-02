import React, { useState, useEffect } from 'react';
import { FiX, FiAlertCircle } from 'react-icons/fi';
import { usePlatform } from '../../../context/PlatformContext';

const GameInstanceForm = ({ campaignId, clientId, brandId, instance, defaultScoringMode, onClose, onSaved }) => {
  const { createGameInstance, updateGameInstance, fetchTriviaShells } = usePlatform();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesSource, setTemplatesSource] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    template_version: '',
    sequence_number: null,
    start_at: '',
    end_at: '',
    scoring_mode: ''
  });

  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      const result = await fetchTriviaShells();
      setTemplates(result.data || []);
      setTemplatesSource(result.source);
      setTemplatesLoading(false);
    };
    loadTemplates();
  }, [fetchTriviaShells]);

  useEffect(() => {
    if (instance) {
      setFormData({
        name: instance.name || '',
        template_id: instance.template_id || '',
        template_version: instance.template_version || '',
        sequence_number: instance.sequence_number || null,
        start_at: instance.start_at ? instance.start_at.slice(0, 16) : '',
        end_at: instance.end_at ? instance.end_at.slice(0, 16) : '',
        scoring_mode: instance.scoring_mode || ''
      });
    }
  }, [instance]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const payload = {
        campaign_id: campaignId,
        client_id: clientId,
        brand_id: brandId || null,
        name: formData.name.trim(),
        template_id: formData.template_id || null,
        template_version: formData.template_version || null,
        sequence_number: formData.sequence_number ? parseInt(formData.sequence_number) : null,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        scoring_mode: formData.scoring_mode || null,
        launch_url: formData.launch_url || null,
        external_instance_ref: formData.external_instance_ref || null
      };

      if (instance) {
        const { error: updateError } = await updateGameInstance(instance.id, payload);
        if (updateError) throw updateError;
      } else {
        const { error: createError } = await createGameInstance(payload);
        if (createError) throw createError;
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Failed to save instance');
    }

    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">
            {instance ? 'Edit Game Instance' : 'New Game Instance'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name *</label>
              <input
                type="text"
                className="input w-full"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Week 1 Trivia"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Trivia Template
                {templatesSource === 'fallback' && (
                  <span className="ml-2 text-xs text-amber-400">
                    (Using fallback templates)
                  </span>
                )}
              </label>
              <select
                className="select w-full"
                value={formData.template_id}
                onChange={(e) => handleChange('template_id', e.target.value)}
                disabled={templatesLoading}
              >
                <option value="">
                  {templatesLoading ? 'Loading templates...' : 'Select a trivia template...'}
                </option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              {templatesSource === 'fallback' && (
                <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-400 flex items-start gap-2">
                  <FiAlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>
                    Unable to connect to Trivia API. Using fallback templates.
                    Configure VITE_TRIVIA_API_URL in your environment to load actual templates.
                  </span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Select a pre-configured trivia game template from the Trivia platform
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Sequence Number</label>
              <input
                type="number"
                className="input w-full"
                value={formData.sequence_number || ''}
                onChange={(e) => handleChange('sequence_number', e.target.value)}
                placeholder="1"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Optional ordering for display</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start Date/Time</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={formData.start_at}
                  onChange={(e) => handleChange('start_at', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">End Date/Time</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={formData.end_at}
                  onChange={(e) => handleChange('end_at', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Scoring Mode Override</label>
              <select
                className="select w-full"
                value={formData.scoring_mode}
                onChange={(e) => handleChange('scoring_mode', e.target.value)}
              >
                <option value="">Use campaign default ({defaultScoringMode?.replace(/_/g, ' ')})</option>
                <option value="accuracy_only">Accuracy Only</option>
                <option value="accuracy_speed_weighted">Accuracy + Speed Weighted</option>
                <option value="accuracy_then_fastest_time">Accuracy, then Speed Tiebreaker</option>
              </select>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </form>

        <div className="p-4 border-t border-white/10 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="btn bg-teal-600 hover:bg-teal-500 text-white flex-1 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : (instance ? 'Update' : 'Create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameInstanceForm;
