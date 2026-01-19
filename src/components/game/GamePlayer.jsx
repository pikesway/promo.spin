import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from '../../context/GameContext';
import { useLead } from '../../context/LeadContext';
import { useRedemption } from '../../context/RedemptionContext';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { addWeeks, addMonths, setDay, setDate, startOfDay, isAfter } from 'date-fns';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import StartScreen from './screens/StartScreen';
import GameScreen from './screens/GameScreen';
import WinScreen from './screens/WinScreen';
import LoseScreen from './screens/LoseScreen';
import LeadCaptureScreen from './screens/LeadCaptureScreen';
import ThankYouScreen from './screens/ThankYouScreen';
import RedemptionScreen from './screens/RedemptionScreen';

const { FiWifiOff, FiLoader } = FiIcons;

const GamePlayer = ({ gameId: propGameId, isPreview = false }) => {
  const { gameId: paramGameId } = useParams();
  const gameId = propGameId || paramGameId;
  const { getGame, isLoading, isLocalMode } = useGame();
  const { addLead } = useLead();
  const { generateRedemption } = useRedemption();

  const [currentScreen, setCurrentScreen] = useState('start');
  const [gameResult, setGameResult] = useState(null);
  const [hasSpun, setHasSpun] = useState(false);
  const [nextSpinTime, setNextSpinTime] = useState(null);
  const [leadData, setLeadData] = useState({});
  const [redemptionId, setRedemptionId] = useState(null);
  const [scheduleStatus, setScheduleStatus] = useState({ status: 'active', message: '' });

  const game = getGame(gameId);

  // Helper to calculate next reset time for calendar limits
  const getNextCalendarReset = (lastSpinDate, settings) => {
    const timezone = settings.timezone || 'UTC';
    const frequency = settings.calendarResetFrequency || 'weekly';
    const targetDay = parseInt(settings.calendarResetDay ?? 1);

    // Convert last spin to game's timezone to perform calendar math
    const zonedLastSpin = toZonedTime(lastSpinDate, timezone);
    let nextResetZoned;

    if (frequency === 'weekly') {
      // Find next occurrence of the day (0=Sunday ... 6=Saturday)
      // We take the current zoned time, set the day, and set time to 00:00
      let candidate = setDay(zonedLastSpin, targetDay, { weekStartsOn: 0 }); 
      candidate = startOfDay(candidate); // 00:00:00
      
      // If the candidate day is BEFORE or EQUAL to the last spin, we must add a week
      if (!isAfter(candidate, zonedLastSpin)) {
        candidate = addWeeks(candidate, 1);
      }
      nextResetZoned = candidate;
    } else {
      // Monthly
      // Set date to the target day of the month
      let candidate = setDate(zonedLastSpin, targetDay);
      candidate = startOfDay(candidate);
      
      // If candidate is before/equal last spin, add a month
      if (!isAfter(candidate, zonedLastSpin)) {
        candidate = addMonths(candidate, 1);
      }
      nextResetZoned = candidate;
    }

    // Convert back to system time (UTC equivalent Date object) for comparison
    return fromZonedTime(nextResetZoned, timezone);
  };

  // Check schedule validity
  useEffect(() => {
    if (!game || isPreview) return;

    const checkSchedule = () => {
      const now = new Date();
      const settings = game.settings || {};
      const timezone = settings.timezone || 'UTC';

      // Parse start date if it exists
      if (settings.startDate) {
        const startDate = fromZonedTime(settings.startDate, timezone);
        if (now < startDate) {
          setScheduleStatus({
            status: 'upcoming',
            message: `This game starts on ${new Date(startDate).toLocaleString(undefined, { timeZone: timezone, dateStyle: 'medium', timeStyle: 'short' })} (${timezone})`
          });
          return;
        }
      }

      // Parse end date if it exists
      if (settings.endDate) {
        const endDate = fromZonedTime(settings.endDate, timezone);
        if (now > endDate) {
          setScheduleStatus({
            status: 'ended',
            message: 'This game has ended.'
          });
          return;
        }
      }

      setScheduleStatus({ status: 'active', message: '' });
    };

    checkSchedule();
    const timer = setInterval(checkSchedule, 60000);
    return () => clearInterval(timer);
  }, [game, isPreview]);

  // Check for existing spins and limits
  useEffect(() => {
    if (isPreview || !game) return;

    const limitType = game.settings?.spinLimit;

    if (limitType === 'one-per-user') {
      const hasSpunBefore = localStorage.getItem(`hasSpun_${gameId}`);
      if (hasSpunBefore) {
        setHasSpun(true);
      }
    } else if (limitType === 'time-limit') {
      const lastSpinStr = localStorage.getItem(`lastSpinTime_${gameId}`);
      if (lastSpinStr) {
        const lastSpin = new Date(lastSpinStr);
        const delayHours = game.settings?.spinDelayHours || 24;
        const nextTime = new Date(lastSpin.getTime() + delayHours * 60 * 60 * 1000);
        const now = new Date();

        if (now < nextTime) {
          setHasSpun(true);
          setNextSpinTime(nextTime);
        } else {
          setHasSpun(false);
          setNextSpinTime(null);
        }
      }
    } else if (limitType === 'calendar-limit') {
      const lastSpinStr = localStorage.getItem(`lastSpinTime_${gameId}`);
      if (lastSpinStr) {
        const lastSpin = new Date(lastSpinStr);
        const nextTime = getNextCalendarReset(lastSpin, game.settings);
        const now = new Date();

        if (now < nextTime) {
          setHasSpun(true);
          setNextSpinTime(nextTime);
        } else {
          setHasSpun(false);
          setNextSpinTime(null);
        }
      }
    }
  }, [gameId, game, isPreview]);

  // LOADING STATE
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <SafeIcon icon={FiLoader} className="w-10 h-10 text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600">Loading game...</p>
        </div>
      </div>
    );
  }

  // GAME NOT FOUND
  if (!game) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiWifiOff} className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Game Not Found</h1>
          <p className="text-gray-600 mb-4">The requested game could not be found.</p>
          {isLocalMode && !isPreview && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800 text-left">
              <strong>Note:</strong> You are viewing this in Local Mode. If you created this game on a different device, it will not be visible here because a cloud database (Supabase) is not connected.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active status check
  if (!game.isActive && !isPreview) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Game Unavailable</h1>
          <p className="text-gray-600">This game is currently not active.</p>
        </div>
      </div>
    );
  }

  // Schedule status check
  if (scheduleStatus.status !== 'active' && !isPreview) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">
              {scheduleStatus.status === 'upcoming' ? '⏳' : '🏁'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {scheduleStatus.status === 'upcoming' ? 'Coming Soon' : 'Game Ended'}
          </h1>
          <p className="text-gray-600">{scheduleStatus.message}</p>
        </div>
      </div>
    );
  }

  const handleScreenChange = (screen, data = {}) => {
    setCurrentScreen(screen);
    if (data.result) setGameResult(data.result);
    if (data.leadData) setLeadData(data.leadData);
  };

  const handleSpinComplete = (result) => {
    if (!isPreview) {
      const limitType = game?.settings?.spinLimit;
      const now = new Date();
      
      // Update local storage based on limit type
      if (limitType === 'one-per-user') {
        localStorage.setItem(`hasSpun_${gameId}`, 'true');
        setHasSpun(true);
      } else if (limitType === 'time-limit') {
        localStorage.setItem(`lastSpinTime_${gameId}`, now.toISOString());
        
        const delayHours = game.settings?.spinDelayHours || 24;
        const nextTime = new Date(now.getTime() + delayHours * 60 * 60 * 1000);
        setNextSpinTime(nextTime);
        setHasSpun(true);
      } else if (limitType === 'calendar-limit') {
        localStorage.setItem(`lastSpinTime_${gameId}`, now.toISOString());
        
        const nextTime = getNextCalendarReset(now, game.settings);
        setNextSpinTime(nextTime);
        setHasSpun(true);
      } else if (limitType === 'one-per-session') {
        setHasSpun(true);
      }
    }
    
    setGameResult(result);
    
    if (result.isWin && game.screens?.win?.enabled) {
      setCurrentScreen('win');
    } else if (!result.isWin && game.screens?.lose?.enabled) {
      setCurrentScreen('lose');
    } else if (game.screens?.leadCapture?.enabled) {
      setCurrentScreen('leadCapture');
    } else if (game.screens?.redemption?.enabled && result.isWin) {
      handleGenerateRedemption(result);
    } else if (game.screens?.thankYou?.enabled) {
      setCurrentScreen('thankYou');
    }
  };

  const handleGenerateRedemption = (result) => {
    if (!isPreview) {
      const redemption = generateRedemption(game.id, result, game.screens?.redemption || {});
      setRedemptionId(redemption.id);
    }
    setCurrentScreen('redemption');
  };

  const handleLeadSubmit = (formData) => {
    if (!isPreview) {
      addLead({
        gameId: gameId,
        formData: formData,
        outcome: gameResult?.text || 'Unknown',
        isWin: gameResult?.isWin || false
      });
    }
    setLeadData(formData);
    
    if (gameResult?.isWin && game.screens?.redemption?.enabled) {
      handleGenerateRedemption(gameResult);
    } else if (game.screens?.thankYou?.enabled) {
      setCurrentScreen('thankYou');
    }
  };

  const handleWinNext = () => {
    if (game.screens?.leadCapture?.enabled) {
      handleScreenChange('leadCapture');
    } else if (game.screens?.redemption?.enabled) {
      handleGenerateRedemption(gameResult);
    } else if (game.screens?.thankYou?.enabled) {
      handleScreenChange('thankYou');
    }
  };

  const getBackgroundConfig = () => {
    const screenBg = game.screens?.[currentScreen]?.background;
    const globalBg = game.visual?.background;
    const bg = (screenBg && screenBg.type) ? screenBg : globalBg || {};
    
    return bg;
  };

  const activeBg = getBackgroundConfig();

  // Helper to construct styles
  const getContainerStyle = () => {
    const style = {
      backgroundColor: activeBg.color || '#f3f4f6', // Fallback color
    };

    if (activeBg.type === 'gradient') {
      if (activeBg.gradientDirection === 'radial') {
        style.background = `radial-gradient(circle, ${activeBg.gradientStart || '#3b82f6'}, ${activeBg.gradientEnd || '#1d4ed8'})`;
      } else {
        style.background = `linear-gradient(${activeBg.gradientDirection || 'to bottom'}, ${activeBg.gradientStart || '#3b82f6'}, ${activeBg.gradientEnd || '#1d4ed8'})`;
      }
    }
    
    return style;
  };

  const getImageStyle = () => {
    if (activeBg.type !== 'image' || !activeBg.image) return null;
    
    return {
      backgroundImage: `url(${activeBg.image})`,
      backgroundSize: activeBg.imageScale || 'cover',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      filter: `blur(${activeBg.blur || 0}px)`,
    };
  };

  const getOverlayStyle = () => {
    if (activeBg.type === 'image' && activeBg.overlay > 0) {
      return {
        backgroundColor: activeBg.overlayColor || '#000000',
        opacity: activeBg.overlay
      };
    }
    return null;
  };

  return (
    <div 
      className="min-h-screen relative transition-all duration-300 ease-in-out overflow-hidden" 
      style={getContainerStyle()}
    >
      {/* Background Image Layer */}
      {activeBg.type === 'image' && (
        <div 
          className="absolute inset-0 z-0"
          style={getImageStyle()}
        />
      )}

      {/* Overlay Layer */}
      {getOverlayStyle() && (
        <div 
          className="absolute inset-0 z-0 pointer-events-none"
          style={getOverlayStyle()}
        />
      )}
      
      {/* Content Layer */}
      <div className="relative z-10 w-full h-full min-h-screen">
        {currentScreen === 'start' && game.screens?.start?.enabled && (
          <StartScreen 
            game={game} 
            onNext={() => handleScreenChange('game')} 
            hasSpun={hasSpun && !isPreview}
            nextSpinTime={nextSpinTime}
          />
        )}
        
        {(currentScreen === 'game' || (!game.screens?.start?.enabled && currentScreen === 'start')) && (
          <GameScreen 
            game={game} 
            onSpinComplete={handleSpinComplete} 
            hasSpun={hasSpun && !isPreview} 
            isPreview={isPreview}
            nextSpinTime={nextSpinTime}
          />
        )}
        
        {currentScreen === 'win' && (
          <WinScreen game={game} result={gameResult} onNext={handleWinNext} />
        )}
        
        {currentScreen === 'lose' && (
          <LoseScreen 
            game={game} 
            result={gameResult} 
            onNext={() => {
              if (game.screens?.leadCapture?.enabled) handleScreenChange('leadCapture');
              else if (game.screens?.thankYou?.enabled) handleScreenChange('thankYou');
            }} 
            onRetry={() => {
              if (!isPreview) {
                // Only clear if allowed rules.
                const limit = game.settings?.spinLimit;
                if (limit === 'unlimited' || limit === 'one-per-session') {
                   setHasSpun(false);
                }
                // For timed/calendar limits, we don't clear hasSpun here.
              }
              handleScreenChange('game');
            }}
          />
        )}
        
        {currentScreen === 'leadCapture' && game.screens?.leadCapture?.enabled && (
          <LeadCaptureScreen game={game} result={gameResult} onSubmit={handleLeadSubmit} />
        )}

        {currentScreen === 'redemption' && game.screens?.redemption?.enabled && (
          <RedemptionScreen game={game} redemptionId={redemptionId} />
        )}

        {currentScreen === 'thankYou' && game.screens?.thankYou?.enabled && (
          <ThankYouScreen game={game} result={gameResult} leadData={leadData} />
        )}
      </div>
    </div>
  );
};

export default GamePlayer;