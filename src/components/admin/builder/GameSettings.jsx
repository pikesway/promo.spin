import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const GameSettings = ({ gameData, onChange, customUrl, idLabel = 'Game ID' }) => {
  const qrRef = useRef();
  const [urlCopied, setUrlCopied] = useState(false);

  const handleSettingsChange = (key, value) => {
    onChange({
      ...gameData,
      settings: { ...gameData.settings, [key]: value }
    });
  };

  const handleNameChange = (value) => {
    onChange({ ...gameData, name: value });
  };

  const downloadQRCode = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${gameData.id}.png`;
      a.click();
    }
  };

  const gameUrl = customUrl || `${window.location.origin}/#/game/${gameData.id}`;

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
    { value: 'Asia/Dubai', label: 'Dubai' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Kolkata', label: 'India Standard Time' }
  ];

  return (
    <div className="space-y-8">
      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Basic Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Game Name
            </label>
            <input
              type="text"
              value={gameData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {idLabel} (Read Only)
            </label>
            <input
              type="text"
              value={gameData.id}
              readOnly
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-gray-400"
            />
          </div>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Scheduling & Timezone</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
             <label className="block text-sm font-medium text-gray-300 mb-2">
               Timezone
             </label>
             <select
               value={gameData.settings?.timezone || 'UTC'}
               onChange={(e) => handleSettingsChange('timezone', e.target.value)}
               className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
             >
               {timezones.map(tz => (
                 <option key={tz.value} value={tz.value}>{tz.label} ({tz.value})</option>
               ))}
             </select>
             <p className="text-xs text-gray-400 mt-1">
               Start/End times and Calendar Resets will use this timezone.
             </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Start Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={gameData.settings?.startDate || ''}
              onChange={(e) => handleSettingsChange('startDate', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Game will be inaccessible before this time.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={gameData.settings?.endDate || ''}
              onChange={(e) => handleSettingsChange('endDate', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">Game will close after this time.</p>
          </div>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Spin Limits</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Spin Restriction
            </label>
            <div className="space-y-3">
              {/* One Per User */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="spinLimit"
                  value="one-per-user"
                  checked={gameData.settings?.spinLimit === 'one-per-user'}
                  onChange={(e) => handleSettingsChange('spinLimit', e.target.value)}
                  className="mr-3 w-4 h-4 text-teal-600 border-white/20 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-300">One spin per user (Forever)</span>
              </label>

              {/* Time Limit */}
              <div className="flex flex-col">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="spinLimit"
                    value="time-limit"
                    checked={gameData.settings?.spinLimit === 'time-limit'}
                    onChange={(e) => handleSettingsChange('spinLimit', e.target.value)}
                    className="mr-3 w-4 h-4 text-teal-600 border-white/20 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-300">Time Limit (Reset after X hours)</span>
                </label>
                {gameData.settings?.spinLimit === 'time-limit' && (
                  <div className="ml-7 mt-2 p-3 bg-charcoal-900 rounded-lg border border-teal-500/30 w-full max-w-xs animate-fade-in-down">
                     <label className="block text-xs font-semibold text-teal-300 mb-1">
                       Lockout Duration (Hours)
                     </label>
                     <div className="flex items-center space-x-2">
                       <input
                         type="number"
                         min="1"
                         step="0.5"
                         value={gameData.settings?.spinDelayHours || 24}
                         onChange={(e) => handleSettingsChange('spinDelayHours', parseFloat(e.target.value))}
                         className="w-20 bg-charcoal-800 border border-white/10 rounded px-2 py-1 text-sm text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                       />
                       <span className="text-xs text-gray-400">hours</span>
                     </div>
                  </div>
                )}
              </div>

              {/* Calendar Limit */}
              <div className="flex flex-col">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="spinLimit"
                    value="calendar-limit"
                    checked={gameData.settings?.spinLimit === 'calendar-limit'}
                    onChange={(e) => handleSettingsChange('spinLimit', e.target.value)}
                    className="mr-3 w-4 h-4 text-teal-600 border-white/20 focus:ring-teal-500"
                  />
                  <span className="text-sm text-gray-300">Calendar Reset (Weekly/Monthly)</span>
                </label>
                {gameData.settings?.spinLimit === 'calendar-limit' && (
                  <div className="ml-7 mt-2 p-3 bg-charcoal-900 rounded-lg border border-teal-500/30 w-full max-w-sm animate-fade-in-down">
                     <div className="grid grid-cols-2 gap-3">
                       <div>
                         <label className="block text-xs font-semibold text-teal-300 mb-1">Frequency</label>
                         <select
                           value={gameData.settings?.calendarResetFrequency || 'weekly'}
                           onChange={(e) => handleSettingsChange('calendarResetFrequency', e.target.value)}
                           className="w-full bg-charcoal-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                         >
                           <option value="weekly">Weekly</option>
                           <option value="monthly">Monthly</option>
                         </select>
                       </div>

                       {gameData.settings?.calendarResetFrequency !== 'monthly' ? (
                         <div>
                           <label className="block text-xs font-semibold text-teal-300 mb-1">Reset Day</label>
                           <select
                             value={gameData.settings?.calendarResetDay || 1}
                             onChange={(e) => handleSettingsChange('calendarResetDay', parseInt(e.target.value))}
                             className="w-full bg-charcoal-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                           >
                             <option value={0}>Sunday</option>
                             <option value={1}>Monday</option>
                             <option value={2}>Tuesday</option>
                             <option value={3}>Wednesday</option>
                             <option value={4}>Thursday</option>
                             <option value={5}>Friday</option>
                             <option value={6}>Saturday</option>
                           </select>
                         </div>
                       ) : (
                         <div>
                           <label className="block text-xs font-semibold text-teal-300 mb-1">Day of Month</label>
                           <select
                             value={gameData.settings?.calendarResetDay || 1}
                             onChange={(e) => handleSettingsChange('calendarResetDay', parseInt(e.target.value))}
                             className="w-full bg-charcoal-800 border border-white/10 rounded px-2 py-1 text-sm text-white"
                           >
                             <option value={1}>1st</option>
                             <option value={15}>15th</option>
                             {[...Array(29).keys()].filter(k => k > 1 && k < 31).map(d => (
                               <option key={d} value={d}>{d}th</option>
                             ))}
                           </select>
                         </div>
                       )}
                     </div>
                     <p className="text-[10px] text-gray-400 mt-2">
                       Spins reset at 00:00 {gameData.settings?.timezone || 'UTC'} on the selected day.
                     </p>
                  </div>
                )}
              </div>

              {/* One Per Session */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="spinLimit"
                  value="one-per-session"
                  checked={gameData.settings?.spinLimit === 'one-per-session'}
                  onChange={(e) => handleSettingsChange('spinLimit', e.target.value)}
                  className="mr-3 w-4 h-4 text-teal-600 border-white/20 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-300">One spin per session (Browser Refresh)</span>
              </label>

              {/* Unlimited */}
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="spinLimit"
                  value="unlimited"
                  checked={gameData.settings?.spinLimit === 'unlimited'}
                  onChange={(e) => handleSettingsChange('spinLimit', e.target.value)}
                  className="mr-3 w-4 h-4 text-teal-600 border-white/20 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-300">Unlimited spins</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Access Control</h2>
        <div className="space-y-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={gameData.settings?.passwordProtected || false}
              onChange={(e) => handleSettingsChange('passwordProtected', e.target.checked)}
              className="mr-3"
              disabled
            />
            <span className="text-sm font-medium text-gray-400">Enable password protection (Coming Soon)</span>
          </label>
        </div>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Game URLs & Sharing</h2>
        <div className="space-y-8">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Public Game URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={gameUrl}
                readOnly
                className="flex-1 bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-gray-300"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gameUrl);
                  setUrlCopied(true);
                  setTimeout(() => setUrlCopied(false), 2000);
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {urlCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                QR Code
              </label>
              <div className="flex items-start space-x-4">
                <div ref={qrRef} className="p-2 bg-white border border-white/10 rounded-lg inline-block">
                  <QRCodeCanvas value={gameUrl} size={150} level={"H"} includeMargin={true} />
                </div>
                <div className="flex flex-col space-y-2">
                  <p className="text-sm text-gray-400">
                    Scan to play on mobile.
                  </p>
                  <button
                    onClick={downloadQRCode}
                    className="text-teal-400 hover:text-teal-300 text-sm font-medium text-left"
                  >
                    Download PNG ↓
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Embed Code (iframe)
              </label>
              <textarea
                value={`<iframe src="${gameUrl}" width="100%" height="600" frameborder="0"></iframe>`}
                readOnly
                rows={4}
                className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-gray-400 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSettings;