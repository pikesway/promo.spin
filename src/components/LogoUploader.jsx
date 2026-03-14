import { useState, useRef } from 'react';
import { FaUpload, FaImage, FaTimes } from 'react-icons/fa';
import { validateImageFile } from '../utils/storageHelpers';

const LogoUploader = ({ logoType, logoUrl, onLogoChange, clientName = 'Client' }) => {
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState(logoUrl);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFile = (file) => {
    const validation = validateImageFile(file);

    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    onLogoChange('upload', file);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleUrlChange = (url) => {
    setPreview(url);
    setError('');
    onLogoChange('url', url);
  };

  const clearLogo = () => {
    setPreview('');
    setError('');
    onLogoChange(logoType, '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onLogoChange('upload', null)}
          className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            background: logoType === 'upload' ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
            color: logoType === 'upload' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <FaUpload className="w-4 h-4" />
          <span>Upload</span>
        </button>
        <button
          type="button"
          onClick={() => onLogoChange('url', logoUrl || '')}
          className="flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          style={{
            background: logoType === 'url' ? 'var(--brand-primary)' : 'var(--bg-tertiary)',
            color: logoType === 'url' ? '#fff' : 'var(--text-secondary)'
          }}
        >
          <FaImage className="w-4 h-4" />
          <span>Use URL</span>
        </button>
      </div>

      {logoType === 'upload' ? (
        <div>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !preview && fileInputRef.current?.click()}
            className="relative border-2 border-dashed rounded-xl p-6 md:p-8 text-center transition-colors cursor-pointer"
            style={{
              borderColor: dragActive ? 'var(--brand-primary)' : 'var(--border-color)',
              background: dragActive ? 'var(--glass-bg)' : 'var(--bg-tertiary)'
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleChange}
              accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
              className="hidden"
            />

            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt={`${clientName} logo`}
                  className="max-h-28 md:max-h-32 mx-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLogo();
                  }}
                  className="absolute -top-2 -right-2 p-2.5 rounded-full text-white transition-colors shadow-lg"
                  style={{ background: 'var(--error)' }}
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="w-14 h-14 md:w-16 md:h-16 mx-auto rounded-full flex items-center justify-center"
                  style={{ background: 'var(--bg-secondary)' }}
                >
                  <FaUpload className="w-6 h-6 md:w-7 md:h-7" style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                    <span className="hidden md:inline">Drag and drop your logo here, or </span>
                    <span style={{ color: 'var(--brand-primary)', fontWeight: 500 }}>tap to upload</span>
                  </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  PNG, JPEG, SVG, or WebP (max 2MB)
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={logoUrl || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://example.com/logo.png"
            className="input"
          />
          {preview && preview.startsWith('http') && (
            <div className="mt-4 relative">
              <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>Preview:</p>
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt={`${clientName} logo`}
                  className="max-h-28 md:max-h-32 rounded-lg"
                  onError={() => {
                    setError('Failed to load image from URL');
                    setPreview('');
                  }}
                />
                <button
                  type="button"
                  onClick={clearLogo}
                  className="absolute -top-2 -right-2 p-2.5 rounded-full text-white transition-colors shadow-lg"
                  style={{ background: 'var(--error)' }}
                >
                  <FaTimes className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg" style={{ background: 'var(--error-bg)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <p className="text-sm" style={{ color: 'var(--error)' }}>{error}</p>
        </div>
      )}
    </div>
  );
};

export default LogoUploader;