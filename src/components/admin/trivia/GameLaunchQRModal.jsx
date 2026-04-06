import React, { useRef } from 'react';
import { FiX, FiDownload, FiExternalLink } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';

const GameLaunchQRModal = ({ isOpen, onClose, url, instanceName }) => {
  const qrRef = useRef(null);

  if (!isOpen) return null;

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `game-launch-qr-${instanceName || 'game'}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert('URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="glass-card p-6 max-w-md w-full relative animate-scale-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-lg transition-colors"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <FiX className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Game Launch QR Code
        </h2>
        <p className="mb-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Scan this QR code to play the game
        </p>

        <div ref={qrRef} className="bg-white p-6 rounded-xl mb-6 flex items-center justify-center">
          <QRCodeSVG
            value={url}
            size={256}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="mb-6 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <p className="text-xs font-mono break-all" style={{ color: 'var(--text-secondary)' }}>
            {url}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 btn btn-secondary flex items-center justify-center gap-2"
          >
            <FiDownload className="w-4 h-4" />
            Download QR
          </button>
          <button
            onClick={handleCopyUrl}
            className="flex-1 btn btn-primary flex items-center justify-center gap-2"
          >
            <FiExternalLink className="w-4 h-4" />
            Copy URL
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameLaunchQRModal;
