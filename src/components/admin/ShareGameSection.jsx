import React, { useState } from 'react';
import { FiCopy, FiCheck, FiAlertCircle, FiExternalLink } from 'react-icons/fi';
import { generateTriviaLaunchURL, isTriviaConfigured } from '../../utils/triviaUrlGenerator';

export default function ShareGameSection({ campaign, gameInstances = [] }) {
  const [copiedInstanceId, setCopiedInstanceId] = useState(null);

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
        <div className="space-y-3">
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
        </div>
      )}

      {activeInstances.length > 1 && (
        <div className="space-y-3">
          <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
            Active Game Instances ({activeInstances.length})
          </label>
          {activeInstances.map(instance => (
            <div key={instance.id}>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
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
              <div className="flex gap-2">
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
