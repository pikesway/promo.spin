import React from 'react';
import BackgroundSelector from '../common/BackgroundSelector';
import ButtonStyleSelector from '../common/ButtonStyleSelector';

const GameScreenEditor = ({ screenData, onChange }) => {
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
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Instructions Text
          </label>
          <input
            type="text"
            value={screenData.instructions || ''}
            onChange={(e) => handleChange('instructions', e.target.value)}
            placeholder="Click the button to spin the wheel!"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Spin Button Text
          </label>
          <input
            type="text"
            value={screenData.spinButtonText || ''}
            onChange={(e) => handleChange('spinButtonText', e.target.value)}
            placeholder="SPIN NOW"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      <ButtonStyleSelector
        data={screenData}
        onChange={handleButtonChange}
      />

      <div className="space-y-4">
        <h4 className="font-medium text-white">Game Options</h4>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={screenData.showSoundToggle || false}
            onChange={(e) => handleChange('showSoundToggle', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Show sound toggle button</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={screenData.showInstructions || true}
            onChange={(e) => handleChange('showInstructions', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Show instructions text</span>
        </label>
      </div>

      <div className="bg-charcoal-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Preview</h4>
        <div className="bg-charcoal-800 rounded-lg p-6 border border-white/10 text-center">
          {screenData.showInstructions !== false && (
            <p className="text-gray-300 mb-6">
              {screenData.instructions || 'Click the button to spin the wheel!'}
            </p>
          )}

          <div className="mb-6">
            <div className="w-48 h-48 bg-charcoal-700 rounded-full mx-auto flex items-center justify-center">
              <span className="text-gray-400">Wheel Preview</span>
            </div>
          </div>
          
          <button 
            className="px-8 py-4 rounded-lg font-bold text-lg"
            style={{ 
              backgroundColor: screenData.useCustomButtonColor ? screenData.buttonColor : '#16a34a', // Default green for spin
              color: screenData.useCustomButtonColor ? screenData.buttonTextColor : '#ffffff'
            }}
          >
            {screenData.spinButtonText || 'SPIN NOW'}
          </button>
          
          {screenData.showSoundToggle && (
            <div className="mt-4">
              <button className="text-gray-500 text-sm">🔊 Sound On</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameScreenEditor;