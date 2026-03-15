import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FiInfo, FiPlus, FiX, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { LOYALTY_ICONS, getIconById } from '../../../constants/loyaltyIcons';
import SafeIcon from '../../../common/SafeIcon';

const IconSingleConfig = ({ config, onChange }) => {
  const targetIcon = config.targetIcon || 'heart';

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium theme-text-secondary mb-2">
          Select Target Icon
        </label>
        <p className="text-xs theme-text-tertiary mb-3">
          Staff must select this specific icon from a grid to validate a visit.
        </p>
      </div>

      <div className="grid grid-cols-8 gap-2">
        {LOYALTY_ICONS.map((iconData) => {
          const isSelected = targetIcon === iconData.id;
          return (
            <button
              key={iconData.id}
              onClick={() => onChange('targetIcon', iconData.id)}
              className="p-3 rounded-lg transition-all"
              style={{
                background: isSelected ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-tertiary)',
                boxShadow: isSelected ? '0 0 0 2px #F43F5E' : 'none'
              }}
            >
              <SafeIcon
                icon={iconData.icon}
                className="w-6 h-6 mx-auto"
                style={{ color: isSelected ? iconData.color : 'var(--text-tertiary)' }}
              />
            </button>
          );
        })}
      </div>

      {targetIcon && (
        <div className="p-3 theme-bg-tertiary rounded-lg border theme-border">
          <p className="text-xs theme-text-tertiary mb-2">Staff must find this icon:</p>
          <div className="flex gap-2">
            {(() => {
              const iconData = getIconById(targetIcon);
              if (!iconData) return null;
              return (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${iconData.color}20` }}
                >
                  <SafeIcon icon={iconData.icon} className="w-7 h-7" style={{ color: iconData.color }} />
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

const IconSequenceConfig = ({ config, onChange }) => {
  const iconSequence = config.iconSequence || [];
  const [showPicker, setShowPicker] = useState(false);

  const addIcon = (iconId) => {
    if (iconSequence.length < 5) {
      onChange('iconSequence', [...iconSequence, iconId]);
    }
    setShowPicker(false);
  };

  const removeIcon = (index) => {
    const newSequence = iconSequence.filter((_, i) => i !== index);
    onChange('iconSequence', newSequence);
  };

  const moveIcon = (index, direction) => {
    const newSequence = [...iconSequence];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < iconSequence.length) {
      [newSequence[index], newSequence[newIndex]] = [newSequence[newIndex], newSequence[index]];
      onChange('iconSequence', newSequence);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium theme-text-secondary mb-2">
          Icon Sequence (2-5 icons)
        </label>
        <p className="text-xs theme-text-tertiary mb-3">
          Staff must tap these icons in order to validate a visit. This sequence is kept secret from customers.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[60px] p-3 theme-bg-tertiary rounded-lg border theme-border">
        {iconSequence.map((iconId, index) => {
          const iconData = getIconById(iconId);
          if (!iconData) return null;
          return (
            <div
              key={`${iconId}-${index}`}
              className="flex items-center gap-1 bg-charcoal-700 rounded-lg p-2 border theme-border"
            >
              <span className="text-xs theme-text-tertiary mr-1">{index + 1}.</span>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${iconData.color}20` }}
              >
                <SafeIcon icon={iconData.icon} className="w-5 h-5" style={{ color: iconData.color }} />
              </div>
              {iconSequence.length > 1 && (
                <div className="flex flex-col ml-1">
                  <button
                    onClick={() => moveIcon(index, -1)}
                    disabled={index === 0}
                    className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30"
                  >
                    <FiArrowUp className="w-3 h-3 theme-text-tertiary" />
                  </button>
                  <button
                    onClick={() => moveIcon(index, 1)}
                    disabled={index === iconSequence.length - 1}
                    className="p-0.5 hover:bg-white/10 rounded disabled:opacity-30"
                  >
                    <FiArrowDown className="w-3 h-3 theme-text-tertiary" />
                  </button>
                </div>
              )}
              <button
                onClick={() => removeIcon(index)}
                className="p-1 hover:bg-red-500/20 rounded ml-1"
              >
                <FiX className="w-4 h-4 text-red-400" />
              </button>
            </div>
          );
        })}
        {iconSequence.length < 5 && (
          <button
            onClick={() => setShowPicker(true)}
            className="w-12 h-12 rounded-lg border-2 border-dashed border-white/20 flex items-center justify-center hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
          >
            <FiPlus className="w-5 h-5 theme-text-tertiary" />
          </button>
        )}
      </div>

      {iconSequence.length < 2 && (
        <p className="text-xs text-amber-400">Add at least 2 icons to complete the sequence.</p>
      )}

      {showPicker && (
        <div className="p-4 theme-bg-tertiary rounded-lg border theme-border">
          <p className="text-sm theme-text-secondary mb-3">Select an icon to add:</p>
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
                <span className="text-xs theme-text-tertiary">{iconData.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="mt-3 text-sm theme-text-tertiary hover:theme-text-primary"
          >
            Cancel
          </button>
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
      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-6">Program Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Program Name
            </label>
            <input
              type="text"
              value={loyaltyData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500 focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Program ID (Read Only)
            </label>
            <input
              type="text"
              value={loyaltyData.id}
              readOnly
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-tertiary"
            />
          </div>
        </div>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-6">Reward Configuration</h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">
                Program Type
              </label>
              <select
                value={loyaltyData.programType}
                onChange={(e) => handleChange('programType', e.target.value)}
                className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
              >
                <option value="visit">Visit-Based (Earn stamps per visit)</option>
                <option value="action">Action-Based (Earn stamps per purchase)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">
                {loyaltyData.programType === 'visit' ? 'Visits' : 'Actions'} Required
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={loyaltyData.threshold}
                onChange={(e) => handleChange('threshold', parseInt(e.target.value) || 10)}
                className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Reward Name
            </label>
            <input
              type="text"
              value={loyaltyData.rewardName}
              onChange={(e) => handleChange('rewardName', e.target.value)}
              placeholder="Free Coffee"
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Reward Description
            </label>
            <textarea
              value={loyaltyData.rewardDescription}
              onChange={(e) => handleChange('rewardDescription', e.target.value)}
              placeholder="Get any drink free on your next visit!"
              rows={2}
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              After Reward Claimed
            </label>
            <select
              value={loyaltyData.resetBehavior}
              onChange={(e) => handleChange('resetBehavior', e.target.value)}
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
            >
              <option value="reset">Reset to zero stamps</option>
              <option value="rollover">Rollover excess stamps to next card</option>
            </select>
          </div>

          <div className="pt-2 border-t theme-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-medium theme-text-primary">Birthday Reward</label>
                <p className="text-xs theme-text-tertiary mt-0.5">Give members a special reward during their birthday month</p>
              </div>
              <button
                type="button"
                onClick={() => handleChange('birthdayRewardEnabled', !loyaltyData.birthdayRewardEnabled)}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${loyaltyData.birthdayRewardEnabled ? 'bg-green-500' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${loyaltyData.birthdayRewardEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            {loyaltyData.birthdayRewardEnabled && (
              <div className="space-y-4 p-4 rounded-lg theme-bg-tertiary border theme-border">
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-2">Birthday Reward Name</label>
                  <input
                    type="text"
                    value={loyaltyData.birthdayRewardName || ''}
                    onChange={(e) => handleChange('birthdayRewardName', e.target.value)}
                    placeholder="Birthday Coffee on Us"
                    className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium theme-text-secondary mb-2">Birthday Reward Description</label>
                  <textarea
                    value={loyaltyData.birthdayRewardDescription || ''}
                    onChange={(e) => handleChange('birthdayRewardDescription', e.target.value)}
                    placeholder="Enjoy a free drink of your choice on your birthday month!"
                    rows={2}
                    className="w-full theme-bg-secondary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500 resize-none"
                  />
                </div>
                <p className="text-xs theme-text-tertiary">
                  Members who have their birthday on file will be eligible to redeem this reward during their birthday month.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-6">Staff Validation</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Validation Method
            </label>
            <select
              value={loyaltyData.validationMethod}
              onChange={(e) => handleChange('validationMethod', e.target.value)}
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
            >
              <option value="pin">PIN Code</option>
              <option value="icon_single">Icon Selection</option>
              <option value="icon_sequence">Icon Sequence</option>
            </select>
            <p className="text-xs theme-text-tertiary mt-1">
              Staff must complete this verification to add stamps.
            </p>
          </div>

          {loyaltyData.validationMethod === 'pin' && (
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-2">
                Staff PIN Code
              </label>
              <input
                type="text"
                value={loyaltyData.validationConfig.pin || loyaltyData.validationConfig.pinValue || ''}
                onChange={(e) => handleValidationConfigChange('pinValue', e.target.value)}
                maxLength={6}
                placeholder="1234"
                className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary placeholder-gray-500 font-mono tracking-widest"
              />
              <p className="text-xs theme-text-tertiary mt-1">
                4-6 digit PIN that staff must enter to verify.
              </p>
            </div>
          )}

          {loyaltyData.validationMethod === 'icon_single' && (
            <IconSingleConfig
              config={loyaltyData.validationConfig}
              onChange={handleValidationConfigChange}
            />
          )}

          {loyaltyData.validationMethod === 'icon_sequence' && (
            <IconSequenceConfig
              config={loyaltyData.validationConfig}
              onChange={handleValidationConfigChange}
            />
          )}

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Failed Attempt Lockout
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="10"
                value={loyaltyData.lockoutThreshold}
                onChange={(e) => handleChange('lockoutThreshold', parseInt(e.target.value) || 3)}
                className="w-24 theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
              />
              <span className="text-sm theme-text-tertiary">failed attempts before lockout</span>
            </div>
            <p className="text-xs theme-text-tertiary mt-1">
              Card will be locked after this many failed validation attempts.
            </p>
          </div>
        </div>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-6">Scheduling</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Timezone
            </label>
            <select
              value={loyaltyData.settings?.timezone || 'UTC'}
              onChange={(e) => handleSettingsChange('timezone', e.target.value)}
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
            >
              {timezones.map(tz => (
                <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Start Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={loyaltyData.settings?.startDate || ''}
              onChange={(e) => handleSettingsChange('startDate', e.target.value)}
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
            />
            <p className="text-xs theme-text-tertiary mt-1">Program will be hidden before this date.</p>
          </div>
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={loyaltyData.settings?.endDate || ''}
              onChange={(e) => handleSettingsChange('endDate', e.target.value)}
              className="w-full theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-primary"
            />
            <p className="text-xs theme-text-tertiary mt-1">Program will close after this date.</p>
          </div>
        </div>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-6">Enrollment Link & QR Code</h2>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Enrollment URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={loyaltyUrl}
                readOnly
                className="flex-1 theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-secondary"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(loyaltyUrl);
                  alert('URL copied to clipboard!');
                }}
                className="bg-rose-600 hover:bg-rose-500 theme-text-primary px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Copy
              </button>
            </div>
            <p className="text-xs theme-text-tertiary mt-1">
              Share this link to allow customers to enroll in your loyalty program.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium theme-text-secondary mb-3">
                QR Code for Enrollment
              </label>
              <div className="flex items-start space-x-4">
                <div ref={qrRef} className="p-2 bg-white border theme-border rounded-lg inline-block">
                  <QRCodeCanvas value={loyaltyUrl} size={150} level={"H"} includeMargin={true} />
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm theme-text-tertiary">
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