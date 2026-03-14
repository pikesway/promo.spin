import { useTheme } from '../../context/ThemeContext';
import { FiSun, FiMoon, FiMonitor } from 'react-icons/fi';
import { useState, useRef, useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, preference, setTheme } = useTheme();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
        buttonRef.current?.focus();
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showDropdown]);

  const options = [
    { value: 'light', label: 'Light', icon: FiSun },
    { value: 'dark', label: 'Dark', icon: FiMoon },
    { value: 'system', label: 'System', icon: FiMonitor },
  ];

  const handleSelect = (value) => {
    setTheme(value);
    setShowDropdown(false);
    buttonRef.current?.focus();
  };

  const handleKeyDown = (event, value) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(value);
    }
  };

  const CurrentIcon = theme === 'dark' ? FiMoon : FiSun;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center justify-center w-10 h-10 rounded-lg transition-all duration-200 focus:outline-none"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          color: 'var(--text-primary)',
        }}
        aria-label={`Current theme: ${theme}. Click to change theme`}
        aria-expanded={showDropdown}
        aria-haspopup="listbox"
      >
        <CurrentIcon size={20} />
      </button>

      {showDropdown && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label="Theme options"
          className="absolute right-0 mt-2 py-1 rounded-lg shadow-lg z-50 min-w-[140px]"
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = preference === option.value;

            return (
              <button
                key={option.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => handleSelect(option.value)}
                onKeyDown={(e) => handleKeyDown(e, option.value)}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors duration-150 focus:outline-none"
                style={{
                  background: isSelected ? 'var(--glass-bg)' : 'transparent',
                  color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'var(--glass-bg)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
                onFocus={(e) => {
                  e.currentTarget.style.boxShadow = 'inset 0 0 0 2px var(--brand-primary)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <Icon size={16} />
                <span className="text-sm font-medium">{option.label}</span>
                {isSelected && (
                  <span className="ml-auto text-xs" style={{ color: 'var(--brand-primary)' }}>
                    Active
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}