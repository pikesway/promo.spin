import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { useAuth } from './AuthContext';

const ThemeContext = createContext({});

const THEME_STORAGE_KEY = 'bizgamez-theme-preference';

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const getSystemTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

const getStoredPreference = () => {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(THEME_STORAGE_KEY) || 'system';
};

export const ThemeProvider = ({ children }) => {
  const { user, profile } = useAuth();
  const [preference, setPreference] = useState(() => getStoredPreference());
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const pref = getStoredPreference();
    return pref === 'system' ? getSystemTheme() : pref;
  });

  const resolveTheme = useCallback((pref) => {
    return pref === 'system' ? getSystemTheme() : pref;
  }, []);

  useEffect(() => {
    if (profile?.theme_preference && profile.theme_preference !== preference) {
      setPreference(profile.theme_preference);
      localStorage.setItem(THEME_STORAGE_KEY, profile.theme_preference);
    }
  }, [profile?.theme_preference]);

  useEffect(() => {
    const resolved = resolveTheme(preference);
    setResolvedTheme(resolved);

    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  }, [preference, resolveTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (preference === 'system') {
        const newTheme = getSystemTheme();
        setResolvedTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(newTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [preference]);

  const setTheme = useCallback(async (newPreference) => {
    setPreference(newPreference);
    localStorage.setItem(THEME_STORAGE_KEY, newPreference);

    const resolved = resolveTheme(newPreference);
    setResolvedTheme(resolved);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ theme_preference: newPreference })
          .eq('id', user.id);
      } catch (error) {
        console.error('Failed to save theme preference:', error);
      }
    }
  }, [user, resolveTheme]);

  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  const value = {
    theme: resolvedTheme,
    preference,
    setTheme,
    toggleTheme,
    isDark: resolvedTheme === 'dark',
    isLight: resolvedTheme === 'light',
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
