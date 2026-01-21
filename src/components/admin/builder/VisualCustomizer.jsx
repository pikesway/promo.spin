import React, { useState } from 'react';
import WheelCustomizer from './WheelCustomizer';
import ScratchCustomizer from './ScratchCustomizer';
import BackgroundCustomizer from './BackgroundCustomizer';
import FontCustomizer from './FontCustomizer';
import ButtonCustomizer from './ButtonCustomizer';

const VisualCustomizer = ({ gameData, onChange }) => {
  const [activeSection, setActiveSection] = useState('background');
  const isScratch = gameData?.type === 'scratch';

  const sections = [
    { id: 'background', label: 'Background' },
    { id: 'wheel', label: isScratch ? 'Scratch Card' : 'Spin Wheel' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'fonts', label: 'Typography' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-charcoal-800 rounded-lg border border-white/10">
        <div className="border-b border-white/10 overflow-x-auto">
          <nav className="flex space-x-8 px-6 min-w-max">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-teal-500 text-teal-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                {section.label}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="p-6">
          {activeSection === 'background' && (
            <BackgroundCustomizer gameData={gameData} onChange={onChange} />
          )}
          {activeSection === 'wheel' && (
            isScratch ? (
              <ScratchCustomizer gameData={gameData} onChange={onChange} />
            ) : (
              <WheelCustomizer gameData={gameData} onChange={onChange} />
            )
          )}
          {activeSection === 'buttons' && (
            <ButtonCustomizer gameData={gameData} onChange={onChange} />
          )}
          {activeSection === 'fonts' && (
            <FontCustomizer gameData={gameData} onChange={onChange} />
          )}
        </div>
      </div>
    </div>
  );
};

export default VisualCustomizer;