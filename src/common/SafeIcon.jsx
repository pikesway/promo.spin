import React from 'react';
import * as FiIcons from 'react-icons/fi';
import { FiAlertTriangle } from 'react-icons/fi';

const SafeIcon = ({ icon, name, ...props }) => {
  let IconComponent;
  
  try {
    // If icon is passed directly as a component
    if (icon) {
      IconComponent = icon;
    } 
    // If name string is passed
    else if (name) {
      IconComponent = FiIcons[`Fi${name}`] || FiIcons[name];
    }
  } catch (e) {
    IconComponent = null;
  }

  return IconComponent ? React.createElement(IconComponent, props) : <FiAlertTriangle {...props} />;
};

export default SafeIcon;