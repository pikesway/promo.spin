import React from 'react';
import ImageUploader from '../../../../common/ImageUploader';
import SafeIcon from '../../../../common/SafeIcon';
import BackgroundSelector from '../common/BackgroundSelector';
import ButtonStyleSelector from '../common/ButtonStyleSelector';
import * as FiIcons from 'react-icons/fi';

const { FiInfo } = FiIcons;

const WinScreenEditor = ({ screenData, onChange }) => {
  const handleChange = (key, value) => {
    onChange({ ...screenData, [key]: value });
  };
  
  const handleButtonChange = (updates) => {
    onChange({ ...screenData, ...updates });
  };

  return (
    <div className="space-y-6">
      <BackgroundSelector 
        data={screenData.background} 
        onChange={(val) => handleChange('background', val)}
        includeDefaultOption={true}
      />

      {/* Explanation Box */}
      <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4 flex items-start space-x-3">
        <SafeIcon icon={FiInfo} className="w-5 h-5 text-teal-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-teal-200">
          <h4 className="font-bold mb-1">Global Defaults & Shared Settings</h4>
          <p className="mb-2">
            The settings below act as <strong>defaults</strong>. You can override the Headline, Message, and Image for specific prizes in the <strong>Visual Design &gt; Spin Wheel</strong> tab.
          </p>
          <p>
            <strong>Important:</strong> The "Action Button Text" and "Animation Options" configured here apply to <em>all</em> winning outcomes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <ImageUploader
            label="Default Prize Image"
            value={screenData.prizeImage || ''}
            onChange={(val) => handleChange('prizeImage', val)}
            helpText="Used if a specific segment doesn't have its own image."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Default Win Headline
          </label>
          <input
            type="text"
            value={screenData.headline || ''}
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Congratulations!"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Default Win Message
          </label>
          <input
            type="text"
            value={screenData.message || ''}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="You won: {prize}"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            Use {'{prize}'} to display the prize name dynamically
          </p>
        </div>

        <div className="md:col-span-2 bg-charcoal-800 p-4 rounded-lg border border-white/10">
          <label className="block text-sm font-bold text-white mb-2">
            Global Action Button Text
          </label>
          <input
            type="text"
            value={screenData.buttonText || ''}
            onChange={(e) => handleChange('buttonText', e.target.value)}
            placeholder="Claim Prize"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            This button text appears on ALL win screens.
          </p>
        </div>
      </div>

      <ButtonStyleSelector
        data={screenData}
        onChange={handleButtonChange}
      />

      <div className="space-y-4">
        <h4 className="font-medium text-white">Animation Options</h4>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={screenData.showConfetti !== false}
            onChange={(e) => handleChange('showConfetti', e.target.checked)}
            className="rounded w-5 h-5 text-teal-600"
          />
          <span className="text-sm text-gray-300">Show confetti animation</span>
        </label>
      </div>

      <div className="bg-charcoal-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Mobile Preview (Default View)</h4>
        <div className="bg-charcoal-800 rounded-lg p-6 border border-white/10 text-center relative overflow-hidden max-w-sm mx-auto">
          {screenData.showConfetti !== false && (
            <div className="absolute top-0 left-0 w-full text-center text-2xl">
              🎉 ✨ 🎊 ✨ 🎉
            </div>
          )}
          <h1 className="text-3xl font-bold text-green-400 mb-4">
            {screenData.headline || 'Congratulations!'}
          </h1>
          {screenData.prizeImage && (
            <img src={screenData.prizeImage} alt="Prize" className="mx-auto mb-4 max-h-32 object-contain" onError={(e) => e.target.style.display = 'none'} />
          )}
          <p className="text-xl text-gray-300 mb-6">
            {(screenData.message || 'You won: {prize}').replace('{prize}', 'Sample Prize')}
          </p>
          <button 
            className="w-full px-6 py-3 rounded-lg font-medium text-lg"
            style={{ 
              backgroundColor: screenData.useCustomButtonColor ? screenData.buttonColor : '#16a34a',
              color: screenData.useCustomButtonColor ? screenData.buttonTextColor : '#ffffff'
            }}
          >
            {screenData.buttonText || 'Claim Prize'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WinScreenEditor;