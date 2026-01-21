import React, { useState, useRef, useEffect } from 'react';

export default function SpinWheel({ config, brandColors, onComplete }) {
  const canvasRef = useRef(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const segments = config?.segments || [];
  const primaryColor = brandColors?.primary || '#6366F1';

  useEffect(() => {
    drawWheel();
  }, [rotation]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);

    const anglePerSegment = (2 * Math.PI) / segments.length;

    segments.forEach((segment, index) => {
      const startAngle = index * anglePerSegment;
      const endAngle = startAngle + anglePerSegment;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = segment.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(segment.text, radius * 0.65, 5);
      ctx.restore();
    });

    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX - 15, 50);
    ctx.lineTo(centerX + 15, 50);
    ctx.closePath();
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = primaryColor;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
  };

  const handleSpin = () => {
    if (isSpinning) return;

    setIsSpinning(true);

    const totalProbability = segments.reduce((sum, s) => sum + s.probability, 0);
    const random = Math.random() * totalProbability;
    let cumulative = 0;
    let winningSegment = segments[0];

    for (const segment of segments) {
      cumulative += segment.probability;
      if (random <= cumulative) {
        winningSegment = segment;
        break;
      }
    }

    const anglePerSegment = 360 / segments.length;
    const winningIndex = segments.findIndex(s => s.id === winningSegment.id);
    const targetAngle = 360 - (winningIndex * anglePerSegment) + (anglePerSegment / 2);
    const spins = 5;
    const finalRotation = rotation + (360 * spins) + targetAngle;

    let startTime = null;
    const duration = 4000;

    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentRotation = rotation + ((finalRotation - rotation) * easeOut);

      setRotation(currentRotation % 360);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        setTimeout(() => onComplete(winningSegment), 500);
      }
    };

    requestAnimationFrame(animate);
  };

  return (
    <div className="glass-card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
      <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-semibold)', marginBottom: 'var(--space-4)' }}>
        Spin to Win!
      </h2>
      <div style={{ position: 'relative', margin: '0 auto var(--space-4)', maxWidth: '100%' }}>
        <canvas
          ref={canvasRef}
          width={350}
          height={350}
          style={{ maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
        />
      </div>
      <button
        className="btn btn-primary btn-lg"
        onClick={handleSpin}
        disabled={isSpinning}
        style={{ minWidth: '200px' }}
      >
        {isSpinning ? 'Spinning...' : 'SPIN NOW'}
      </button>
    </div>
  );
}