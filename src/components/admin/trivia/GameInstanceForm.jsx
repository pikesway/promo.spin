import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiAlertCircle, FiUpload } from 'react-icons/fi';
import { usePlatform } from '../../../context/PlatformContext';
import { uploadFile, getPublicUrl, validateImageFile } from '../../../utils/storageHelpers';

const GameInstanceForm = ({ campaignId, clientId, brandId, instance, defaultScoringMode, onClose, onSaved }) => {
  const { createGameInstance, updateGameInstance, fetchTriviaShells } = usePlatform();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesSource, setTemplatesSource] = useState(null);

  const [activeOverrideTab, setActiveOverrideTab] = useState('rules');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    template_id: '',
    template_version: '',
    sequence_number: null,
    start_at: '',
    end_at: '',
    scoring_mode: '',
    config: {}
  });

  const selectedTemplate = templates?.find(t => t.id === formData.template_id);

  useEffect(() => {
    const loadTemplates = async () => {
      setTemplatesLoading(true);
      const result = await fetchTriviaShells();
      setTemplates(result.data || []);
      setTemplatesSource(result.source);
      setTemplatesLoading(false);
    };
    loadTemplates();
  }, []);

  useEffect(() => {
    if (instance) {
      setFormData({
        name: instance.name || '',
        template_id: instance.template_id || '',
        template_version: instance.template_version || '',
        sequence_number: instance.sequence_number || null,
        start_at: instance.start_at ? instance.start_at.slice(0, 16) : '',
        end_at: instance.end_at ? instance.end_at.slice(0, 16) : '',
        scoring_mode: instance.scoring_mode || '',
        config: instance.config || {}
      });
    }
  }, [instance]);

  const handleChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
  };

  const handleConfigChange = (path, value) => {
    setFormData(prev => {
      const newConfig = { ...prev.config };
      const keys = path.split('.');
      let current = newConfig;

      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        } else {
          current[key] = { ...current[key] };
        }
        current = current[key];
      }

      const lastKey = keys[keys.length - 1];
      current[lastKey] = value;

      return { ...prev, config: newConfig };
    });
    setError(null);
  };

  const getConfigValue = (path) => {
    const keys = path.split('.');
    let current = formData.config;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return '';
      }
    }

    return current || '';
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error);
      return;
    }

    setIsUploading(true);

    try {
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '');
      const filePath = `backgrounds/${Date.now()}_${sanitizedFileName}`;

      const { data, error: uploadErr } = await uploadFile('game-assets', filePath, file);

      if (uploadErr) {
        throw new Error(uploadErr.message || 'Failed to upload file');
      }

      const publicUrl = getPublicUrl('game-assets', filePath);
      handleConfigChange('ui.background_url', publicUrl);
      setUploadError(null);
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveBackground = () => {
    handleConfigChange('ui.background_url', '');
    setUploadError(null);
  };

  const syncToRuntime = async (instanceId) => {
    const runtimeApiUrl = import.meta.env.VITE_TRIVIA_API_URL;

    if (!runtimeApiUrl) {
      return;
    }

    try {
      const baseUrl = runtimeApiUrl.replace('/functions/v1/public-templates', '');
      const syncEndpoint = `${baseUrl}/functions/v1/sync-instance-override`;

      const syncPayload = {
        instance_id: instanceId,
        campaign_id: campaignId,
        settings: formData.config || {}
      };

      await fetch(syncEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_TRIVIA_RUNTIME_ANON_KEY || '',
          'Authorization': `Bearer ${import.meta.env.VITE_TRIVIA_RUNTIME_ANON_KEY || ''}`
        },
        body: JSON.stringify(syncPayload)
      });
    } catch {
      // Sync failures are non-blocking
    }
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
      const generatedSlug = formData.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      const payload = {
        campaign_id: campaignId,
        client_id: clientId,
        brand_id: brandId || null,
        name: formData.name.trim(),
        slug: generatedSlug,
        template_id: formData.template_id || null,
        template_version: formData.template_version || null,
        sequence_number: formData.sequence_number ? parseInt(formData.sequence_number) : null,
        start_at: formData.start_at ? new Date(formData.start_at).toISOString() : null,
        end_at: formData.end_at ? new Date(formData.end_at).toISOString() : null,
        scoring_mode: formData.scoring_mode || null,
        launch_url: formData.launch_url || null,
        external_instance_ref: formData.external_instance_ref || null,
        config: formData.config || {}
      };

      let savedInstanceId;

      if (instance) {
        const { error: updateError } = await updateGameInstance(instance.id, payload);
        if (updateError) throw updateError;
        savedInstanceId = instance.id;
      } else {
        const { data, error: createError } = await createGameInstance(payload);
        if (createError) throw createError;
        savedInstanceId = data?.id;
      }

      if (savedInstanceId) {
        syncToRuntime(savedInstanceId);
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

            <div className="border-t border-white/20 pt-4 mt-6">
              <h3 className="text-sm font-semibold text-white mb-3">Game Overrides (Optional)</h3>

              <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg overflow-hidden">
                <div className="flex border-b border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveOverrideTab('rules')}
                    className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                      activeOverrideTab === 'rules'
                        ? 'bg-teal-600/20 text-teal-400 border-b-2 border-teal-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Game Rules
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOverrideTab('branding')}
                    className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                      activeOverrideTab === 'branding'
                        ? 'bg-teal-600/20 text-teal-400 border-b-2 border-teal-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Branding
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveOverrideTab('screens')}
                    className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
                      activeOverrideTab === 'screens'
                        ? 'bg-teal-600/20 text-teal-400 border-b-2 border-teal-400'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    Screens & Copy
                  </button>
                </div>

                <div className="p-4">
                  {activeOverrideTab === 'rules' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Question Count
                        </label>
                        <input
                          type="number"
                          className="input w-full"
                          value={getConfigValue('question_count')}
                          onChange={(e) => {
                            const value = e.target.value ? parseInt(e.target.value) : '';
                            const maxQuestions = selectedTemplate?.max_available_questions || 50;
                            const clampedValue = value ? Math.min(Math.max(value, 1), maxQuestions) : '';
                            handleConfigChange('question_count', clampedValue);
                          }}
                          placeholder={selectedTemplate?.default_question_count || 10}
                          min="1"
                          max={selectedTemplate?.max_available_questions || 50}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Number of questions in this trivia instance (default: {selectedTemplate?.default_question_count || 10})
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Maximum available in template: {selectedTemplate?.max_available_questions || 'Unknown'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Question Selection Mode
                        </label>
                        <select
                          className="select w-full"
                          value={getConfigValue('question_mode')}
                          onChange={(e) => handleConfigChange('question_mode', e.target.value)}
                        >
                          <option value="">Use template default</option>
                          <option value="fixed">Fixed (Same questions & order for everyone)</option>
                          <option value="random">Random Per Play (Different questions each time)</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          Controls question ordering behavior for this trivia instance
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Timer Seconds
                        </label>
                        <input
                          type="number"
                          className="input w-full"
                          value={getConfigValue('timer.seconds')}
                          onChange={(e) => handleConfigChange('timer.seconds', e.target.value ? parseInt(e.target.value) : '')}
                          placeholder={selectedTemplate?.default_timer_seconds || 15}
                          min="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Time limit in seconds (default: {selectedTemplate?.default_timer_seconds || 15})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Timer Mode
                        </label>
                        <select
                          className="select w-full"
                          value={getConfigValue('timer.mode')}
                          onChange={(e) => handleConfigChange('timer.mode', e.target.value)}
                        >
                          <option value="">Use template default ({selectedTemplate?.default_timer_mode || 'per_question'})</option>
                          <option value="per_question">Per Question</option>
                          <option value="per_quiz">Per Quiz</option>
                          <option value="none">No Timer</option>
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          When the timer applies to this trivia game
                        </p>
                      </div>
                    </div>
                  )}

                  {activeOverrideTab === 'branding' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Primary Text Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="h-10 w-16 rounded border border-white/10 bg-transparent cursor-pointer"
                            value={getConfigValue('theme.primary_text_color') || selectedTemplate?.config?.theme?.primary_text_color || '#FFFFFF'}
                            onChange={(e) => handleConfigChange('theme.primary_text_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="input flex-1"
                            value={getConfigValue('theme.primary_text_color')}
                            onChange={(e) => handleConfigChange('theme.primary_text_color', e.target.value)}
                            placeholder={selectedTemplate?.config?.theme?.primary_text_color || '#FFFFFF'}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Main text color for game screens (default: {selectedTemplate?.config?.theme?.primary_text_color || '#FFFFFF'})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Button Fill Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            className="h-10 w-16 rounded border border-white/10 bg-transparent cursor-pointer"
                            value={getConfigValue('theme.button_fill_color') || selectedTemplate?.config?.theme?.button_fill_color || '#3b82f6'}
                            onChange={(e) => handleConfigChange('theme.button_fill_color', e.target.value)}
                          />
                          <input
                            type="text"
                            className="input flex-1"
                            value={getConfigValue('theme.button_fill_color')}
                            onChange={(e) => handleConfigChange('theme.button_fill_color', e.target.value)}
                            placeholder={selectedTemplate?.config?.theme?.button_fill_color || '#3b82f6'}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Background color for buttons (default: {selectedTemplate?.config?.theme?.button_fill_color || '#3b82f6'})
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Background Image
                        </label>

                        {getConfigValue('ui.background_url') && (
                          <div className="mb-3 p-3 bg-zinc-900/80 border border-zinc-700 rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0">
                                <img
                                  src={getConfigValue('ui.background_url')}
                                  alt="Background preview"
                                  className="w-24 h-16 object-cover rounded border border-white/10"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-gray-400 truncate mb-2">
                                  {getConfigValue('ui.background_url')}
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploading}
                                    className="text-xs px-3 py-1 bg-teal-600/20 text-teal-400 rounded hover:bg-teal-600/30 disabled:opacity-50"
                                  >
                                    Change Image
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleRemoveBackground}
                                    disabled={isUploading}
                                    className="text-xs px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 disabled:opacity-50"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        <input
                          type="text"
                          className="input w-full mb-2"
                          value={getConfigValue('ui.background_url')}
                          onChange={(e) => handleConfigChange('ui.background_url', e.target.value)}
                          placeholder={selectedTemplate?.config?.backgrounds?.game || 'https://example.com/background.jpg'}
                          disabled={isUploading}
                        />

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploading}
                          className="w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-gray-300 rounded-lg border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                        >
                          {isUploading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin"></div>
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <FiUpload className="w-4 h-4" />
                              <span>Upload Background Image</span>
                            </>
                          )}
                        </button>

                        {uploadError && (
                          <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                            {uploadError}
                          </div>
                        )}

                        <p className="text-xs text-gray-500 mt-2">
                          Upload a custom background image or paste a URL above (Max 2MB, PNG/JPEG/SVG/WebP)
                        </p>
                      </div>
                    </div>
                  )}

                  {activeOverrideTab === 'screens' && (
                    <div className="space-y-4">
                      <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-white/10 bg-zinc-700 checked:bg-teal-600"
                            checked={getConfigValue('lead_capture.enabled') !== false}
                            onChange={(e) => handleConfigChange('lead_capture.enabled', e.target.checked)}
                          />
                          Lead Capture Enabled
                        </label>
                        <p className="text-xs text-gray-500 mt-1 ml-6">
                          Collect player information before the game starts
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Start Screen Headline
                        </label>
                        <input
                          type="text"
                          className="input w-full"
                          value={getConfigValue('screens.start.headline')}
                          onChange={(e) => handleConfigChange('screens.start.headline', e.target.value)}
                          placeholder={selectedTemplate?.config?.screens?.start?.headline || 'Ready to Play?'}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Main headline text on the start screen
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                          Start Screen Button Label
                        </label>
                        <input
                          type="text"
                          className="input w-full"
                          value={getConfigValue('screens.start.button_label')}
                          onChange={(e) => handleConfigChange('screens.start.button_label', e.target.value)}
                          placeholder={selectedTemplate?.config?.screens?.start?.button_label || 'Start Quiz'}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Text displayed on the start button
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
