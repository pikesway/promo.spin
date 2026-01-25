import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { FiInfo } from 'react-icons/fi';

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
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <FiInfo className="text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-300">
                  Staff will need to tap icons in the correct order. Configure the sequence in the Staff Dashboard.
                </p>
              </div>
            </div>
          )}

          {(loyaltyData.validationMethod === 'icon_position' || loyaltyData.validationMethod === 'icon_grid') && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <FiInfo className="text-rose-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-gray-300">
                  Staff will need to identify the correct icon position. Configure the pattern in the Staff Dashboard.
                </p>
              </div>
            </div>
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
