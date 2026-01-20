import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGame } from '../../context/GameContext';

export default function ScratchCard({ onComplete, onScratchProgress }) {
  const { gameData } = useGame();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const scratchConfig = gameData?.visual?.scratch || {};
  const aspectRatio = scratchConfig.containerAspectRatio || '4:3';
  const scratchThreshold = scratchConfig.scratchThreshold || 50;
  const brushRadius = scratchConfig.brushRadius || 40;

  const calculateDimensions = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const [widthRatio, heightRatio] = aspectRatio.split(':').map(Number);
    const ratio = widthRatio / heightRatio;

    const width = Math.min(containerWidth, 600);
    const height = width / ratio;

    setDimensions({ width, height });
  }, [aspectRatio]);

  useEffect(() => {
    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    return () => window.removeEventListener('resize', calculateDimensions);
  }, [calculateDimensions]);

  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    canvas.style.width = `${dimensions.width}px`;
    canvas.style.height = `${dimensions.height}px`;
    ctx.scale(dpr, dpr);

    const foregroundImage = scratchConfig.foregroundImage;

    if (foregroundImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0, dimensions.width, dimensions.height);
      };
      img.src = foregroundImage;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, dimensions.width, dimensions.height);
      gradient.addColorStop(0, '#C0C0C0');
      gradient.addColorStop(0.5, '#E8E8E8');
      gradient.addColorStop(1, '#A8A8A8');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Scratch Here!', dimensions.width / 2, dimensions.height / 2);
    }
  }, [dimensions, scratchConfig.foregroundImage]);

  const calculateScratchedPercentage = useCallback(() => {
    if (!canvasRef.current) return 0;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let transparentPixels = 0;
    const totalPixels = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) {
        transparentPixels++;
      }
    }

    return (transparentPixels / totalPixels) * 100;
  }, []);

  const scratch = useCallback((x, y) => {
    if (!canvasRef.current || isRevealed) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (x - rect.left) * scaleX / (window.devicePixelRatio || 1);
    const canvasY = (y - rect.top) * scaleY / (window.devicePixelRatio || 1);

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, brushRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fill();

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    const percentage = calculateScratchedPercentage();
    setScratchPercentage(percentage);

    if (onScratchProgress) {
      onScratchProgress(percentage);
    }

    if (percentage >= scratchThreshold && !isRevealed) {
      setIsRevealed(true);
      revealCard();
    }
  }, [brushRadius, scratchThreshold, isRevealed, calculateScratchedPercentage, onScratchProgress]);

  const revealCard = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    let opacity = 1;
    const fadeOut = () => {
      opacity -= 0.05;
      if (opacity <= 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (onComplete) {
          setTimeout(() => onComplete(), 500);
        }
        return;
      }

      ctx.globalAlpha = opacity;
      requestAnimationFrame(fadeOut);
    };

    fadeOut();
  }, [onComplete]);

  const handleMouseDown = (e) => {
    setIsScratching(true);
    scratch(e.clientX, e.clientY);
  };

  const handleMouseMove = (e) => {
    if (isScratching) {
      scratch(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
    setIsScratching(false);
  };

  const handleTouchStart = (e) => {
    e.preventDefault();
    setIsScratching(true);
    const touch = e.touches[0];
    scratch(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e) => {
    e.preventDefault();
    if (isScratching) {
      const touch = e.touches[0];
      scratch(touch.clientX, touch.clientY);
    }
  };

  const handleTouchEnd = (e) => {
    e.preventDefault();
    setIsScratching(false);
  };

  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const backgroundImage = scratchConfig.backgroundImage || '';
  const logoOverlay = scratchConfig.logoOverlay || gameData?.screens?.start?.logo || '';
  const logoPosition = scratchConfig.logoPosition || 'top-right';

  const getLogoStyle = () => {
    const baseStyle = {
      position: 'absolute',
      width: '80px',
      height: '80px',
      objectFit: 'contain',
      zIndex: 10,
      pointerEvents: 'none'
    };

    switch (logoPosition) {
      case 'top-left':
        return { ...baseStyle, top: '10px', left: '10px' };
      case 'top-right':
        return { ...baseStyle, top: '10px', right: '10px' };
      case 'center':
        return { ...baseStyle, top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      default:
        return { ...baseStyle, top: '10px', right: '10px' };
    }
  };

  return (
    <div ref={containerRef} style={{
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto',
      padding: 'var(--space-4)'
    }}>
      <div style={{
        position: 'relative',
        width: dimensions.width,
        height: dimensions.height,
        margin: '0 auto',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        background: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        touchAction: 'none',
        userSelect: 'none'
      }}>
        {backgroundImage && (
          <img
            src={backgroundImage}
            alt="Prize"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
        )}

        {logoOverlay && (
          <img
            src={logoOverlay}
            alt="Logo"
            style={getLogoStyle()}
          />
        )}

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            cursor: isScratching ? 'grabbing' : 'grab',
            touchAction: 'none'
          }}
        />
      </div>

      {scratchPercentage > 0 && scratchPercentage < scratchThreshold && (
        <div style={{
          marginTop: 'var(--space-3)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-sm)'
        }}>
          {Math.round(scratchPercentage)}% revealed
        </div>
      )}
    </div>
  );
}
