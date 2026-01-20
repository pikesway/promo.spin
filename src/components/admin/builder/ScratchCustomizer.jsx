import React, { useState } from 'react';
import SafeIcon from '../../../common/SafeIcon';
import ImageUploader from '../../../common/ImageUploader';
import * as FiIcons from 'react-icons/fi';

const { FiPlus, FiTrash2, FiImage, FiGift, FiChevronDown, FiChevronUp, FiAlertCircle } = FiIcons;

const ScratchCustomizer = ({ gameData, onChange }) => {
  const scratchData = gameData.visual?.scratch || {};
  const prizes = gameData.prizes || [];
  const [expandedPrize, setExpandedPrize] = useState(null);

  const handleScratchChange = (key, value) => {
    onChange({
      ...gameData,
      visual: {
        ...gameData.visual,
        scratch: {
          ...scratchData,
          [key]: value
        }
      }
    });
  };

  const handlePrizeChange = (index, key, value) => {
    const updatedPrizes = [...prizes];
    updatedPrizes[index] = { ...updatedPrizes[index], [key]: value };
    onChange({
      ...gameData,
      prizes: updatedPrizes
    });
  };

  const addPrize = () => {
    const newPrizes = [...prizes];
    newPrizes.push({
      id: Date.now(),
      name: 'New Prize',
      isWin: true,
      probability: 10,
      backgroundImage: '',
      winHeadline: '',
      winMessage: ''
    });
    onChange({
      ...gameData,
      prizes: newPrizes
    });
    setExpandedPrize(newPrizes.length - 1);
  };

  const removePrize = (index) => {
    const updatedPrizes = [...prizes];
    updatedPrizes.splice(index, 1);
    onChange({
      ...gameData,
      prizes: updatedPrizes
    });
    setExpandedPrize(null);
  };

  const toggleExpand = (index) => {
    setExpandedPrize(expandedPrize === index ? null : index);
  };

  const totalProbability = prizes.reduce((sum, prize) => sum + (prize.probability || 0), 0);

  return (
    <div className="space-y-8">
      <div className="bg-charcoal-800 border border-white/10 rounded-lg p-6 shadow-sm">
        <div className="flex items-center space-x-2 mb-4">
          <SafeIcon icon={FiImage} className="w-5 h-5 text-gray-400" />
          <h3 className="text-lg font-medium text-white">Scratch Card Settings</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Container Aspect Ratio
            </label>
            <select
              value={scratchData.containerAspectRatio || '4:3'}
              onChange={(e) => handleScratchChange('containerAspectRatio', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="4:3">4:3 (Standard)</option>
              <option value="1:1">1:1 (Square)</option>
              <option value="16:9">16:9 (Wide)</option>
              <option value="3:2">3:2 (Photo)</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Controls the card shape on all devices.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Scratch Threshold (%)
            </label>
            <input
              type="number"
              value={scratchData.scratchThreshold || 50}
              onChange={(e) => handleScratchChange('scratchThreshold', parseInt(e.target.value))}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              min="30"
              max="70"
            />
            <p className="text-xs text-gray-400 mt-1">Percentage scratched before auto-reveal.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Brush Size (px)
            </label>
            <input
              type="number"
              value={scratchData.brushRadius || 40}
              onChange={(e) => handleScratchChange('brushRadius', parseInt(e.target.value))}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              min="20"
              max="80"
            />
            <p className="text-xs text-gray-400 mt-1">Size of the scratch brush.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Logo Position
            </label>
            <select
              value={scratchData.logoPosition || 'top-right'}
              onChange={(e) => handleScratchChange('logoPosition', e.target.value)}
              className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            >
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="center">Center</option>
              <option value="none">None</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">Where to display the logo overlay.</p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
          <ImageUploader
            label="Foreground Image (Scratch Surface)"
            value={scratchData.foregroundImage || ''}
            onChange={(val) => handleScratchChange('foregroundImage', val)}
            helpText="Upload a metallic or branded scratch surface. Leave empty for default silver texture."
          />

          <ImageUploader
            label="Logo Overlay"
            value={scratchData.logoOverlay || ''}
            onChange={(val) => handleScratchChange('logoOverlay', val)}
            helpText="Logo displayed on top of the card (remains visible while scratching)."
          />
        </div>
      </div>

      <div className="bg-charcoal-800 border border-white/10 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiGift} className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-white">Prize Configuration</h3>
          </div>
          <button
            onClick={addPrize}
            className="flex items-center space-x-2 text-teal-400 hover:text-teal-300 text-sm font-medium bg-teal-500/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Prize</span>
          </button>
        </div>

        {totalProbability !== 100 && prizes.length > 0 && (
          <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center space-x-2">
            <SafeIcon icon={FiAlertCircle} className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-sm text-yellow-200">
              Total probability is {totalProbability.toFixed(1)}%. It should equal 100% for fair gameplay.
            </p>
          </div>
        )}

        <div className="space-y-3">
          {prizes.length === 0 ? (
            <div className="text-center py-12 bg-charcoal-900 rounded-lg border border-white/10">
              <SafeIcon icon={FiGift} className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No prizes configured yet.</p>
              <p className="text-gray-500 text-xs mt-1">Click "Add Prize" to create your first prize.</p>
            </div>
          ) : (
            prizes.map((prize, index) => (
              <div
                key={prize.id || index}
                className="bg-charcoal-900 border border-white/10 rounded-lg overflow-hidden"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => toggleExpand(index)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className={`w-3 h-3 rounded-full ${prize.isWin ? 'bg-green-500' : 'bg-gray-500'}`}
                    />
                    <span className="text-white font-medium">{prize.name || 'Unnamed Prize'}</span>
                    <span className="text-gray-400 text-sm">{prize.probability || 0}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePrize(index);
                      }}
                      className="text-red-400 hover:text-red-300 p-1 transition-colors"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                    <SafeIcon
                      icon={expandedPrize === index ? FiChevronUp : FiChevronDown}
                      className="w-5 h-5 text-gray-400"
                    />
                  </div>
                </div>

                {expandedPrize === index && (
                  <div className="p-4 border-t border-white/10 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Prize Name
                        </label>
                        <input
                          type="text"
                          value={prize.name || ''}
                          onChange={(e) => handlePrizeChange(index, 'name', e.target.value)}
                          className="w-full bg-charcoal-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="10% Off"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Probability (%)
                        </label>
                        <input
                          type="number"
                          value={prize.probability || 0}
                          onChange={(e) => handlePrizeChange(index, 'probability', parseFloat(e.target.value))}
                          className="w-full bg-charcoal-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Prize Type
                      </label>
                      <div className="flex items-center space-x-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={prize.isWin === true}
                            onChange={() => handlePrizeChange(index, 'isWin', true)}
                            className="form-radio text-teal-500"
                          />
                          <span className="text-white text-sm">Win (Prize)</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            checked={prize.isWin === false}
                            onChange={() => handlePrizeChange(index, 'isWin', false)}
                            className="form-radio text-gray-500"
                          />
                          <span className="text-white text-sm">Lose (Try Again)</span>
                        </label>
                      </div>
                    </div>

                    <ImageUploader
                      label="Background Image (Revealed Prize)"
                      value={prize.backgroundImage || ''}
                      onChange={(val) => handlePrizeChange(index, 'backgroundImage', val)}
                      helpText="Image shown when scratch surface is removed."
                    />

                    {prize.isWin && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Win Screen Headline
                          </label>
                          <input
                            type="text"
                            value={prize.winHeadline || ''}
                            onChange={(e) => handlePrizeChange(index, 'winHeadline', e.target.value)}
                            className="w-full bg-charcoal-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="Congratulations!"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Win Screen Message
                          </label>
                          <textarea
                            value={prize.winMessage || ''}
                            onChange={(e) => handlePrizeChange(index, 'winMessage', e.target.value)}
                            className="w-full bg-charcoal-800 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            rows="3"
                            placeholder="You won {prize}!"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ScratchCustomizer;
