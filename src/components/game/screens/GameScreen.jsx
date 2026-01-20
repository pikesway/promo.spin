import React, { useState, useRef, useEffect } from 'react';
import SpinWheel from '../SpinWheel';
import ScratchCard from '../ScratchCard';
import { useGame } from '../../../context/GameContext';
import SafeIcon from '../../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiClock } = FiIcons;

const GameScreen = ({ game, onSpinComplete, hasSpun, isPreview, nextSpinTime }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeLeft, setTimeLeft] = useState('');
  const [isScratching, setIsScratching] = useState(false);
  const wheelRef = useRef();
  const { playGame } = useGame();

  const screenData = game.screens?.game || {};
  const fonts = game.visual?.fonts || {};
  const isScratch = game.type === 'scratch';
  
  // Resolve button style
  const globalButton = game.visual?.buttons || {};
  const buttonStyle = {
    fontFamily: fonts.primary,
    textShadow: '0 2px 2px rgba(0,0,0,0.2)',
    backgroundColor: (screenData.useCustomButtonColor ? screenData.buttonColor : globalButton.backgroundColor) || '#16a34a',
    color: (screenData.useCustomButtonColor ? screenData.buttonTextColor : globalButton.textColor) || '#ffffff',
  };

  useEffect(() => {
    if (nextSpinTime) {
      const timer = setInterval(() => {
        const now = new Date();
        const diff = nextSpinTime - now;
        
        if (diff <= 0) {
          setTimeLeft('Ready!');
          clearInterval(timer);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [nextSpinTime]);

  const handleSpin = () => {
    if (hasSpun && !isPreview) {
      alert('You have already played this game!');
      return;
    }
    if (isSpinning) return;
    
    setIsSpinning(true);
    wheelRef.current?.spin();
  };

  const getSessionId = () => {
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }
    return sessionId;
  };

  const handleSpinEnd = (result) => {
    setIsSpinning(false);
    onSpinComplete(result);
  };

  const handleScratchComplete = async () => {
    if (hasSpun && !isPreview) {
      return;
    }
    if (isPreview) {
      onSpinComplete({ isWin: true, text: 'Preview Prize' });
      return;
    }

    setIsScratching(true);

    try {
      const sessionId = getSessionId();
      const serverResult = await playGame(game.id, sessionId);

      if (serverResult.success) {
        onSpinComplete({
          isWin: serverResult.isWin,
          text: serverResult.prize.name,
          ...serverResult.prize
        });
      } else {
        throw new Error('Server returned unsuccessful result');
      }
    } catch (error) {
      console.error('Error playing scratch game:', error);
      alert(`Unable to play: ${error.message}`);
      setIsScratching(false);
    }
  };

  // Block screen if already spun (one-per-user or timed limit)
  if (hasSpun && !isPreview) {
    const isOnePerUser = game.settings?.spinLimit === 'one-per-user';
    const isTimeLimit = game.settings?.spinLimit === 'time-limit';

    if (isOnePerUser || (isTimeLimit && nextSpinTime)) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-2xl p-8 text-center max-w-sm w-full mx-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-4" style={{ fontFamily: fonts.primary }}>
              Already Played
            </h1>
            {isOnePerUser && (
              <p className="text-gray-600" style={{ fontFamily: fonts.secondary }}>
                You have already played this game. Thank you for participating!
              </p>
            )}
            {isTimeLimit && nextSpinTime && (
              <div className="mt-4">
                <p className="text-gray-600 mb-4" style={{ fontFamily: fonts.secondary }}>
                  Please wait before spinning again.
                </p>
                <div className="bg-gray-100 rounded-lg p-3 inline-flex items-center space-x-2 text-gray-700 font-mono text-lg font-bold">
                  <SafeIcon icon={FiClock} className="w-5 h-5 text-gray-500" />
                  <span>{timeLeft || '...'}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 py-8 overflow-hidden">
      
      {/* Container wraps content with responsive max-width */}
      <div className="w-full max-w-lg mx-auto flex flex-col items-center">
        
        {/* Instructions Area */}
        {screenData.showInstructions !== false && (
          <div className="bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg mb-6 max-w-[90%] text-center animate-bounce-slow">
            <p className="text-gray-800 font-medium text-sm md:text-base" style={{ fontFamily: fonts.secondary }}>
              {screenData.instructions || 'Tap SPIN to win!'}
            </p>
          </div>
        )}

        {/* Game Container */}
        {isScratch ? (
          <div className="w-full flex items-center justify-center mb-8">
            <ScratchCard
              onComplete={handleScratchComplete}
              onScratchProgress={(percentage) => {
                if (percentage >= (game.visual?.scratch?.scratchThreshold || 50)) {
                  setIsScratching(true);
                }
              }}
            />
          </div>
        ) : (
          <>
            <div className="relative w-full aspect-square flex items-center justify-center mb-8 max-w-[500px]">
              <SpinWheel
                ref={wheelRef}
                game={game}
                onSpinEnd={handleSpinEnd}
                soundEnabled={soundEnabled}
              />
            </div>

            {/* Spin Button (Only for Spin games) */}
            <div className="w-full max-w-xs space-y-4">
              <button
                onClick={handleSpin}
                disabled={isSpinning || (hasSpun && !isPreview)}
                className={`w-full py-4 rounded-xl font-bold text-xl md:text-2xl shadow-xl transition-all transform active:scale-95 ${
                  isSpinning || (hasSpun && !isPreview) ? 'opacity-75 cursor-not-allowed filter grayscale' : ''
                }`}
                style={buttonStyle}
              >
                {isSpinning ? 'SPINNING...' : (screenData.spinButtonText || 'SPIN NOW')}
              </button>
            </div>
          </>
        )}

        {/* Sound Toggle (Only for Spin games) */}
        {!isScratch && screenData.showSoundToggle && (
          <div className="w-full max-w-xs">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="w-full text-white/80 hover:text-white text-sm flex items-center justify-center space-x-2 py-2"
              style={{ fontFamily: fonts.secondary }}
            >
              <span className="text-lg">{soundEnabled ? '🔊' : '🔇'}</span>
              <span>{soundEnabled ? 'Sound On' : 'Sound Off'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameScreen;