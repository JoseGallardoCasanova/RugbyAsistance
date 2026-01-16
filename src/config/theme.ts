/**
 * SquadPro Theme Configuration
 * Paleta de colores profesional y neutra para cualquier tipo de equipo deportivo
 */

// Definición de temas disponibles
export type ThemeName = 'blue' | 'green' | 'orange' | 'purple';
export type FontSize = 'small' | 'normal' | 'large';

// Temas de colores (tonos pastel suaves)
export const Themes = {
  blue: {
    primary: '#5B9BD5',           // Azul pastel
    primaryDark: '#3B7DBD',       
    primaryLight: '#7BB2E8',      
  },
  green: {
    primary: '#70B77E',           // Verde deportivo suave
    primaryDark: '#4A9B5F',       
    primaryLight: '#8BC89A',      
  },
  orange: {
    primary: '#F4A261',           // Naranja energético suave
    primaryDark: '#E38B4F',       
    primaryLight: '#F7B883',      
  },
  purple: {
    primary: '#A78BFA',           // Morado moderno suave
    primaryDark: '#8B5CF6',       
    primaryLight: '#C4B5FD',      
  },
};

export const Colors = {
  // Colores Primarios (por defecto blue)
  primary: Themes.blue.primary,
  primaryDark: Themes.blue.primaryDark,
  primaryLight: Themes.blue.primaryLight,
  
  // Colores Secundarios
  secondary: '#A78BFA',         // Morado para acentos
  secondaryDark: '#8B5CF6',     
  secondaryLight: '#C4B5FD',    
  
  // Estados
  success: '#6EE7B7',           // Verde éxito suave
  successDark: '#34D399',       
  error: '#F87171',             // Rojo error suave
  errorDark: '#EF4444',         
  warning: '#FBBF24',           // Naranja advertencia suave
  warningDark: '#F59E0B',       
  info: '#67E8F9',              // Cyan información suave
  
  // Textos (Light Mode)
  textPrimary: '#1f2937',       
  textSecondary: '#6b7280',     
  textLight: '#9ca3af',         
  textWhite: '#ffffff',         
  
  // Fondos (Light Mode)
  background: '#f9fafb',        
  backgroundWhite: '#ffffff',   
  
  // Bordes
  border: '#e5e7eb',            
  borderDark: '#d1d5db',        
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// Colores para Modo Oscuro
export const DarkColors = {
  // Primarios (mismo tono pero ajustados para fondo oscuro)
  primary: Themes.blue.primary,
  primaryDark: Themes.blue.primaryDark,
  primaryLight: Themes.blue.primaryLight,
  
  // Secundarios
  secondary: '#A78BFA',
  secondaryDark: '#8B5CF6',
  secondaryLight: '#C4B5FD',
  
  // Estados
  success: '#6EE7B7',
  successDark: '#34D399',
  error: '#F87171',
  errorDark: '#EF4444',
  warning: '#FBBF24',
  warningDark: '#F59E0B',
  info: '#67E8F9',
  
  // Textos (Dark Mode)
  textPrimary: '#f9fafb',       
  textSecondary: '#d1d5db',     
  textLight: '#9ca3af',         
  textWhite: '#ffffff',         
  
  // Fondos (Dark Mode)
  background: '#111827',        // Gris muy oscuro
  backgroundWhite: '#1f2937',   // Gris oscuro (cards)
  
  // Bordes
  border: '#374151',            
  borderDark: '#4b5563',        
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

// Tamaños de fuente base
const BaseFontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Escalas de tamaño de fuente
export const FontSizeScales = {
  small: 0.9,   // 90% del tamaño base
  normal: 1.0,  // 100% del tamaño base
  large: 1.15,  // 115% del tamaño base
};

// Función para obtener tamaños de fuente escalados
export const getFontSizes = (scale: FontSize = 'normal') => {
  const multiplier = FontSizeScales[scale];
  return {
    xs: Math.round(BaseFontSizes.xs * multiplier),
    sm: Math.round(BaseFontSizes.sm * multiplier),
    md: Math.round(BaseFontSizes.md * multiplier),
    lg: Math.round(BaseFontSizes.lg * multiplier),
    xl: Math.round(BaseFontSizes.xl * multiplier),
    xxl: Math.round(BaseFontSizes.xxl * multiplier),
    xxxl: Math.round(BaseFontSizes.xxxl * multiplier),
  };
};

// Por defecto, tamaño normal
export const FontSizes = getFontSizes('normal');

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
};

export default {
  Colors,
  DarkColors,
  Themes,
  Spacing,
  BorderRadius,
  FontSizes,
  getFontSizes,
  FontSizeScales,
  Shadows,
};
