import React from 'react';
import ImageUploader from '../../../../common/ImageUploader';
import BackgroundSelector from '../common/BackgroundSelector';
import ButtonStyleSelector from '../common/ButtonStyleSelector';

const LoseScreenEditor = ({ screenData, onChange }) => {
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <ImageUploader
            label="Consolation Image"
            value={screenData.consolationImage || ''}
            onChange={(val) => handleChange('consolationImage', val)}
            helpText="Optional image to show when user loses."
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Lose Headline
          </label>
          <input
            type="text"
            value={screenData.headline || ''}
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Better Luck Next Time!"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Lose Message
          </label>
          <input
            type="text"
            value={screenData.message || ''}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="Thanks for playing!"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Action Button Text
          </label>
          <input
            type="text"
            value={screenData.buttonText || ''}
            onChange={(e) => handleChange('buttonText', e.target.value)}
            placeholder="Try Again"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      <ButtonStyleSelector
        data={screenData}
        onChange={handleButtonChange}
      />

      <div className="space-y-4">
        <h4 className="font-medium text-white">Retry Options</h4>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={screenData.allowRetry || false}
            onChange={(e) => handleChange('allowRetry', e.target.checked)}
            className="rounded w-5 h-5 text-teal-600"
          />
          <span className="text-sm text-gray-300">Allow players to try again</span>
        </label>
      </div>
    </div>
  );
};

export default LoseScreenEditor;