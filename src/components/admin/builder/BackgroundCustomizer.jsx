import React from 'react';
import BackgroundSelector from './common/BackgroundSelector';

const BackgroundCustomizer = ({ gameData, onChange }) => {
  const backgroundData = gameData.visual?.background || { type: 'color', color: '#f3f4f6' };

  const handleBackgroundChange = (newBgData) => {
    onChange({
      ...gameData,
      visual: {
        ...gameData.visual,
        background: newBgData
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Global Background</h3>
        <p className="text-sm text-gray-500 mb-6">
          This background will be used for all screens unless overridden on specific screen settings.
        </p>
        <BackgroundSelector 
          data={backgroundData} 
          onChange={handleBackgroundChange} 
          includeDefaultOption={false} 
        />
      </div>
    </div>
  );
};

export default BackgroundCustomizer;