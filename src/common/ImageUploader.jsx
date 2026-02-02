import React, { useRef, useState } from 'react';
import SafeIcon from './SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiUpload, FiX } = FiIcons;

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

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 500000) {
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
      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>

      {!value ? (
        <div
          className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors"
          style={{
            borderColor: isDragging ? 'var(--brand-primary)' : 'var(--border-color)',
            background: isDragging ? 'var(--glass-bg)' : 'var(--bg-tertiary)'
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
            style={{ background: 'var(--bg-tertiary)' }}
          >
            <SafeIcon icon={FiUpload} className="w-6 h-6" style={{ color: 'var(--icon-secondary)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Click to upload</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>or drag and drop PNG, JPG (max 500KB)</p>
        </div>
      ) : (
        <div
          className="relative rounded-lg p-2"
          style={{ border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)' }}
        >
          <div
            className="aspect-video w-full h-32 relative rounded overflow-hidden mb-2"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--text-tertiary)' }}>Image selected</span>
            <button
              onClick={() => onChange('')}
              className="text-sm font-medium flex items-center space-x-1"
              style={{ color: 'var(--error)' }}
            >
              <SafeIcon icon={FiX} className="w-4 h-4" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs mt-2" style={{ color: 'var(--error)' }}>{error}</p>
      )}

      {helpText && !error && (
        <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>{helpText}</p>
      )}

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      <div className="mt-2">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>URL</span>
          </div>
          <input
            type="text"
            value={value && value.startsWith('data:') ? '' : value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Or paste image URL..."
            className="w-full rounded-md py-1 pl-10 pr-3 text-xs"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default ImageUploader;
