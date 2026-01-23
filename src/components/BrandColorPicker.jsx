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
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-white mb-1">
            {label}
          </label>
          {description && (
            <p className="text-xs text-gray-400">{description}</p>
          )}
        </div>
        <div
          className="w-12 h-12 md:w-14 md:h-14 rounded-lg border-2 border-white/20 shadow-lg flex-shrink-0"
          style={{ backgroundColor: validateHexColor(inputValue) ? inputValue : '#666666' }}
        />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="#6366F1"
          className="flex-1 px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 font-mono text-sm"
        />
        <div className="relative">
          <input
            type="color"
            value={validateHexColor(inputValue) ? inputValue : '#6366F1'}
            onChange={(e) => handleChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="w-12 h-12 md:w-14 rounded-lg border border-white/10 cursor-pointer flex items-center justify-center bg-zinc-800"
            style={{ backgroundColor: validateHexColor(inputValue) ? inputValue : '#666666' }}
          >
            <svg className="w-5 h-5 text-white/80 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
};

export default BrandColorPicker;
