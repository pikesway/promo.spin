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
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => onLogoChange('upload', null)}
          className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
            logoType === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <FaUpload className="inline mr-2" />
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => onLogoChange('url', logoUrl || '')}
          className={`flex-1 px-4 py-2 rounded-lg text-sm transition-colors ${
            logoType === 'url'
              ? 'bg-blue-600 text-white'
              : 'bg-white/5 text-gray-400 hover:bg-white/10'
          }`}
        >
          <FaImage className="inline mr-2" />
          Use URL
        </button>
      </div>

      {logoType === 'upload' ? (
        <div>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-white/20 bg-white/5 hover:bg-white/10'
            }`}
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
                  className="max-h-32 mx-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={clearLogo}
                  className="absolute top-0 right-0 -mt-2 -mr-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <FaUpload className="mx-auto text-4xl text-gray-400" />
                <div>
                  <p className="text-sm text-gray-300 mb-1">
                    Drag and drop your logo here, or
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-blue-500 hover:text-blue-400 text-sm font-medium"
                  >
                    browse files
                  </button>
                </div>
                <p className="text-xs text-gray-500">
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
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          {preview && preview.startsWith('http') && (
            <div className="mt-4 relative">
              <p className="text-xs text-gray-400 mb-2">Preview:</p>
              <div className="relative inline-block">
                <img
                  src={preview}
                  alt={`${clientName} logo`}
                  className="max-h-32 rounded-lg"
                  onError={() => {
                    setError('Failed to load image from URL');
                    setPreview('');
                  }}
                />
                <button
                  type="button"
                  onClick={clearLogo}
                  className="absolute top-0 right-0 -mt-2 -mr-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
};

export default LogoUploader;
