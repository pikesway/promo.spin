import React from 'react';
import GamePlayer from '../../game/GamePlayer';

const GamePreview = ({ gameData }) => {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Preview Mode</h3>
        <p className="text-sm text-blue-700">
          This is how your game will appear to players. Changes made in other tabs will be reflected here automatically.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-sm text-gray-600 ml-4">
              {window.location.origin}/#/game/{gameData.id}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Preview</span>
          </div>
        </div>
        
        <div className="h-96 overflow-auto">
          <GamePlayer gameId={gameData.id} isPreview={true} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Game URL</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${window.location.origin}/#/game/${gameData.id}`}
                readOnly
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-2 py-1"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/#/game/${gameData.id}`);
                  alert('URL copied!');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Copy
              </button>
            </div>
            <a
              href={`/#/game/${gameData.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Open in new tab →
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="font-medium text-gray-900 mb-3">Embed Code</h4>
          <textarea
            value={`<iframe src="${window.location.origin}/#/game/${gameData.id}" width="100%" height="600" frameborder="0"></iframe>`}
            readOnly
            rows={4}
            className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 font-mono"
          />
          <button
            onClick={() => {
              navigator.clipboard.writeText(`<iframe src="${window.location.origin}/#/game/${gameData.id}" width="100%" height="600" frameborder="0"></iframe>`);
              alert('Embed code copied!');
            }}
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
          >
            Copy Embed Code
          </button>
        </div>
      </div>
    </div>
  );
};

export default GamePreview;