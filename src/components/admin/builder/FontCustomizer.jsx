import React from 'react';

const FontCustomizer = ({ gameData, onChange }) => {
  const fontData = gameData.visual?.fonts || {};

  const handleFontChange = (key, value) => {
    onChange({
      ...gameData,
      visual: {
        ...gameData.visual,
        fonts: {
          ...fontData,
          [key]: value
        }
      }
    });
  };

  const googleFonts = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Oswald', 'Source Sans Pro',
    'Raleway', 'PT Sans', 'Lora', 'Nunito', 'Ubuntu', 'Playfair Display', 'Merriweather',
    'Poppins', 'Dancing Script', 'Pacifico', 'Lobster', 'Righteous', 'Bangers'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Typography Settings</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Font (Headings)
            </label>
            <select
              value={fontData.primary || 'Inter'}
              onChange={(e) => handleFontChange('primary', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {googleFonts.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Secondary Font (Body Text)
            </label>
            <select
              value={fontData.secondary || 'Inter'}
              onChange={(e) => handleFontChange('secondary', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {googleFonts.map(font => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Font Preview</h4>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">Primary Font (Headings):</p>
            <h2 
              className="text-2xl font-bold text-gray-900"
              style={{ fontFamily: fontData.primary || 'Inter' }}
            >
              Spin to Win Amazing Prizes!
            </h2>
          </div>
          
          <div>
            <p className="text-sm text-gray-600 mb-2">Secondary Font (Body Text):</p>
            <p 
              className="text-base text-gray-700"
              style={{ fontFamily: fontData.secondary || 'Inter' }}
            >
              Click the spin button below to try your luck and win exciting rewards. Good luck!
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Font Loading</h4>
        <p className="text-sm text-blue-700">
          Google Fonts are automatically loaded when your game is displayed. Custom fonts can be added by uploading font files to your hosting provider.
        </p>
      </div>
    </div>
  );
};

export default FontCustomizer;