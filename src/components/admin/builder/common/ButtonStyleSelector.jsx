import React from 'react';

const ButtonStyleSelector = ({ data, onChange }) => {
  const isCustom = data.useCustomButtonColor || false;

  const handleToggle = (checked) => {
    onChange({ ...data, useCustomButtonColor: checked });
  };

  const handleColorChange = (key, value) => {
    onChange({ ...data, [key]: value });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
      <div className="flex items-center justify-between">
         <h4 className="text-sm font-semibold text-gray-900">Button Style</h4>
         <label className="flex items-center space-x-2 text-sm text-gray-600 cursor-pointer">
           <input 
             type="checkbox" 
             checked={isCustom} 
             onChange={(e) => handleToggle(e.target.checked)}
             className="rounded text-blue-600 focus:ring-blue-500"
           />
           <span>Override Global Colors</span>
         </label>
      </div>

      {isCustom && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Background</label>
            <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={data.buttonColor || '#2563eb'}
                onChange={(e) => handleColorChange('buttonColor', e.target.value)}
                className="h-8 w-full border border-gray-300 rounded cursor-pointer p-0.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Text Color</label>
            <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={data.buttonTextColor || '#ffffff'}
                onChange={(e) => handleColorChange('buttonTextColor', e.target.value)}
                className="h-8 w-full border border-gray-300 rounded cursor-pointer p-0.5"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ButtonStyleSelector;