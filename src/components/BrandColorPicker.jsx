import { useState } from 'react';
import { validateHexColor } from '../utils/brandingHelpers';

const BrandColorPicker = ({ label, value, onChange, description }) => {
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState('');

  const handleChange = (newValue) => {
    setInputValue(newValue);

    if (validateHexColor(newValue)) {
      setError('');
      onChange(newValue);
    } else if (newValue === '') {
      setError('');
      onChange('');
    } else {
      setError('Invalid hex color format');
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            {label}
          </label>
          {description && (
            <p className="text-xs text-gray-400">{description}</p>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-lg border-2 border-white/20 shadow-lg"
          style={{ backgroundColor: validateHexColor(inputValue) ? inputValue : '#666666' }}
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="#6366F1"
          className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
        <input
          type="color"
          value={validateHexColor(inputValue) ? inputValue : '#6366F1'}
          onChange={(e) => handleChange(e.target.value)}
          className="w-14 h-10 rounded-lg cursor-pointer border border-white/10"
          style={{
            backgroundColor: 'transparent'
          }}
        />
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};

export default BrandColorPicker;
