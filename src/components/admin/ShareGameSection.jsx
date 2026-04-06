import React, { useState, useRef } from 'react';
import { FiCopy, FiCheck, FiAlertCircle, FiExternalLink, FiDownload } from 'react-icons/fi';
import { QRCodeSVG } from 'qrcode.react';
import { generateTriviaLaunchURL, isTriviaConfigured } from '../../utils/triviaUrlGenerator';

export default function ShareGameSection({ campaign, gameInstances = [] }) {
  const [copiedInstanceId, setCopiedInstanceId] = useState(null);
  const qrRefs = useRef({});

  const activeInstances = gameInstances.filter(inst => inst.status === 'active');

  const handleCopy = async (instanceId, templateId) => {
    const url = generateTriviaLaunchURL(campaign.id, templateId, instanceId);
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedInstanceId(instanceId);
      setTimeout(() => setCopiedInstanceId(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownloadQR = (instanceId, instanceName) => {
    const qrRef = qrRefs.current[instanceId];
    if (!qrRef) return;

    const svg = qrRef.querySelector('svg');
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
        link.download = `game-launch-qr-${instanceName || instanceId}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!isTriviaConfigured()) {
    return (
      <div className="glass-card p-4" style={{ borderLeft: '3px solid var(--warning)' }}>
        <div className="flex items-start gap-3">
          <FiAlertCircle size={20} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Trivia Runtime Not Configured
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              The VITE_TRIVIA_RUNTIME_URL environment variable is not set. Please configure it to generate game launch URLs.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasActiveInstances = activeInstances.length > 0;

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <FiExternalLink size={18} />
            Game Launch URL
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Share this URL with your customers to let them play the trivia game
          </p>
        </div>
      </div>

      {!hasActiveInstances && gameInstances.length > 0 && (
        <div className="mb-3 p-3 rounded-lg flex items-start gap-2" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
          <FiAlertCircle size={16} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: 'var(--warning)' }}>
            No active game instances yet. Create and activate a game instance for players to participate.
          </p>
        </div>
      )}

      {gameInstances.length === 0 && (
        <div className="mb-3 p-3 rounded-lg flex items-start gap-2" style={{ background: 'var(--info-bg)', border: '1px solid var(--accent)' }}>
          <FiAlertCircle size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: 'var(--accent)' }}>
            No game instances created yet. Create your first instance to get started.
          </p>
        </div>
      )}

      {activeInstances.length === 1 && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              Game Launch URL
            </label>
            {!activeInstances[0].template_id && (
              <div className="mb-2 p-2 rounded-lg flex items-start gap-2" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
                <FiAlertCircle size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
                <p className="text-xs" style={{ color: 'var(--warning)' }}>
                  No template ID set. The game may not load correctly.
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value="Secure Game Link Ready"
                readOnly
                className="input flex-1 text-sm"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
              />
              <button
                onClick={() => handleCopy(activeInstances[0].id, activeInstances[0].template_id)}
                className="btn btn-secondary px-4 flex items-center gap-2"
                style={{
                  background: copiedInstanceId === activeInstances[0].id ? 'var(--success)' : undefined,
                  borderColor: copiedInstanceId === activeInstances[0].id ? 'var(--success)' : undefined
                }}
              >
                {copiedInstanceId === activeInstances[0].id ? (
                  <>
                    <FiCheck size={18} />
                    <span className="hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <FiCopy size={18} />
                    <span className="hidden sm:inline">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {activeInstances[0].template_id && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                QR Code
              </label>
              <div className="flex flex-col sm:flex-row gap-3 items-start">
                <div
                  ref={(el) => qrRefs.current[activeInstances[0].id] = el}
                  className="bg-white p-4 rounded-lg"
                >
                  <QRCodeSVG
                    value={generateTriviaLaunchURL(campaign.id, activeInstances[0].template_id, activeInstances[0].id)}
                    size={128}
                    level="H"
                    includeMargin={true}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                    Share this QR code with customers to let them play the game directly.
                  </p>
                  <button
                    onClick={() => handleDownloadQR(activeInstances[0].id, activeInstances[0].name)}
                    className="btn btn-secondary flex items-center gap-2 text-sm"
                  >
                    <FiDownload size={16} />
                    Download QR
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeInstances.length > 1 && (
        <div className="space-y-4">
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Active Game Instances ({activeInstances.length})
          </label>
          {activeInstances.map(instance => (
            <div key={instance.id} className="glass-card p-4">
              <label className="block text-xs font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                {instance.name}
              </label>
              {!instance.template_id && (
                <div className="mb-2 p-2 rounded-lg flex items-start gap-2" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning)' }}>
                  <FiAlertCircle size={14} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
                  <p className="text-xs" style={{ color: 'var(--warning)' }}>
                    No template ID set. The game may not load correctly.
                  </p>
                </div>
              )}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value="Secure Game Link Ready"
                  readOnly
                  className="input flex-1 text-sm"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                />
                <button
                  onClick={() => handleCopy(instance.id, instance.template_id)}
                  className="btn btn-secondary px-4 flex items-center gap-2"
                  style={{
                    background: copiedInstanceId === instance.id ? 'var(--success)' : undefined,
                    borderColor: copiedInstanceId === instance.id ? 'var(--success)' : undefined
                  }}
                >
                  {copiedInstanceId === instance.id ? (
                    <>
                      <FiCheck size={18} />
                      <span className="hidden sm:inline">Copied!</span>
                    </>
                  ) : (
                    <>
                      <FiCopy size={18} />
                      <span className="hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
              </div>

              {instance.template_id && (
                <div className="pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex flex-col sm:flex-row gap-3 items-start">
                    <div
                      ref={(el) => qrRefs.current[instance.id] = el}
                      className="bg-white p-3 rounded-lg"
                    >
                      <QRCodeSVG
                        value={generateTriviaLaunchURL(campaign.id, instance.template_id, instance.id)}
                        size={96}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        QR Code for this instance
                      </p>
                      <button
                        onClick={() => handleDownloadQR(instance.id, instance.name)}
                        className="btn btn-secondary flex items-center gap-2 text-sm"
                      >
                        <FiDownload size={16} />
                        Download QR
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {hasActiveInstances && (
        <div className="text-xs p-3 rounded-lg mt-3" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
          <p className="mb-2">
            <strong style={{ color: 'var(--text-secondary)' }}>How it works:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Share this URL via QR codes, social media, or email campaigns</li>
            <li>Players will be taken to your trivia game experience</li>
            <li>After completing the game, they'll see the leaderboard results</li>
          </ul>
        </div>
      )}
    </div>
  );
}
