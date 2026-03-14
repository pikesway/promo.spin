import React from 'react';

const LoseScreen = ({ game, result, onNext, onRetry }) => {
  const screenData = game.screens?.lose || {};
  const fonts = game.visual?.fonts || {};
  
  const canRetry = screenData.allowRetry && (screenData.retryLimit === 'unlimited' || (screenData.retryLimit && parseInt(screenData.retryLimit) > 0));

  // Resolve button style
  const globalButton = game.visual?.buttons || {};
  const buttonStyle = {
    fontFamily: fonts.primary,
    backgroundColor: (screenData.useCustomButtonColor ? screenData.buttonColor : globalButton.backgroundColor) || '#2563eb',
    color: (screenData.useCustomButtonColor ? screenData.buttonTextColor : globalButton.textColor) || '#ffffff',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 text-center max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-700 mb-6" style={{ fontFamily: fonts.primary }}>
          {screenData.headline || 'Better Luck Next Time!'}
        </h1>
        
        {screenData.consolationImage && (
          <img src={screenData.consolationImage} alt="Consolation" className="mx-auto mb-6 max-h-24 object-contain" onError={(e) => e.target.style.display = 'none'} />
        )}
        
        <p className="text-gray-600 mb-6 text-lg" style={{ fontFamily: fonts.secondary }}>
          {screenData.message || 'Thanks for playing!'}
        </p>

        {screenData.showConsolationPrize && screenData.consolationText && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-blue-700 font-medium" style={{ fontFamily: fonts.secondary }}>
              {screenData.consolationText}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          {canRetry ? (
            <button 
              onClick={onRetry}
              className="px-8 py-3 rounded-lg font-semibold text-lg transition-transform hover:-translate-y-0.5 w-full shadow-md"
              style={buttonStyle}
            >
              {screenData.buttonText || 'Try Again'}
            </button>
          ) : (
            <button 
              onClick={onNext}
              className="px-8 py-3 rounded-lg font-semibold text-lg transition-transform hover:-translate-y-0.5 w-full shadow-md"
              style={buttonStyle}
            >
              {screenData.buttonText || 'Continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoseScreen;