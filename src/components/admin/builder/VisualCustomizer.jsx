import React, { useState } from 'react';
import WheelCustomizer from './WheelCustomizer';
import BackgroundCustomizer from './BackgroundCustomizer';
import FontCustomizer from './FontCustomizer';
import ButtonCustomizer from './ButtonCustomizer';

const VisualCustomizer = ({ gameData, onChange }) => {
  const [activeSection, setActiveSection] = useState('background');

  const sections = [
    { id: 'background', label: 'Background' },
    { id: 'wheel', label: 'Spin Wheel' },
    { id: 'buttons', label: 'Buttons' },
    { id: 'fonts', label: 'Typography' }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex space-x-8 px-6 min-w-max">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
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
            <WheelCustomizer gameData={gameData} onChange={onChange} />
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