import React, { useState, useRef } from 'react';
import { FiCheck, FiGift, FiRefreshCw, FiSmartphone, FiMonitor, FiCopy, FiDownload } from 'react-icons/fi';
import { QRCodeCanvas } from 'qrcode.react';
import { LOYALTY_ICONS, getIconById } from '../../../constants/loyaltyIcons';

const LoyaltyPreview = ({ loyaltyData, client, loyaltyUrl }) => {
  const [previewMode, setPreviewMode] = useState('mobile');
  const [simulatedProgress, setSimulatedProgress] = useState(Math.floor(loyaltyData.threshold / 2));
  const qrRef = useRef();

  const threshold = loyaltyData.threshold;
  const rewardUnlocked = simulatedProgress >= threshold;
  const stampsRemaining = threshold - simulatedProgress;

  const useCustomIcon = loyaltyData.card.stampIcon === 'custom' && loyaltyData.card.customIconUrl;
  const iconData = getIconById(loyaltyData.card.stampIcon) || LOYALTY_ICONS[0];
  const IconComponent = iconData?.icon;

  const downloadQRCode = () => {
    const canvas = qrRef.current.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `loyalty-qr-${loyaltyData.id}.png`;
      a.click();
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(loyaltyUrl);
    alert('URL copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold theme-text-primary">Card Preview</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreviewMode('mobile')}
              className={`p-2 rounded-lg transition-colors ${
                previewMode === 'mobile'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'theme-text-tertiary hover:theme-text-primary hover:bg-white/5'
              }`}
            >
              <FiSmartphone className="w-5 h-5" />
            </button>
            <button
              onClick={() => setPreviewMode('desktop')}
              className={`p-2 rounded-lg transition-colors ${
                previewMode === 'desktop'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'theme-text-tertiary hover:theme-text-primary hover:bg-white/5'
              }`}
            >
              <FiMonitor className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm theme-text-tertiary mb-2">
            Simulate Progress: {simulatedProgress} / {threshold} stamps
          </label>
          <input
            type="range"
            min="0"
            max={threshold}
            value={simulatedProgress}
            onChange={(e) => setSimulatedProgress(parseInt(e.target.value))}
            className="w-full h-2 theme-bg-tertiary rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
        </div>

        <div
          className={`mx-auto rounded-xl overflow-hidden border-4 border-charcoal-900 shadow-2xl transition-all ${
            previewMode === 'mobile' ? 'max-w-sm' : 'max-w-2xl'
          }`}
        >
          <div
            className="min-h-[500px] flex flex-col items-center py-6 px-4"
            style={{ backgroundColor: loyaltyData.card.backgroundColor }}
          >
            <div className="w-full max-w-sm">
              <div
                className="rounded-2xl overflow-hidden shadow-xl"
                style={{ backgroundColor: loyaltyData.card.primaryColor }}
              >
                <div className="p-4 text-center">
                  {loyaltyData.card.showLogo && client?.logo_url && (
                    <img
                      src={client.logo_url}
                      alt={client?.name}
                      className="h-12 mx-auto mb-2 object-contain"
                    />
                  )}
                  <h1 className="theme-text-primary font-bold text-lg">
                    {client?.name || 'Your Business'}
                  </h1>
                  <p className="theme-text-primary/80 text-sm mt-1">
                    {loyaltyData.rewardName}
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur p-4">
                  <div
                    className={`mb-4 ${
                      loyaltyData.card.layout === 'grid'
                        ? 'grid grid-cols-5 gap-2'
                        : 'flex gap-2 overflow-x-auto pb-2'
                    }`}
                  >
                    {Array.from({ length: threshold }).map((_, index) => {
                      const isFilled = index < simulatedProgress;
                      return (
                        <div
                          key={index}
                          className={`
                            aspect-square rounded-full flex items-center justify-center
                            transition-all duration-300
                            ${loyaltyData.card.layout === 'inline' ? 'flex-shrink-0 w-10 h-10' : ''}
                            ${isFilled ? 'shadow-lg' : 'border-2'}
                          `}
                          style={{
                            backgroundColor: isFilled ? loyaltyData.card.stampFilledColor : 'transparent',
                            borderColor: !isFilled ? loyaltyData.card.stampEmptyColor : 'transparent'
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
                                IconComponent && <IconComponent className="theme-text-primary" size={14} />
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-center theme-text-primary">
                    {rewardUnlocked ? (
                      <p className="font-semibold flex items-center justify-center gap-2">
                        <FiGift className="text-yellow-300" />
                        Reward Ready!
                      </p>
                    ) : (
                      <p className="text-sm">
                        <span className="font-bold text-lg">{stampsRemaining}</span>
                        <span className="opacity-80"> stamps until your reward</span>
                      </p>
                    )}
                  </div>
                </div>

                {loyaltyData.card.showQR && (
                  <div className="bg-white p-4">
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <QRCodeCanvas
                          value={loyaltyUrl}
                          size={60}
                          level="M"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">Member ID</p>
                        <p className="font-mono font-bold text-gray-900 text-lg tracking-wider">
                          ABC123
                        </p>
                        <p className="text-gray-500 text-xs mt-1">Sample Member</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-3">
                {rewardUnlocked ? (
                  <button
                    className="w-full py-4 rounded-xl font-semibold theme-text-primary flex items-center justify-center gap-2"
                    style={{ backgroundColor: loyaltyData.card.primaryColor }}
                  >
                    <FiGift size={20} />
                    Redeem Your Reward
                  </button>
                ) : (
                  <button
                    className="w-full py-4 rounded-xl font-semibold theme-text-primary flex items-center justify-center gap-2"
                    style={{ backgroundColor: loyaltyData.card.primaryColor }}
                  >
                    <FiCheck size={20} />
                    Confirm {loyaltyData.programType === 'action' ? 'Purchase' : 'Visit'}
                  </button>
                )}

                <button
                  className="w-full py-3 rounded-xl font-medium theme-text-tertiary hover:theme-text-primary hover:bg-white/10 flex items-center justify-center gap-2 transition-colors"
                >
                  <FiRefreshCw size={16} />
                  Refresh Card
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-6">Sharing & Distribution</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              Enrollment URL
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={loyaltyUrl}
                readOnly
                className="flex-1 theme-bg-tertiary border theme-border rounded-lg px-3 py-2 theme-text-secondary text-sm"
              />
              <button
                onClick={copyUrl}
                className="p-2 bg-rose-600 hover:bg-rose-500 theme-text-primary rounded-lg transition-colors"
              >
                <FiCopy className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium theme-text-secondary mb-2">
              QR Code
            </label>
            <div className="flex items-start space-x-4">
              <div ref={qrRef} className="p-2 bg-white rounded-lg">
                <QRCodeCanvas value={loyaltyUrl} size={100} level={"H"} includeMargin={true} />
              </div>
              <button
                onClick={downloadQRCode}
                className="flex items-center gap-2 px-3 py-2 theme-bg-tertiary hover:bg-charcoal-700 border theme-border rounded-lg text-sm theme-text-secondary transition-colors"
              >
                <FiDownload className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-lg">
          <h4 className="text-sm font-medium text-rose-300 mb-2">Tips for Promotion</h4>
          <ul className="text-sm theme-text-secondary space-y-1">
            <li>Print the QR code and display it at your register or entrance</li>
            <li>Share the enrollment link on your social media profiles</li>
            <li>Add the link to your email signatures and newsletters</li>
            <li>Train staff to mention the loyalty program to customers</li>
          </ul>
        </div>
      </div>

      <div className="theme-bg-secondary rounded-lg border theme-border p-6">
        <h2 className="text-lg font-semibold theme-text-primary mb-4">Program Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="theme-bg-tertiary rounded-lg p-4">
            <p className="text-sm theme-text-tertiary">Program Type</p>
            <p className="text-lg font-semibold theme-text-primary capitalize">{loyaltyData.programType}-Based</p>
          </div>
          <div className="theme-bg-tertiary rounded-lg p-4">
            <p className="text-sm theme-text-tertiary">Stamps Required</p>
            <p className="text-lg font-semibold theme-text-primary">{loyaltyData.threshold}</p>
          </div>
          <div className="theme-bg-tertiary rounded-lg p-4">
            <p className="text-sm theme-text-tertiary">Reward</p>
            <p className="text-lg font-semibold theme-text-primary truncate">{loyaltyData.rewardName}</p>
          </div>
          <div className="theme-bg-tertiary rounded-lg p-4">
            <p className="text-sm theme-text-tertiary">Validation</p>
            <p className="text-lg font-semibold theme-text-primary capitalize">
              {loyaltyData.validationMethod.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoyaltyPreview;