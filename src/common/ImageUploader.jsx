import React, { useRef, useState } from 'react';
import SafeIcon from './SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiUpload, FiImage, FiX } = FiIcons;

const ImageUploader = ({ label, value, onChange, helpText }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    processFile(file);
  };

  const processFile = (file) => {
    setError('');
    if (!file) return;

    // Simple validation
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 500000) { // 500KB limit for localStorage safety
      setError('Image too large. Please use an image under 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      onChange(e.target.result);
    };
    reader.onerror = () => {
      setError('Error reading file');
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    processFile(file);
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      
      {!value ? (
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <SafeIcon icon={FiUpload} className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900">Click to upload</p>
          <p className="text-xs text-gray-500 mt-1">or drag and drop PNG, JPG (max 500KB)</p>
        </div>
      ) : (
        <div className="relative border border-gray-200 rounded-lg p-2 bg-gray-50">
          <div className="aspect-video w-full h-32 relative rounded overflow-hidden bg-gray-200 mb-2">
            <img 
              src={value} 
              alt="Preview" 
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate max-w-[200px]">Image selected</span>
            <button
              onClick={() => onChange('')}
              className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center space-x-1"
            >
              <SafeIcon icon={FiX} className="w-4 h-4" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
      
      {helpText && !error && (
        <p className="text-xs text-gray-500 mt-2">{helpText}</p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      
      {/* Fallback URL input for external images */}
      <div className="mt-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-gray-400 text-xs">URL</span>
          </div>
          <input
            type="text"
            value={value && value.startsWith('data:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste image URL..."
            className="w-full border border-gray-300 rounded-md py-1 pl-10 pr-3 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;