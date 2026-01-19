import React, { useRef, useImperativeHandle, forwardRef, useEffect, useState } from 'react';

const SpinWheel = forwardRef(({ game, onSpinEnd, soundEnabled = true }, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const wheelData = game.visual?.wheel || {};
  const segments = wheelData.segments || [];

  // Image references
  const [images, setImages] = useState({ ring: null, center: null, pointer: null });

  // Animation state
  let isSpinning = false;
  const rotationRef = useRef(0);

  // Responsive Canvas State
  // We use a high internal resolution for crisp rendering on mobile
  const INTERNAL_SIZE = 800;

  useImperativeHandle(ref, () => ({
    spin: () => {
      if (isSpinning) return;
      performSpin();
    }
  }));

  // Load images when URLs change
  useEffect(() => {
    const loadImages = async () => {
      const newImages = { ring: null, center: null, pointer: null };
      const promises = [];

      if (wheelData.ringImage) {
        promises.push(new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { newImages.ring = img; resolve(); };
          img.onerror = () => resolve();
          img.src = wheelData.ringImage;
        }));
      }

      if (wheelData.centerImage) {
        promises.push(new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { newImages.center = img; resolve(); };
          img.onerror = () => resolve();
          img.src = wheelData.centerImage;
        }));
      }

      if (wheelData.pointerImage) {
        promises.push(new Promise((resolve) => {
          const img = new Image();
          img.onload = () => { newImages.pointer = img; resolve(); };
          img.onerror = () => resolve();
          img.src = wheelData.pointerImage;
        }));
      }

      await Promise.all(promises);
      setImages(newImages);
    };

    loadImages();
  }, [wheelData.ringImage, wheelData.centerImage, wheelData.pointerImage]);

  // Draw wheel whenever data or images change
  useEffect(() => {
    drawWheel();
    // Add resize listener to redraw if needed (though CSS handles most scaling)
    const handleResize = () => requestAnimationFrame(drawWheel);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [game, images]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = INTERNAL_SIZE / 2;
    const centerY = INTERNAL_SIZE / 2;

    // Calculate radius. Leave space for ring if it exists
    // Base radius is 45% of canvas size to leave margin
    const baseRadius = (INTERNAL_SIZE / 2) * 0.9;
    
    // If we have a ring, we might want to shrink the wheel segment radius slightly
    // so it fits INSIDE the ring's transparency.
    // Let's assume the ring image is a frame.
    const radius = baseRadius - (images.ring ? 40 : 10);

    ctx.clearRect(0, 0, INTERNAL_SIZE, INTERNAL_SIZE);

    if (segments.length === 0) {
      drawPlaceholder(ctx, centerX, centerY, radius);
      return;
    }

    const currentRotation = rotationRef.current;
    const anglePerSegment = (2 * Math.PI) / segments.length;

    // 1. Draw Segments
    segments.forEach((segment, index) => {
      const startAngle = index * anglePerSegment + currentRotation;
      const endAngle = (index + 1) * anglePerSegment + currentRotation;

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();

      if (segment.useGradient && segment.gradientEnd) {
        // Create radial gradient from center to outside
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, segment.color || '#6b7280'); // Start color (inner)
        gradient.addColorStop(1, segment.gradientEnd); // End color (outer)
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = segment.color || '#6b7280';
      }
      
      ctx.fill();
      ctx.strokeStyle = wheelData.borderColor || '#374151';
      ctx.lineWidth = 4; // Thicker lines for high res
      ctx.stroke();

      // Draw Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSegment / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = segment.textColor || '#ffffff';
      
      // Responsive font size calculation
      const fontSize = Math.max(16, radius / 8);
      ctx.font = `bold ${fontSize}px Arial`;
      
      // Position text
      ctx.fillText(segment.text || '', radius - 30, 0);
      ctx.restore();
    });

    // 2. Draw Ring (Overlay)
    if (images.ring) {
      const ringSize = INTERNAL_SIZE; // Full canvas size
      ctx.drawImage(
        images.ring,
        0, 0,
        ringSize, ringSize
      );
    } else {
      // Draw default border if no ring image
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = wheelData.borderColor || '#374151';
      ctx.lineWidth = 8;
      ctx.stroke();
    }

    // 3. Draw Center Hub/Logo
    if (images.center) {
      const centerSize = radius * 0.4; // 20% of wheel radius
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerSize / 2, 0, 2 * Math.PI);
      ctx.clip();
      // Draw image to fill center
      ctx.drawImage(
        images.center,
        centerX - centerSize / 2,
        centerY - centerSize / 2,
        centerSize, centerSize
      );
      ctx.restore();
       // Optional border around logo
      ctx.beginPath();
      ctx.arc(centerX, centerY, centerSize / 2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else {
      // Default white hub
      ctx.beginPath();
      ctx.arc(centerX, centerY, 40, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.strokeStyle = wheelData.borderColor || '#374151';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    // 4. Draw Pointer (Always on top)
    drawPointer(ctx, centerX, centerY, radius, !!images.ring);
  };

  const drawPlaceholder = (ctx, centerX, centerY, radius) => {
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = '#f3f4f6';
    ctx.fill();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 4;
    ctx.stroke();
    
    ctx.fillStyle = '#6b7280';
    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('No segments', centerX, centerY);
  };

  const drawPointer = (ctx, centerX, centerY, radius, hasRing) => {
    ctx.save();
    ctx.translate(centerX, centerY);
    // Pointer is static at the top (rotate -90deg)
    // Actually, drawing calculations are easier if we don't rotate context for the image
    // But let's stick to consistent coordinate space
    
    if (images.pointer) {
      // Custom pointer image
      const pointerH = 80;
      const pointerW = 80;
      // Position it at the top center
      // x = -pointerW/2  (centered horizontally)
      // y = -radius - pointerH + overlap
      // We need to position it "above" the wheel
      
      // Let's place it so the bottom center of image touches the wheel edge
      // Adjust y offset based on ring presence
      const yOffset = -radius - (hasRing ? 30 : 10);
      
      // We need to draw it at the top (12 o'clock)
      // Since canvas is 0,0 at center, top is y < 0
      ctx.drawImage(images.pointer, -pointerW/2, yOffset - pointerH/2, pointerW, pointerH);
    } else {
      // Default Red Triangle
      ctx.rotate(-Math.PI / 2);
      const pointerSize = 40;
      ctx.beginPath();
      ctx.moveTo(radius + 10, 0); // Tip pointing down/in
      ctx.lineTo(radius + 10 + pointerSize, -15);
      ctx.lineTo(radius + 10 + pointerSize, 15);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
    
    ctx.restore();
  };

  const performSpin = () => {
    if (segments.length === 0) return;
    
    isSpinning = true;
    const spinAmount = Math.random() * 360 + 1440; 
    const spinDuration = 3000;
    const startTime = Date.now();
    const startRotation = rotationRef.current;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / spinDuration, 1);
      
      const easeOut = 1 - Math.pow(1 - progress, 3);
      rotationRef.current = startRotation + (spinAmount * easeOut * Math.PI / 180);
      
      drawWheel();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        isSpinning = false;
        determineWinner();
      }
    };

    animate();
  };

  const determineWinner = () => {
    const currentRot = rotationRef.current;
    
    const normalizedRotation = ((currentRot % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const pointerAngle = (2 * Math.PI - normalizedRotation + Math.PI / 2) % (2 * Math.PI);
    
    const anglePerSegment = (2 * Math.PI) / segments.length;
    let winningIndex = Math.floor(pointerAngle / anglePerSegment) % segments.length;
    
    if (winningIndex < 0) winningIndex += segments.length;
    
    const winningSegment = segments[winningIndex];
    
    const shouldWin = Math.random() * 100 <= (winningSegment.probability || 0);
    
    const result = {
      ...winningSegment,
      isWin: shouldWin && winningSegment.isWin,
      segmentIndex: winningIndex
    };
    
    onSpinEnd(result);
  };

  // Dimensions for CSS responsiveness
  const style = {
    width: '100%',
    height: 'auto',
    maxWidth: `${wheelData.size || 400}px`, // Use the builder setting as max-width
    maxHeight: `${wheelData.size || 400}px`,
    aspectRatio: '1/1'
  };

  return (
    <div ref={containerRef} className="relative flex justify-center items-center w-full">
      <canvas 
        ref={canvasRef} 
        width={INTERNAL_SIZE} 
        height={INTERNAL_SIZE} 
        style={style}
        className="drop-shadow-xl select-none"
      />
    </div>
  );
});

SpinWheel.displayName = 'SpinWheel';

export default SpinWheel;