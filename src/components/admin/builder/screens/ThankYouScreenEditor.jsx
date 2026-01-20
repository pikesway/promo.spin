import React from 'react';
import BackgroundSelector from '../common/BackgroundSelector';
import ButtonStyleSelector from '../common/ButtonStyleSelector';

const ThankYouScreenEditor = ({ screenData, onChange }) => {
  const handleChange = (key, value) => {
    onChange({ ...screenData, [key]: value });
  };

  const handleButtonChange = (updates) => {
    onChange({ ...screenData, ...updates });
  };

  return (
    <div className="space-y-6">
      <BackgroundSelector 
        data={screenData.background} 
        onChange={(val) => handleChange('background', val)}
        includeDefaultOption={true}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Thank You Headline
          </label>
          <input
            type="text"
            value={screenData.headline || ''}
            onChange={(e) => handleChange('headline', e.target.value)}
            placeholder="Thank You!"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Action Button Text
          </label>
          <input
            type="text"
            value={screenData.buttonText || ''}
            onChange={(e) => handleChange('buttonText', e.target.value)}
            placeholder="Visit Website"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Thank You Message
          </label>
          <textarea
            value={screenData.message || ''}
            onChange={(e) => handleChange('message', e.target.value)}
            placeholder="Your information has been submitted successfully."
            rows={3}
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            External Link (Optional)
          </label>
          <input
            type="url"
            value={screenData.externalLink || ''}
            onChange={(e) => handleChange('externalLink', e.target.value)}
            placeholder="https://example.com"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-300 mb-2">
            Coupon Code (Optional)
          </label>
          <input
            type="text"
            value={screenData.couponCode || ''}
            onChange={(e) => handleChange('couponCode', e.target.value)}
            placeholder="SAVE10"
            className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
        </div>
      </div>

      <ButtonStyleSelector
        data={screenData}
        onChange={handleButtonChange}
      />

      <div className="space-y-4">
        <h4 className="font-medium text-white">Additional Options</h4>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={screenData.showQR || false}
            onChange={(e) => handleChange('showQR', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Show QR code for external link</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={screenData.showSocialShare || false}
            onChange={(e) => handleChange('showSocialShare', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Show social media sharing buttons</span>
        </label>

        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={screenData.autoRedirect || false}
            onChange={(e) => handleChange('autoRedirect', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-gray-300">Auto-redirect to external link</span>
        </label>

        {screenData.autoRedirect && (
          <div className="ml-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Redirect Delay (seconds)
            </label>
            <input
              type="number"
              value={screenData.redirectDelay || 5}
              onChange={(e) => handleChange('redirectDelay', parseInt(e.target.value))}
              min="1"
              max="30"
              className="w-32 bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white"
            />
          </div>
        )}
      </div>

      <div className="bg-charcoal-800 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Preview</h4>
        <div className="bg-charcoal-800 rounded-lg p-6 border border-white/10 text-center">
          <h1 className="text-3xl font-bold text-green-400 mb-4">
            {screenData.headline || 'Thank You!'}
          </h1>
          <p className="text-gray-300 mb-6">
            {screenData.message || 'Your information has been submitted successfully.'}
          </p>

          {screenData.couponCode && (
            <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Use this coupon code:</p>
              <p className="text-2xl font-bold text-yellow-700">{screenData.couponCode}</p>
            </div>
          )}
          
          {screenData.showQR && screenData.externalLink && (
            <div className="mb-6">
              <div className="w-32 h-32 bg-gray-200 mx-auto rounded-lg flex items-center justify-center">
                <span className="text-gray-500 text-xs">QR Code</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">Scan to visit website</p>
            </div>
          )}

          <button 
            className="px-6 py-3 rounded-lg font-medium mb-4"
            style={{ 
              backgroundColor: screenData.useCustomButtonColor ? screenData.buttonColor : '#2563eb',
              color: screenData.useCustomButtonColor ? screenData.buttonTextColor : '#ffffff'
            }}
          >
            {screenData.buttonText || 'Visit Website'}
          </button>

          {screenData.showSocialShare && (
            <div className="flex justify-center space-x-4 text-gray-400">
              <span>📘</span>
              <span>🐦</span>
              <span>📷</span>
              <span>💼</span>
            </div>
          )}

          {screenData.autoRedirect && (
            <p className="text-sm text-gray-500 mt-4">
              Redirecting in {screenData.redirectDelay || 5} seconds...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThankYouScreenEditor;