import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FiInfo, FiPlus, FiX, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { LOYALTY_ICONS, getIconById } from '../../../constants/loyaltyIcons';
import SafeIcon from '../../../common/SafeIcon';

const IconSequenceConfig = ({ config, onChange }) => {
  const sequence = config.sequence || [];
  const [showPicker, setShowPicker] = useState(false);

  const addIcon = (iconId) => {
    if (sequence.length < 5) {
      onChange('sequence', [...sequence, iconId]);
    }
    setShowPicker(false);
  };

  const removeIcon = (index) => {
    const newSequence = sequence.filter((_, i) => i !== index);
    onChange('sequence', newSequence);
  };

  const moveIcon = (index, direction) => {
    const newSequence = [...sequence];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < sequence.length) {
      [newSequence[index], newSequence[newIndex]] = [newSequence[newIndex], newSequence[index]];
      onChange('sequence', newSequence);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Icon Sequence (3-5 icons)
        </label>
        <p className="text-xs text-gray-400 mb-3">
          Staff must tap these icons in order to validate a visit.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px] p-3 bg-charcoal-900 rounded-lg border border-white/10">
        {sequence.map((iconId, index) => {
          const iconData = getIconById(iconId);
          if (!iconData) return null;
          return (
            <div
              key={`${iconId}-${index}`}
              className="flex items-center gap-1 bg-charcoal-700 rounded-lg p-2 border border-white/10"
            >
              <span className="text-xs text-gray-400 mr-1">{index + 1}.</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${iconData.color}20` }}
              >
                <SafeIcon icon={iconData.icon} className="w-5 h-5" style={{ color: iconData.color }} />
              </div>
              <div className="flex flex-col ml-1">
                <button
                  onClick={() => moveIcon(index, -1)}
                  disabled={index === 0}
                  className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <FiArrowUp className="w-3 h-3 text-gray-400" />
                </button>
                <button
                  onClick={() => moveIcon(index, 1)}
                  disabled={index === sequence.length - 1}
                  className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30"
                >
                  <FiArrowDown className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <button
                onClick={() => removeIcon(index)}
                className="p-1 hover:bg-red-500/20 rounded ml-1"
              >
                <FiX className="w-4 h-4 text-red-400" />
              </button>
            </div>
          );
        })}
        {sequence.length < 5 && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
          >
            <FiPlus className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {sequence.length < 3 && (
        <p className="text-xs text-amber-400">Add at least 3 icons to complete the sequence.</p>
      )}

      {showPicker && (
        <div className="p-4 bg-charcoal-900 rounded-lg border border-white/10">
          <p className="text-sm text-gray-300 mb-3">Select an icon to add:</p>
          <div className="grid grid-cols-6 gap-2">
            {LOYALTY_ICONS.map((iconData) => (
              <button
                key={iconData.id}
                onClick={() => addIcon(iconData.id)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors flex flex-col items-center gap-1"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${iconData.color}20` }}
                >
                  <SafeIcon icon={iconData.icon} className="w-6 h-6" style={{ color: iconData.color }} />
                </div>
                <span className="text-xs text-gray-400">{iconData.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="mt-3 text-sm text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

const IconPositionConfig = ({ config, onChange }) => {
  const targetIcon = config.targetIcon || 'star';
  const targetPosition = config.targetPosition || 1;
  const gridSize = config.gridSize || 6;

  const iconData = getIconById(targetIcon);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Icon Position Challenge
        </label>
        <p className="text-xs text-gray-400 mb-3">
          Staff must identify which position the target icon appears at.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target Icon
          </label>
          <div className="grid grid-cols-6 gap-2 p-3 bg-charcoal-900 rounded-lg border border-white/10 max-h-48 overflow-y-auto">
            {LOYALTY_ICONS.map((icon) => (
              <button
                key={icon.id}
                onClick={() => onChange('targetIcon', icon.id)}
                className={`p-2 rounded-lg transition-colors ${
                  targetIcon === icon.id
                    ? 'bg-rose-500/20 ring-2 ring-rose-500'
                    : 'hover:bg-white/10'
                }`}
              >
                <SafeIcon icon={icon.icon} className="w-6 h-6 mx-auto" style={{ color: icon.color }} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Grid Size
            </label>
            <select
              value={gridSize}
              onChange={(e) => onChange('gridSize', parseInt(e.target.value))}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value={4}>4 icons (2x2)</option>
              <option value={6}>6 icons (2x3)</option>
              <option value={9}>9 icons (3x3)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Correct Position
            </label>
            <select
              value={targetPosition}
              onChange={(e) => onChange('targetPosition', parseInt(e.target.value))}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              {Array.from({ length: gridSize }, (_, i) => (
                <option key={i + 1} value={i + 1}>Position {i + 1}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              The target icon will appear at this position (numbered left-to-right, top-to-bottom).
            </p>
          </div>

          {iconData && (
            <div className="p-3 bg-charcoal-900 rounded-lg border border-white/10">
              <p className="text-xs text-gray-400 mb-2">Preview: Staff must find</p>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${iconData.color}20` }}
                >
                  <SafeIcon icon={iconData.icon} className="w-6 h-6" style={{ color: iconData.color }} />
                </div>
                <span className="text-sm text-gray-300">at position {targetPosition}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const IconGridConfig = ({ config, onChange }) => {
  const selectedIcons = config.selectedIcons || [];
  const gridSize = config.gridSize || 9;

  const toggleIcon = (iconId) => {
    if (selectedIcons.includes(iconId)) {
      onChange('selectedIcons', selectedIcons.filter(id => id !== iconId));
    } else if (selectedIcons.length < Math.floor(gridSize / 2)) {
      onChange('selectedIcons', [...selectedIcons, iconId]);
    }
  };

  const maxSelectable = Math.floor(gridSize / 2);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Icon Grid Pattern
        </label>
        <p className="text-xs text-gray-400 mb-3">
          Staff must select all the correct icons from a grid. Select 2-{maxSelectable} icons that staff must identify.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Grid Size
        </label>
        <select
          value={gridSize}
          onChange={(e) => {
            const newSize = parseInt(e.target.value);
            onChange('gridSize', newSize);
            const newMax = Math.floor(newSize / 2);
            if (selectedIcons.length > newMax) {
              onChange('selectedIcons', selectedIcons.slice(0, newMax));
            }
          }}
          className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
        >
          <option value={6}>6 icons (2x3)</option>
          <option value={9}>9 icons (3x3)</option>
          <option value={12}>12 icons (3x4)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Select Target Icons ({selectedIcons.length}/{maxSelectable} max)
        </label>
        <div className="grid grid-cols-6 gap-2 p-3 bg-charcoal-900 rounded-lg border border-white/10">
          {LOYALTY_ICONS.map((icon) => {
            const isSelected = selectedIcons.includes(icon.id);
            return (
              <button
                key={icon.id}
                onClick={() => toggleIcon(icon.id)}
                disabled={!isSelected && selectedIcons.length >= maxSelectable}
                className={`p-2 rounded-lg transition-colors ${
                  isSelected
                    ? 'bg-rose-500/20 ring-2 ring-rose-500'
                    : 'hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <SafeIcon icon={icon.icon} className="w-6 h-6 mx-auto" style={{ color: icon.color }} />
                <span className="text-xs text-gray-400 block mt-1">{icon.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedIcons.length < 2 && (
        <p className="text-xs text-amber-400">Select at least 2 icons for the pattern.</p>
      )}

      {selectedIcons.length >= 2 && (
        <div className="p-3 bg-charcoal-900 rounded-lg border border-white/10">
          <p className="text-xs text-gray-400 mb-2">Staff must find these {selectedIcons.length} icons:</p>
          <div className="flex flex-wrap gap-2">
            {selectedIcons.map(iconId => {
              const iconData = getIconById(iconId);
              if (!iconData) return null;
              return (
                <div
                  key={iconId}
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${iconData.color}20` }}
                >
                  <SafeIcon icon={iconData.icon} className="w-6 h-6" style={{ color: iconData.color }} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const LoyaltySettings = ({ loyaltyData, onChange, loyaltyUrl }) => {
  const qrRef = useRef();

  const handleChange = (key, value) => {
    onChange({ [key]: value });
  };

  const handleSettingsChange = (key, value) => {
    onChange({
      settings: { ...loyaltyData.settings, [key]: value }
    });
  };

  const handleValidationConfigChange = (key, value) => {
    onChange({
      validationConfig: { ...loyaltyData.validationConfig, [key]: value }
    });
  };

  const downloadQRCode = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `loyalty-qr-${loyaltyData.id}.png`;
      a.click();
    }
  };

  const timezones = [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
    { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
    { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
    { value: 'Europe/London', label: 'London' },
    { value: 'Europe/Paris', label: 'Paris' },
    { value: 'Asia/Tokyo', label: 'Tokyo' },
    { value: 'Australia/Sydney', label: 'Sydney' },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Program Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Program Name
            </label>
            <input
              type="text"
              value={loyaltyData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Program ID (Read Only)
            </label>
            <input
              type="text"
              value={loyaltyData.id}
              readOnly
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Reward Configuration</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Program Type
              </label>
              <select
                value={loyaltyData.programType}
                onChange={(e) => handleChange('programType', e.target.value)}
                className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              >
                <option value="visit">Visit-Based (Earn stamps per visit)</option>
                <option value="action">Action-Based (Earn stamps per purchase)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {loyaltyData.programType === 'visit' ? 'Visits' : 'Actions'} Required
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={loyaltyData.threshold}
                onChange={(e) => handleChange('threshold', parseInt(e.target.value) || 10)}
                className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reward Name
            </label>
            <input
              type="text"
              value={loyaltyData.rewardName}
              onChange={(e) => handleChange('rewardName', e.target.value)}
              placeholder="Free Coffee"
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Reward Description
            </label>
            <textarea
              value={loyaltyData.rewardDescription}
              onChange={(e) => handleChange('rewardDescription', e.target.value)}
              placeholder="Get any drink free on your next visit!"
              rows={2}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              After Reward Claimed
            </label>
            <select
              value={loyaltyData.resetBehavior}
              onChange={(e) => handleChange('resetBehavior', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value="reset">Reset to zero stamps</option>
              <option value="rollover">Rollover excess stamps to next card</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Staff Validation</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Validation Method
            </label>
            <select
              value={loyaltyData.validationMethod}
              onChange={(e) => handleChange('validationMethod', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              <option value="pin">PIN Code</option>
              <option value="icon_sequence">Icon Sequence</option>
              <option value="icon_position">Icon Position</option>
              <option value="icon_grid">Icon Grid Pattern</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Staff must complete this verification to add stamps.
            </p>
          </div>

          {loyaltyData.validationMethod === 'pin' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Staff PIN Code
              </label>
              <input
                type="text"
                value={loyaltyData.validationConfig.pin || ''}
                onChange={(e) => handleValidationConfigChange('pin', e.target.value)}
                maxLength={6}
                placeholder="1234"
                className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 font-mono tracking-widest"
              />
              <p className="text-xs text-gray-400 mt-1">
                4-6 digit PIN that staff must enter to verify.
              </p>
            </div>
          )}

          {loyaltyData.validationMethod === 'icon_sequence' && (
            <IconSequenceConfig
              config={loyaltyData.validationConfig}
              onChange={handleValidationConfigChange}
            />
          )}

          {loyaltyData.validationMethod === 'icon_position' && (
            <IconPositionConfig
              config={loyaltyData.validationConfig}
              onChange={handleValidationConfigChange}
            />
          )}

          {loyaltyData.validationMethod === 'icon_grid' && (
            <IconGridConfig
              config={loyaltyData.validationConfig}
              onChange={handleValidationConfigChange}
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Failed Attempt Lockout
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="10"
                value={loyaltyData.lockoutThreshold}
                onChange={(e) => handleChange('lockoutThreshold', parseInt(e.target.value) || 3)}
                className="w-24 bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
              />
              <span className="text-sm text-gray-400">failed attempts before lockout</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Card will be locked after this many failed validation attempts.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Scheduling</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Timezone
            </label>
            <select
              value={loyaltyData.settings?.timezone || 'UTC'}
              onChange={(e) => handleSettingsChange('timezone', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={loyaltyData.settings?.startDate || ''}
              onChange={(e) => handleSettingsChange('startDate', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Program will be hidden before this date.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={loyaltyData.settings?.endDate || ''}
              onChange={(e) => handleSettingsChange('endDate', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Program will close after this date.</p>
          </div>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Enrollment Link & QR Code</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Enrollment URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={loyaltyUrl}
                readOnly
                className="flex-1 bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-gray-300"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(loyaltyUrl);
                  alert('URL copied to clipboard!');
                }}
                className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Share this link to allow customers to enroll in your loyalty program.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                QR Code for Enrollment
              </label>
              <div className="flex items-start space-x-4">
                <div ref={qrRef} className="p-2 bg-white border border-white/10 rounded-lg inline-block">
                  <QRCodeCanvas value={loyaltyUrl} size={150} level={"H"} includeMargin={true} />
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm text-gray-400">
                    Display this at your location for easy sign-up.
                  </p>
                  <button
                    onClick={downloadQRCode}
                    className="text-rose-400 hover:text-rose-300 text-sm font-medium text-left"
                  >
                    Download PNG
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltySettings;
