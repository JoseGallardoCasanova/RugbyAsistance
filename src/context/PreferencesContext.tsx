import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeName, FontSize, Themes, Colors, DarkColors, getFontSizes } from '../config/theme';

interface Preferences {
  theme: ThemeName;
  fontSize: FontSize;
  darkMode: boolean;
}

interface PreferencesContextType {
  preferences: Preferences;
  currentColors: typeof Colors;
  fontSizes: ReturnType<typeof getFontSizes>;
  setTheme: (theme: ThemeName) => Promise<void>;
  setFontSize: (size: FontSize) => Promise<void>;
  setDarkMode: (enabled: boolean) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const defaultPreferences: Preferences = {
  theme: 'earthyWarm',
  fontSize: 'normal',
  darkMode: false,
};

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const STORAGE_KEY = '@squadpro_preferences';

export const PreferencesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [currentColors, setCurrentColors] = useState(Colors);

  // Cargar preferencias al iniciar
  useEffect(() => {
    loadPreferences();
  }, []);

  // Actualizar colores cuando cambian las preferencias
  useEffect(() => {
    updateColors();
  }, [preferences.theme, preferences.darkMode]);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences(parsed);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async (newPrefs: Preferences) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      setPreferences(newPrefs);
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const updateColors = () => {
    const themeColors = Themes[preferences.theme];
    
    if (preferences.darkMode) {
      // En dark mode, usamos premiumDark como base
      setCurrentColors({
        ...DarkColors,
        // Mantener los colores específicos del tema seleccionado
        primary: themeColors.primary,
        secondary: themeColors.secondary,
        accent: themeColors.accent,
      });
    } else {
      // En light mode, cada tema tiene su paleta completa
      setCurrentColors({
        ...Colors,
        primary: themeColors.primary,
        primaryDark: themeColors.primary, // Usamos el mismo para consistencia
        primaryLight: themeColors.secondary,
        secondary: themeColors.secondary,
        accent: themeColors.accent,
        background: themeColors.background,
        backgroundWhite: themeColors.backgroundWhite,
        textPrimary: themeColors.textPrimary,
        textSecondary: themeColors.textSecondary,
        border: themeColors.border,
        // Estados se mantienen universales
        success: Colors.success,
        successDark: Colors.successDark,
        error: Colors.error,
        errorDark: Colors.errorDark,
        warning: Colors.warning,
        warningDark: Colors.warningDark,
        info: Colors.info,
        textLight: Colors.textLight,
        textWhite: Colors.textWhite,
        borderDark: Colors.borderDark,
        overlay: Colors.overlay,
        overlayLight: Colors.overlayLight,
      });
    }
  };

  const setTheme = async (theme: ThemeName) => {
    await savePreferences({ ...preferences, theme });
  };

  const setFontSize = async (fontSize: FontSize) => {
    await savePreferences({ ...preferences, fontSize });
  };

  const setDarkMode = async (darkMode: boolean) => {
    await savePreferences({ ...preferences, darkMode });
  };

  const resetPreferences = async () => {
    await savePreferences(defaultPreferences);
  };

  // Calcular fontSizes reactivamente cuando cambia fontSize
  const currentFontSizes = useMemo(() => {
    return getFontSizes(preferences.fontSize);
  }, [preferences.fontSize]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        currentColors,
        fontSizes: currentFontSizes,
        setTheme,
        setFontSize,
        setDarkMode,
        resetPreferences,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within PreferencesProvider');
  }
  return context;
};
