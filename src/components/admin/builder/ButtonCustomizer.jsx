import React from 'react';

const ButtonCustomizer = ({ gameData, onChange }) => {
  const buttonData = gameData.visual?.buttons || { backgroundColor: '#2563eb', textColor: '#ffffff' };

  const handleChange = (key, value) => {
    onChange({
      ...gameData,
      visual: {
        ...gameData.visual,
        buttons: {
          ...buttonData,
          [key]: value
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Global Button Styles</h3>
        <p className="text-sm text-gray-500 mb-6">
          These styles will be used for all buttons in the game unless overridden on specific screens.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
             <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={buttonData.backgroundColor}
                onChange={(e) => handleChange('backgroundColor', e.target.value)}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer p-1"
              />
              <span className="text-sm text-gray-600 uppercase">{buttonData.backgroundColor}</span>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Text Color</label>
             <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={buttonData.textColor}
                onChange={(e) => handleChange('textColor', e.target.value)}
                className="h-10 w-20 border border-gray-300 rounded cursor-pointer p-1"
              />
              <span className="text-sm text-gray-600 uppercase">{buttonData.textColor}</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
           <h4 className="text-sm font-medium text-gray-700 mb-4">Preview</h4>
           <div className="flex justify-center p-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
             <button 
               className="px-8 py-3 rounded-lg font-medium shadow-md transition-all transform hover:-translate-y-0.5"
               style={{ 
                 backgroundColor: buttonData.backgroundColor, 
                 color: buttonData.textColor 
               }}
             >
               Sample Button
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ButtonCustomizer;