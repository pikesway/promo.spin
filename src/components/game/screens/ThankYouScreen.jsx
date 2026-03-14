import React, { useEffect } from 'react';

const ThankYouScreen = ({ game, result, leadData }) => {
  const screenData = game.screens?.thankYou || {};
  const fonts = game.visual?.fonts || {};

  useEffect(() => {
    if (screenData.autoRedirect && screenData.externalLink) {
      const delay = (screenData.redirectDelay || 5) * 1000;
      const timer = setTimeout(() => {
        window.open(screenData.externalLink, '_blank');
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [screenData]);

  const handleExternalLink = () => {
    if (screenData.externalLink) {
      window.open(screenData.externalLink, '_blank');
    }
  };

  const handleSocialShare = (platform) => {
    const text = `I just played an amazing spin-to-win game!`;
    const url = window.location.href;
    
    let shareUrl = '';
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-green-600 mb-4" style={{ fontFamily: fonts.primary }}>
          {screenData.headline || 'Thank You!'}
        </h1>
        
        <p className="text-gray-700 mb-6" style={{ fontFamily: fonts.secondary }}>
          {screenData.message || 'Your information has been submitted successfully.'}
        </p>
        
        {screenData.couponCode && (
          <div className="bg-yellow-50 border-2 border-dashed border-yellow-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: fonts.secondary }}>
              Use this coupon code:
            </p>
            <p className="text-2xl font-bold text-yellow-700" style={{ fontFamily: fonts.primary }}>
              {screenData.couponCode}
            </p>
          </div>
        )}
        
        {screenData.showQR && screenData.externalLink && (
          <div className="mb-6">
            <div className="w-32 h-32 bg-gray-200 mx-auto rounded-lg flex items-center justify-center">
              <span className="text-gray-500 text-xs">QR Code</span>
            </div>
            <p className="text-xs text-gray-500 mt-2" style={{ fontFamily: fonts.secondary }}>
              Scan to visit website
            </p>
          </div>
        )}
        
        {screenData.externalLink && (
          <button
            onClick={handleExternalLink}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium mb-4 w-full transition-colors"
            style={{ fontFamily: fonts.primary }}
          >
            {screenData.buttonText || 'Visit Website'}
          </button>
        )}
        
        {screenData.showSocialShare && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600" style={{ fontFamily: fonts.secondary }}>
              Share this game:
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => handleSocialShare('facebook')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
              >
                Facebook
              </button>
              <button
                onClick={() => handleSocialShare('twitter')}
                className="bg-blue-400 hover:bg-blue-500 text-white px-3 py-2 rounded text-sm"
              >
                Twitter
              </button>
              <button
                onClick={() => handleSocialShare('linkedin')}
                className="bg-blue-800 hover:bg-blue-900 text-white px-3 py-2 rounded text-sm"
              >
                LinkedIn
              </button>
            </div>
          </div>
        )}
        
        {screenData.autoRedirect && screenData.externalLink && (
          <p className="text-sm text-gray-500 mt-4" style={{ fontFamily: fonts.secondary }}>
            Redirecting in {screenData.redirectDelay || 5} seconds...
          </p>
        )}
      </div>
    </div>
  );
};

export default ThankYouScreen;