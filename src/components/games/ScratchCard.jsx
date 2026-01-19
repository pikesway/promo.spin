import React, { useRef, useEffect, useState } from 'react';

export default function ScratchCard({ config, onComplete }) {
  const canvasRef = useRef(null);
  const [isScratching, setIsScratching] = useState(false);
  const [scratchPercentage, setScratchPercentage] = useState(0);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [prize, setPrize] = useState(null);

  useEffect(() => {
    initCanvas();
    selectPrize();
  }, []);

  const selectPrize = () => {
    const prizes = config?.prizes || [
      { id: '1', text: 'Winner!', probability: 30 },
      { id: '2', text: 'Try Again', probability: 70 }
    ];

    const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
    const random = Math.random() * totalProbability;
    let cumulative = 0;

    for (const prizeOption of prizes) {
      cumulative += prizeOption.probability;
      if (random <= cumulative) {
        setPrize(prizeOption);
        break;
      }
    }
  };

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, '#6366F1');
    gradient.addColorStop(1, '#8B5CF6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SCRATCH HERE', rect.width / 2, rect.height / 2);
  };

  const scratch = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || hasRevealed) return;

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();

    let clientX, clientY;
    if (e.type.includes('touch')) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = (clientX - rect.left) * 2;
    const y = (clientY - rect.top) * 2;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();

    calculateScratchPercentage();
  };

  const calculateScratchPercentage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    let transparent = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] < 128) transparent++;
    }

    const percentage = (transparent / (pixels.length / 4)) * 100;
    setScratchPercentage(percentage);

    if (percentage > 50 && !hasRevealed) {
      revealPrize();
    }
  };

  const revealPrize = () => {
    setHasRevealed(true);
    setTimeout(() => {
      if (prize) onComplete(prize);
    }, 1000);
  };

  const handleMouseDown = () => setIsScratching(true);
  const handleMouseUp = () => setIsScratching(false);
  const handleMouseMove = (e) => {
    if (isScratching) scratch(e);
  };

  return (
    <div className="glass-card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
        Scratch to Reveal Your Prize!
      </h2>

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        margin: '0 auto var(--space-4)',
        aspectRatio: '16 / 9',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 'var(--text-4xl)',
          fontWeight: 'var(--font-bold)',
          color: 'white',
          textShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          {prize?.text || 'Prize'}
        </div>

        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchEnd={handleMouseUp}
          onTouchMove={scratch}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
            touchAction: 'none'
          }}
        />
      </div>

      <div style={{
        width: '100%',
        height: '8px',
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-full)',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${scratchPercentage}%`,
          height: '100%',
          background: 'var(--brand-primary)',
          transition: 'width 0.3s ease'
        }} />
      </div>

      <p style={{
        marginTop: 'var(--space-2)',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-secondary)'
      }}>
        {scratchPercentage < 50 ? 'Keep scratching...' : 'Almost there!'}
      </p>
    </div>
  );
}