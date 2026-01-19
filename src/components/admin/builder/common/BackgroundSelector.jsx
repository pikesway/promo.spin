import React from 'react';
import ImageUploader from '../../../../common/ImageUploader';

const BackgroundSelector = ({ data, onChange, includeDefaultOption = false }) => {
  const bgData = data || {};

  const handleChange = (key, value) => {
    onChange({ ...bgData, [key]: value });
  };

  return (
    <div className="space-y-4 border rounded-lg p-4 bg-gray-50/50">
      <h4 className="text-sm font-semibold text-gray-900 border-b pb-2 mb-3">Background Settings</h4>
      
      {/* Type Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {includeDefaultOption && (
          <label className={`flex items-center justify-center p-2 border rounded cursor-pointer text-xs transition-colors ${!bgData.type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
            <input 
              type="radio" 
              name="bgType" 
              checked={!bgData.type} 
              onChange={() => onChange({})} // Clear object to reset to default
              className="hidden"
            />
            <span>Use Global</span>
          </label>
        )}
        <label className={`flex items-center justify-center p-2 border rounded cursor-pointer text-xs transition-colors ${bgData.type === 'color' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input 
            type="radio" 
            name="bgType" 
            checked={bgData.type === 'color'} 
            onChange={() => handleChange('type', 'color')}
            className="hidden"
          />
          <span>Solid Color</span>
        </label>
        <label className={`flex items-center justify-center p-2 border rounded cursor-pointer text-xs transition-colors ${bgData.type === 'gradient' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input 
            type="radio" 
            name="bgType" 
            checked={bgData.type === 'gradient'} 
            onChange={() => handleChange('type', 'gradient')}
            className="hidden"
          />
          <span>Gradient</span>
        </label>
        <label className={`flex items-center justify-center p-2 border rounded cursor-pointer text-xs transition-colors ${bgData.type === 'image' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:bg-gray-50'}`}>
          <input 
            type="radio" 
            name="bgType" 
            checked={bgData.type === 'image'} 
            onChange={() => handleChange('type', 'image')}
            className="hidden"
          />
          <span>Image</span>
        </label>
      </div>

      {/* Settings based on Type */}
      {bgData.type === 'color' && (
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
          <div className="flex items-center space-x-2">
            <input 
              type="color" 
              value={bgData.color || '#f3f4f6'}
              onChange={(e) => handleChange('color', e.target.value)}
              className="h-8 w-16 border border-gray-300 rounded cursor-pointer p-0.5"
            />
            <span className="text-xs text-gray-500">{bgData.color || '#f3f4f6'}</span>
          </div>
        </div>
      )}

      {bgData.type === 'gradient' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Color</label>
            <input 
              type="color" 
              value={bgData.gradientStart || '#3b82f6'}
              onChange={(e) => handleChange('gradientStart', e.target.value)}
              className="w-full h-8 border border-gray-300 rounded cursor-pointer p-0.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Color</label>
            <input 
              type="color" 
              value={bgData.gradientEnd || '#1d4ed8'}
              onChange={(e) => handleChange('gradientEnd', e.target.value)}
              className="w-full h-8 border border-gray-300 rounded cursor-pointer p-0.5"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Direction</label>
            <select 
              value={bgData.gradientDirection || 'to bottom'}
              onChange={(e) => handleChange('gradientDirection', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs"
            >
              <option value="to bottom">Top to Bottom</option>
              <option value="to right">Left to Right</option>
              <option value="to bottom right">Diagonal</option>
              <option value="radial">Radial (Center)</option>
            </select>
          </div>
        </div>
      )}

      {bgData.type === 'image' && (
        <div className="space-y-3">
          <ImageUploader 
            label="Upload Image" 
            value={bgData.image || ''} 
            onChange={(val) => handleChange('image', val)} 
          />
          
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Image Scaling</label>
            <select 
              value={bgData.imageScale || 'cover'}
              onChange={(e) => handleChange('imageScale', e.target.value)}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs font-medium bg-white"
            >
              <option value="cover">Cover (Crops to Fill Screen) - Default</option>
              <option value="auto 100%">Fit Height (Show Full Height)</option>
              <option value="contain">Contain (Show Entire Image)</option>
              <option value="100% 100%">Stretch (Distort to Fill)</option>
            </select>
            <p className="text-[10px] text-blue-600 mt-1 bg-blue-50 p-1.5 rounded">
              <strong>Tip:</strong> Select "Fit Height" or "Contain" to ensure the top and bottom of your image are visible on all screens.
            </p>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Background Fill Color</label>
            <div className="flex items-center space-x-2">
              <input 
                type="color" 
                value={bgData.color || '#000000'}
                onChange={(e) => handleChange('color', e.target.value)}
                className="h-8 w-16 border border-gray-300 rounded cursor-pointer p-0.5"
              />
              <span className="text-xs text-gray-500">Fills empty space if image doesn't cover screen</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Blur: {bgData.blur || 0}px</label>
              <input 
                type="range" 
                min="0" 
                max="20" 
                value={bgData.blur || 0} 
                onChange={(e) => handleChange('blur', parseInt(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Overlay: {Math.round((bgData.overlay || 0) * 100)}%</label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1"
                value={bgData.overlay || 0} 
                onChange={(e) => handleChange('overlay', parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Overlay Color</label>
              <div className="flex items-center space-x-2">
                <input 
                  type="color" 
                  value={bgData.overlayColor || '#000000'}
                  onChange={(e) => handleChange('overlayColor', e.target.value)}
                  className="h-6 w-12 border border-gray-300 rounded cursor-pointer p-0.5"
                />
                <span className="text-xs text-gray-500">Tint Color</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BackgroundSelector;