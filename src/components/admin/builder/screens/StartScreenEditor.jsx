import React from 'react';
import ImageUploader from '../../../../common/ImageUploader';
import BackgroundSelector from '../common/BackgroundSelector';
import ButtonStyleSelector from '../common/ButtonStyleSelector';

const StartScreenEditor = ({ screenData, onChange }) => {
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
            label="Brand Logo" 
            value={screenData.logo || ''} 
            onChange={(val) => handleChange('logo', val)}
            helpText="Upload your company logo (transparent PNG recommended)."
          />
        </div>
        
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Headline Text
          </label>
          <input 
            type="text" 
            value={screenData.headline || ''} 
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Spin to Win!"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subheading Text
          </label>
          <input 
            type="text" 
            value={screenData.subheading || ''} 
            onChange={(e) => handleChange('subheading', e.target.value)}
            placeholder="Try your luck and win amazing prizes"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Button Text
          </label>
          <input 
            type="text" 
            value={screenData.buttonText || ''} 
            onChange={(e) => handleChange('buttonText', e.target.value)}
            placeholder="Start Game"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <ButtonStyleSelector 
        data={screenData} 
        onChange={handleButtonChange} 
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rules Text (Optional)
        </label>
        <textarea 
          value={screenData.rulesText || ''} 
          onChange={(e) => handleChange('rulesText', e.target.value)}
          placeholder="Enter game rules or additional information..."
          rows={4}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
        <div className="bg-white rounded-lg p-6 border border-gray-200 text-center max-w-sm mx-auto">
          {screenData.logo && (
            <img src={screenData.logo} alt="Logo" className="mx-auto mb-4 max-h-16 object-contain" onError={(e) => e.target.style.display = 'none'} />
          )}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {screenData.headline || 'Spin to Win!'}
          </h1>
          <p className="text-gray-600 mb-6">
            {screenData.subheading || 'Try your luck and win amazing prizes'}
          </p>
          <button 
            className="w-full px-6 py-3 rounded-lg font-medium"
            style={{ 
              backgroundColor: screenData.useCustomButtonColor ? screenData.buttonColor : '#2563eb',
              color: screenData.useCustomButtonColor ? screenData.buttonTextColor : '#ffffff'
            }}
          >
            {screenData.buttonText || 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreenEditor;