import React from 'react';
import ButtonStyleSelector from '../common/ButtonStyleSelector';

const RedemptionSettings = ({ screenData, onChange }) => {
  const handleChange = (key, value) => {
    onChange({ ...screenData, [key]: value });
  };

  const handleButtonChange = (updates) => {
    onChange({ ...screenData, ...updates });
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-medium text-yellow-900 mb-2">How Redemption Works</h4>
        <p className="text-sm text-yellow-800">
          When enabled, winners will receive a digital coupon instead of just a static win screen. They must show this coupon to a staff member to redeem their prize. Ideally used for physical locations (restaurants, retail).
        </p>
      </div>

      <div>
        <label className="flex items-center space-x-3 mb-6">
          <input 
            type="checkbox" 
            checked={screenData.enabled || false} 
            onChange={(e) => handleChange('enabled', e.target.checked)}
            className="rounded w-5 h-5 text-blue-600"
          />
          <div>
            <span className="font-medium text-gray-900">Enable Coupon Redemption System</span>
            <p className="text-xs text-gray-500">Adds a redemption step after the win screen</p>
          </div>
        </label>
      </div>

      {screenData.enabled && (
        <div className="space-y-6 border-t border-gray-200 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expiration Time (Minutes)
              </label>
              <input 
                type="number" 
                value={screenData.expirationMinutes || 60} 
                onChange={(e) => handleChange('expirationMinutes', parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long the coupon remains valid after winning. Set 0 for no expiration.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Text
              </label>
              <input 
                type="text" 
                value={screenData.buttonText || 'Redeem Now'} 
                onChange={(e) => handleChange('buttonText', e.target.value)}
                placeholder="Redeem Now"
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions for User
              </label>
              <textarea 
                value={screenData.instructions || ''} 
                onChange={(e) => handleChange('instructions', e.target.value)}
                placeholder="Show this screen to a staff member to redeem your prize."
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <ButtonStyleSelector 
            data={screenData} 
            onChange={handleButtonChange} 
          />

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Preview</h4>
            <div className="bg-white rounded-lg border border-gray-200 max-w-sm mx-auto overflow-hidden">
              <div className="bg-blue-600 py-3 text-center text-white font-bold uppercase text-sm">Valid Coupon</div>
              <div className="p-6 text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Sample Prize</h3>
                <div className="bg-gray-100 inline-block px-2 py-1 rounded text-xs font-mono mb-6">#ABC123</div>
                
                <p className="text-sm text-gray-600 mb-4">{screenData.instructions || "Show this screen to a staff member."}</p>
                
                <button 
                  className="w-full py-3 rounded-lg font-bold"
                  style={{ 
                    backgroundColor: screenData.useCustomButtonColor ? screenData.buttonColor : '#2563eb',
                    color: screenData.useCustomButtonColor ? screenData.buttonTextColor : '#ffffff'
                  }}
                >
                  {screenData.buttonText || 'Redeem Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedemptionSettings;