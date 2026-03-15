import React, { useState } from 'react';
import GamePlayer from '../../game/GamePlayer';
import CampaignPlayer from '../../../pages/CampaignPlayer';

const GamePreview = ({ gameData, playUrl, embedUrl, isCampaign = false, campaignSlug }) => {
  const [copied, setCopied] = useState(null);
  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };
  const defaultUrl = `${window.location.origin}/#/game/${gameData.id}`;
  const url = playUrl || defaultUrl;
  const embedCode = `<iframe src="${embedUrl || url}" width="100%" height="600" frameborder="0"></iframe>`;
  const linkPath = playUrl ? `/#/play/${campaignSlug}` : `/#/game/${gameData.id}`;

  return (
    <div className="space-y-6">
      <div className="bg-teal-500/10 border border-teal-500/30 rounded-lg p-4">
        <h3 className="font-medium text-teal-300 mb-2">Preview Mode</h3>
        <p className="text-sm text-teal-200">
          This is how your game will appear to players. Changes made in other tabs will be reflected here automatically.
        </p>
      </div>

      <div className="bg-charcoal-800 rounded-lg border border-white/10 overflow-hidden">
        <div className="bg-charcoal-900 px-4 py-2 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-400 ml-4 truncate">
              {url}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Preview</span>
          </div>
        </div>

        <div className="h-96 overflow-auto">
          {isCampaign ? (
            <CampaignPlayer previewData={gameData} isPreview={true} />
          ) : (
            <GamePlayer gameId={gameData.id} isPreview={true} />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-charcoal-800 rounded-lg border border-white/10 p-4">
          <h4 className="font-medium text-white mb-3">Game URL</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={url}
                readOnly
                className="flex-1 text-sm bg-charcoal-900 border border-white/10 rounded px-2 py-1 text-gray-300"
              />
              <button
                onClick={() => handleCopy(url, 'url')}
                className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded text-sm"
              >
                {copied === 'url' ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <a
              href={linkPath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-400 hover:text-teal-300 text-sm"
            >
              Open in new tab
            </a>
          </div>
        </div>

        <div className="bg-charcoal-800 rounded-lg border border-white/10 p-4">
          <h4 className="font-medium text-white mb-3">Embed Code</h4>
          <textarea
            value={embedCode}
            readOnly
            rows={4}
            className="w-full text-xs bg-charcoal-900 border border-white/10 rounded px-2 py-1 font-mono text-gray-400"
          />
          <button
            onClick={() => handleCopy(embedCode, 'embed')}
            className="mt-2 bg-teal-600 hover:bg-teal-500 text-white px-3 py-1 rounded text-sm"
          >
            {copied === 'embed' ? 'Copied!' : 'Copy Embed Code'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePreview;