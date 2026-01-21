import React, { useRef, useState } from 'react';
import SafeIcon from '../../../common/SafeIcon';
import ImageUploader from '../../../common/ImageUploader';
import SpinWheel from '../../game/SpinWheel';
import * as FiIcons from 'react-icons/fi';

const { FiPlus, FiTrash2, FiMove, FiImage, FiRefreshCw, FiGift, FiChevronDown, FiChevronUp } = FiIcons;

const WheelCustomizer = ({ gameData, onChange }) => {
  const wheelRef = useRef();
  const wheelData = gameData.visual?.wheel || {};
  const [expandedSegment, setExpandedSegment] = useState(null);

  const handleWheelChange = (key, value) => {
    onChange({
      ...gameData,
      visual: {
        ...gameData.visual,
        wheel: {
          ...wheelData,
          [key]: value
        }
      }
    });
  };

  const handleSegmentChange = (index, key, value) => {
    const segments = [...(wheelData.segments || [])];
    segments[index] = { ...segments[index], [key]: value };
    handleWheelChange('segments', segments);
  };

  const addSegment = () => {
    const segments = [...(wheelData.segments || [])];
    segments.push({
      id: Date.now(),
      text: 'New Prize',
      isWin: true,
      probability: 10,
      color: '#ef4444',
      textColor: '#ffffff',
      winHeadline: '',
      winMessage: '',
      prizeImage: ''
    });
    handleWheelChange('segments', segments);
    setExpandedSegment(segments.length - 1);
  };

  const removeSegment = (index) => {
    const segments = [...(wheelData.segments || [])];
    segments.splice(index, 1);
    handleWheelChange('segments', segments);
    setExpandedSegment(null);
  };

  const toggleExpand = (index) => {
    setExpandedSegment(expandedSegment === index ? null : index);
  };

  const handleTestSpin = () => {
    wheelRef.current?.spin();
  };

  const totalProbability = (wheelData.segments || []).reduce((sum, seg) => sum + (seg.probability || 0), 0);

  return (
    <div className="space-y-8">
      {/* Live Preview Section */}
      <div className="bg-charcoal-800 border border-white/10 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Live Wheel Preview</h3>
          <button
            onClick={handleTestSpin}
            className="flex items-center space-x-2 text-teal-400 hover:text-teal-300 text-sm font-medium bg-teal-500/10 px-3 py-1.5 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
            <span>Test Spin</span>
          </button>
        </div>
        <div className="flex justify-center bg-charcoal-900 rounded-lg p-8 border border-white/10 min-h-[300px] items-center">
          <div className="relative w-full max-w-[350px]">
            <SpinWheel
              ref={wheelRef}
              game={gameData}
              onSpinEnd={() => {}}
              soundEnabled={true}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Wheel Properties</h3>
          <div className="grid grid-cols-1 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Width (px)
              </label>
              <input
                type="number"
                value={wheelData.size || 300}
                onChange={(e) => handleWheelChange('size', parseInt(e.target.value))}
                className="w-full bg-charcoal-900 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                min="200" max="800"
              />
              <p className="text-xs text-gray-400 mt-1">Controls the maximum size on desktop. On mobile, it scales to fit width.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Border Color
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={wheelData.borderColor || '#374151'}
                  onChange={(e) => handleWheelChange('borderColor', e.target.value)}
                  className="h-10 w-20 border border-white/10 rounded-lg cursor-pointer p-1"
                />
                <span className="text-sm text-gray-400">{wheelData.borderColor || '#374151'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex items-center space-x-2 border-b border-white/10 pb-2">
            <SafeIcon icon={FiImage} className="w-5 h-5 text-gray-400" />
            <h3 className="text-lg font-medium text-white">Wheel Graphics</h3>
          </div>
          <div className="space-y-6">
             <ImageUploader
               label="Ring / Outer Frame Image"
               value={wheelData.ringImage || ''}
               onChange={(val) => handleWheelChange('ringImage', val)}
               helpText="Upload a transparent PNG ring to frame your wheel."
             />
             <ImageUploader
               label="Center Logo / Hub Image"
               value={wheelData.centerImage || ''}
               onChange={(val) => handleWheelChange('centerImage', val)}
               helpText="Upload a logo to appear in the center of the wheel."
             />
             <div className="pt-4 border-t border-white/10">
               <ImageUploader
                 label="Custom Pointer / Arrow Image"
                 value={wheelData.pointerImage || ''}
                 onChange={(val) => handleWheelChange('pointerImage', val)}
                 helpText="Replaces the default red arrow. Points down from top center."
               />
             </div>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-white">Wheel Segments</h3>
          <button
            onClick={addSegment}
            className="bg-teal-600 hover:bg-teal-500 text-white px-3 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 transition-colors"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Segment</span>
          </button>
        </div>

        {totalProbability !== 100 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-4">
            <p className="text-yellow-300 text-sm">
              <strong>Warning:</strong> Total probability is {totalProbability}%. It should equal 100% for proper game balance.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {(wheelData.segments || []).map((segment, index) => (
            <div key={segment.id} className="border border-white/10 rounded-lg bg-charcoal-800 shadow-sm transition-shadow">
              {/* Main Row */}
              <div className="p-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-charcoal-900 text-xs font-medium text-gray-400">
                      {index + 1}
                    </span>
                    <span className="font-medium text-gray-300">Segment {index + 1}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleExpand(index)}
                      className={`text-sm flex items-center space-x-1 px-3 py-1.5 rounded-lg border transition-colors ${
                        expandedSegment === index ? 'bg-teal-500/10 border-teal-500/30 text-teal-300' : 'bg-charcoal-900 border-white/10 text-gray-400 hover:bg-charcoal-700'
                      }`}
                    >
                      <SafeIcon icon={FiGift} className="w-4 h-4" />
                      <span>Prize Details</span>
                      <SafeIcon icon={expandedSegment === index ? FiChevronUp : FiChevronDown} className="w-3 h-3 ml-1" />
                    </button>
                    <button
                      onClick={() => removeSegment(index)}
                      className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/30 transition-colors"
                      title="Remove Segment"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Text
                    </label>
                    <input
                      type="text"
                      value={segment.text}
                      onChange={(e) => handleSegmentChange(index, 'text', e.target.value)}
                      className="w-full bg-charcoal-900 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Win %
                    </label>
                    <input
                      type="number"
                      value={segment.probability}
                      onChange={(e) => handleSegmentChange(index, 'probability', parseInt(e.target.value) || 0)}
                      className="w-full bg-charcoal-900 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                      min="0" max="100"
                    />
                  </div>
                  <div className="lg:col-span-4">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Appearance
                    </label>
                    <div className="flex items-start space-x-2">
                       <div className="flex-1 space-y-1">
                         <div className="flex space-x-1">
                            <input
                              type="color"
                              value={segment.color}
                              onChange={(e) => handleSegmentChange(index, 'color', e.target.value)}
                              className="w-full h-8 border border-white/10 rounded cursor-pointer p-0.5"
                              title={segment.useGradient ? "Gradient Start Color" : "Background Color"}
                            />
                            <input
                              type="color"
                              value={segment.textColor || '#ffffff'}
                              onChange={(e) => handleSegmentChange(index, 'textColor', e.target.value)}
                              className="w-full h-8 border border-white/10 rounded cursor-pointer p-0.5"
                              title="Text Color"
                            />
                         </div>
                         <label className="flex items-center space-x-2 cursor-pointer mt-1">
                           <input
                             type="checkbox"
                             checked={segment.useGradient || false}
                             onChange={(e) => handleSegmentChange(index, 'useGradient', e.target.checked)}
                             className="rounded text-teal-600 focus:ring-teal-500 w-3 h-3"
                           />
                           <span className="text-[10px] text-gray-400">Gradient</span>
                         </label>
                       </div>
                       {segment.useGradient && (
                         <div className="flex-1 space-y-1">
                            <input
                              type="color"
                              value={segment.gradientEnd || segment.color}
                              onChange={(e) => handleSegmentChange(index, 'gradientEnd', e.target.value)}
                              className="w-full h-8 border border-white/10 rounded cursor-pointer p-0.5"
                              title="Gradient End Color"
                            />
                            <span className="block text-[10px] text-gray-500 text-center">End Color</span>
                         </div>
                       )}
                    </div>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">
                      Type
                    </label>
                    <select
                      value={segment.isWin ? 'win' : 'lose'}
                      onChange={(e) => handleSegmentChange(index, 'isWin', e.target.value === 'win')}
                      className="w-full bg-charcoal-900 border border-white/10 rounded px-2 py-1.5 text-sm text-white focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="win">Win</option>
                      <option value="lose">Lose</option>
                    </select>
                  </div>
                </div>
              </div>

              {expandedSegment === index && (
                <div className="px-4 pb-4 pt-0">
                  <div className="bg-teal-500/10 rounded-lg p-4 border border-teal-500/30 animate-fade-in-down">
                     <div className="flex justify-between items-start mb-3">
                       <h4 className="text-sm font-semibold text-teal-300 flex items-center">
                         <SafeIcon icon={FiGift} className="w-4 h-4 mr-2" />
                         Win Screen Configuration
                       </h4>
                     </div>
                     <p className="text-xs text-teal-200 mb-4">
                       Customize what happens when a player wins this specific segment. Leave blank to use global defaults.
                     </p>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs font-medium text-gray-300 mb-1">Custom Headline</label>
                         <input
                           type="text"
                           value={segment.winHeadline || ''}
                           onChange={(e) => handleSegmentChange(index, 'winHeadline', e.target.value)}
                           placeholder="e.g. You Won a T-Shirt!"
                           className="w-full bg-charcoal-900 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                         />
                       </div>
                       <div>
                         <label className="block text-xs font-medium text-gray-300 mb-1">Custom Message</label>
                         <input
                           type="text"
                           value={segment.winMessage || ''}
                           onChange={(e) => handleSegmentChange(index, 'winMessage', e.target.value)}
                           placeholder="e.g. Show this to staff to claim."
                           className="w-full bg-charcoal-900 border border-white/10 rounded px-2 py-1.5 text-sm text-white"
                         />
                       </div>
                       <div className="md:col-span-2">
                         <ImageUploader
                           label="Prize Image (Overrides default win image)"
                           value={segment.prizeImage || ''}
                           onChange={(val) => handleSegmentChange(index, 'prizeImage', val)}
                         />
                       </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WheelCustomizer;