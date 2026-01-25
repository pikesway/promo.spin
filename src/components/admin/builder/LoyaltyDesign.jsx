import React, { useState, useRef } from 'react';
import { LOYALTY_ICONS } from '../../../constants/loyaltyIcons';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';

const LoyaltyDesign = ({ loyaltyData, onChange, client }) => {
  const [activeSection, setActiveSection] = useState('colors');
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = useRef(null);

  const handleCardChange = (key, value) => {
    onChange({
      card: { ...loyaltyData.card, [key]: value }
    });
  };

  const handleCustomIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, GIF, SVG, or ICO file');
      return;
    }

    if (file.size > 500 * 1024) {
      alert('File size must be less than 500KB');
      return;
    }

    setUploadingIcon(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleCardChange('customIconUrl', reader.result);
        handleCardChange('stampIcon', 'custom');
        setUploadingIcon(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading icon:', error);
      alert('Failed to upload icon');
      setUploadingIcon(false);
    }
  };

  const clearCustomIcon = () => {
    handleCardChange('customIconUrl', '');
    handleCardChange('stampIcon', 'star');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isCustomIconSelected = loyaltyData.card.stampIcon === 'custom';

  const sections = [
    { id: 'colors', label: 'Colors' },
    { id: 'stamps', label: 'Stamp Icons' },
    { id: 'layout', label: 'Layout' },
  ];

  const presetColors = [
    '#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
  ];

  return (
    <div className="space-y-6">
      <div className="bg-charcoal-800 rounded-lg border border-white/10">
        <div className="border-b border-white/10 overflow-x-auto">
          <nav className="flex space-x-8 px-6 min-w-max">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-rose-500 text-rose-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeSection === 'colors' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-base font-medium text-white mb-4">Card Primary Color</h3>
                <p className="text-sm text-gray-400 mb-4">
                  This color will be used for the card header and accent elements.
                </p>
                <div className="flex flex-wrap gap-3 mb-4">
                  {presetColors.map(color => (
                    <button
                      key={color}
                      onClick={() => handleCardChange('primaryColor', color)}
                      className={`w-10 h-10 rounded-lg transition-all ${
                        loyaltyData.card.primaryColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-800'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-300">Custom:</label>
                  <input
                    type="color"
                    value={loyaltyData.card.primaryColor}
                    onChange={(e) => handleCardChange('primaryColor', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={loyaltyData.card.primaryColor}
                    onChange={(e) => handleCardChange('primaryColor', e.target.value)}
                    className="w-28 bg-charcoal-900 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-medium text-white mb-4">Background Color</h3>
                <p className="text-sm text-gray-400 mb-4">
                  The page background color behind the loyalty card.
                </p>
                <div className="flex flex-wrap gap-3 mb-4">
                  {['#18181B', '#1F2937', '#0F172A', '#1E1E1E', '#0A0A0A'].map(color => (
                    <button
                      key={color}
                      onClick={() => handleCardChange('backgroundColor', color)}
                      className={`w-10 h-10 rounded-lg border border-white/20 transition-all ${
                        loyaltyData.card.backgroundColor === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-800'
                          : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-300">Custom:</label>
                  <input
                    type="color"
                    value={loyaltyData.card.backgroundColor}
                    onChange={(e) => handleCardChange('backgroundColor', e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border-0"
                  />
                  <input
                    type="text"
                    value={loyaltyData.card.backgroundColor}
                    onChange={(e) => handleCardChange('backgroundColor', e.target.value)}
                    className="w-28 bg-charcoal-900 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-medium text-white mb-4">Stamp Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Filled Stamp Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={loyaltyData.card.stampFilledColor}
                        onChange={(e) => handleCardChange('stampFilledColor', e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={loyaltyData.card.stampFilledColor}
                        onChange={(e) => handleCardChange('stampFilledColor', e.target.value)}
                        className="w-28 bg-charcoal-900 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Empty Stamp Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={loyaltyData.card.stampEmptyColor}
                        onChange={(e) => handleCardChange('stampEmptyColor', e.target.value)}
                        placeholder="rgba(255,255,255,0.2)"
                        className="flex-1 bg-charcoal-900 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Supports rgba for transparency</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'stamps' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-white mb-4">Stamp Icon</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Choose the icon that appears when a stamp is collected, or upload your own.
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                  {LOYALTY_ICONS.map(iconData => {
                    const IconComponent = iconData.icon;
                    const isSelected = loyaltyData.card.stampIcon === iconData.id;
                    return (
                      <button
                        key={iconData.id}
                        onClick={() => handleCardChange('stampIcon', iconData.id)}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-1 transition-all ${
                          isSelected
                            ? 'bg-rose-500/20 border-2 border-rose-500'
                            : 'bg-charcoal-900 border border-white/10 hover:border-white/30'
                        }`}
                      >
                        <IconComponent
                          className="w-6 h-6"
                          style={{ color: isSelected ? loyaltyData.card.stampFilledColor : iconData.color }}
                        />
                        <span className="text-[10px] text-gray-400">{iconData.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/10 pt-6">
                <h3 className="text-base font-medium text-white mb-4">Custom Icon</h3>
                <p className="text-sm text-gray-400 mb-4">
                  Upload your own logo or icon image (PNG, JPG, SVG, ICO - max 500KB)
                </p>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".png,.jpg,.jpeg,.gif,.svg,.ico"
                  onChange={handleCustomIconUpload}
                  className="hidden"
                />

                {loyaltyData.card.customIconUrl ? (
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleCardChange('stampIcon', 'custom')}
                      className={`w-20 h-20 rounded-lg flex items-center justify-center transition-all ${
                        isCustomIconSelected
                          ? 'bg-rose-500/20 border-2 border-rose-500'
                          : 'bg-charcoal-900 border border-white/10 hover:border-white/30'
                      }`}
                    >
                      <img
                        src={loyaltyData.card.customIconUrl}
                        alt="Custom icon"
                        className="w-12 h-12 object-contain"
                      />
                    </button>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <FiUpload className="w-4 h-4" />
                        Replace
                      </button>
                      <button
                        onClick={clearCustomIcon}
                        className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <FiX className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingIcon}
                    className="w-full p-4 border-2 border-dashed border-white/20 rounded-lg hover:border-rose-500/50 transition-colors flex flex-col items-center gap-2"
                  >
                    {uploadingIcon ? (
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <FiImage className="w-8 h-8 text-gray-400" />
                        <span className="text-sm text-gray-400">Click to upload custom icon</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="p-4 bg-charcoal-900 rounded-lg border border-white/10">
                <h4 className="text-sm font-medium text-white mb-3">Preview</h4>
                <div
                  className="rounded-lg p-4"
                  style={{ backgroundColor: loyaltyData.card.primaryColor }}
                >
                  <div className="flex gap-2 justify-center flex-wrap">
                    {Array.from({ length: Math.min(loyaltyData.threshold, 10) }).map((_, index) => {
                      const isFilled = index < Math.floor(loyaltyData.threshold / 2);
                      const iconData = LOYALTY_ICONS.find(i => i.id === loyaltyData.card.stampIcon) || LOYALTY_ICONS[0];
                      const useCustomIcon = isCustomIconSelected && loyaltyData.card.customIconUrl;
                      const IconComponent = iconData?.icon;
                      return (
                        <div
                          key={index}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isFilled ? 'bg-white shadow-lg' : 'border-2'
                          }`}
                          style={{
                            borderColor: !isFilled ? loyaltyData.card.stampEmptyColor : 'transparent',
                            backgroundColor: isFilled ? loyaltyData.card.stampFilledColor : 'transparent'
                          }}
                        >
                          {isFilled && (
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: useCustomIcon ? 'transparent' : loyaltyData.card.primaryColor }}
                            >
                              {useCustomIcon ? (
                                <img
                                  src={loyaltyData.card.customIconUrl}
                                  alt=""
                                  className="w-5 h-5 object-contain"
                                />
                              ) : (
                                IconComponent && <IconComponent className="text-white" size={14} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'layout' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-medium text-white mb-4">Stamp Layout</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleCardChange('layout', 'grid')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      loyaltyData.card.layout === 'grid'
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="grid grid-cols-5 gap-1 mb-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="w-4 h-4 rounded-full bg-white/30" />
                      ))}
                    </div>
                    <span className="text-sm text-white">Grid Layout</span>
                    <p className="text-xs text-gray-400 mt-1">5 stamps per row</p>
                  </button>

                  <button
                    onClick={() => handleCardChange('layout', 'inline')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      loyaltyData.card.layout === 'inline'
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-white/10 hover:border-white/30'
                    }`}
                  >
                    <div className="flex gap-1 mb-2 overflow-hidden">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="w-4 h-4 rounded-full bg-white/30 flex-shrink-0" />
                      ))}
                    </div>
                    <span className="text-sm text-white">Inline Layout</span>
                    <p className="text-xs text-gray-400 mt-1">Single scrollable row</p>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-base font-medium text-white mb-4">Card Elements</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyData.card.showLogo}
                      onChange={(e) => handleCardChange('showLogo', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm text-gray-300">Show business logo on card</span>
                  </label>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={loyaltyData.card.showQR}
                      onChange={(e) => handleCardChange('showQR', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 text-rose-500 focus:ring-rose-500"
                    />
                    <span className="text-sm text-gray-300">Show QR code on card</span>
                  </label>
                </div>
              </div>

              {client?.logo_url && (
                <div className="p-4 bg-charcoal-900 rounded-lg border border-white/10">
                  <h4 className="text-sm font-medium text-white mb-3">Current Logo</h4>
                  <img
                    src={client.logo_url}
                    alt={client.name}
                    className="h-12 object-contain"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    Update the logo in Client Branding settings.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoyaltyDesign;
