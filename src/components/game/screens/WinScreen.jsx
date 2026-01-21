import React, { useEffect, useState } from 'react';

const WinScreen = ({ game, result, onNext }) => {
  const defaultScreenData = game.screens?.win || {};
  const fonts = game.visual?.fonts || {};
  const [showConfetti, setShowConfetti] = useState(false);

  // Merge default settings with segment specific settings
  const screenData = {
    ...defaultScreenData,
    headline: result?.winHeadline || defaultScreenData.headline,
    message: result?.winMessage || defaultScreenData.message,
    prizeImage: result?.prizeImage || defaultScreenData.prizeImage,
    buttonText: defaultScreenData.buttonText,
    // Ensure button style props are passed through
    useCustomButtonColor: defaultScreenData.useCustomButtonColor,
    buttonColor: defaultScreenData.buttonColor,
    buttonTextColor: defaultScreenData.buttonTextColor
  };

  // Resolve button style
  const globalButton = game.visual?.buttons || {};
  const buttonStyle = {
    fontFamily: fonts.primary,
    backgroundColor: (screenData.useCustomButtonColor ? screenData.buttonColor : globalButton.backgroundColor) || '#16a34a',
    color: (screenData.useCustomButtonColor ? screenData.buttonTextColor : globalButton.textColor) || '#ffffff',
  };

  useEffect(() => {
    if (screenData.showConfetti !== false) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [screenData.showConfetti]);

  const rawMessage = screenData.message || 'You won: {prize}';
  const message = rawMessage.replace('{prize}', result?.text || 'Prize');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      {showConfetti && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-20">
          <div className="confetti-animation text-4xl">
            🎉 ✨ 🎊 ✨ 🎉 🎊 ✨ 🎉 ✨ 🎊
          </div>
        </div>
      )}
      
      <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-8 text-center max-w-md w-full relative z-10">
        <h1 className="text-4xl font-bold text-green-600 mb-6" style={{ fontFamily: fonts.primary }}>
          {screenData.headline || 'Congratulations!'}
        </h1>
        
        {screenData.prizeImage && (
          <img 
            src={screenData.prizeImage} 
            alt="Prize" 
            className="mx-auto mb-6 max-h-40 object-contain"
            onError={(e) => e.target.style.display = 'none'}
          />
        )}

        <p className="text-xl text-gray-700 mb-8" style={{ fontFamily: fonts.secondary }}>
          {message}
        </p>

        <button 
          onClick={onNext}
          className="px-8 py-3 rounded-lg font-semibold text-lg transition-transform hover:-translate-y-0.5 w-full shadow-md"
          style={buttonStyle}
        >
          {screenData.buttonText || 'Claim Prize'}
        </button>
      </div>
    </div>
  );
};

export default WinScreen;