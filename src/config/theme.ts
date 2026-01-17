/**
 * SquadPro Theme Configuration
 * Paletas profesionales curadas para equipos deportivos
 */

// Definición de temas disponibles
export type ThemeName = 'navyPro' | 'tealTransform' | 'earthyWarm' | 'premiumDark';
export type FontSize = 'small' | 'normal' | 'large';

// 🎨 Temas de colores profesionales
export const Themes = {
  // 1. Navy Professional (DEFECTO) - Confianza y profesionalismo
  navyPro: {
    primary: '#0A192F',           // Azul Marino Profundo
    secondary: '#1B3A57',         // Azul de acción
    accent: '#C0C0C0',            // Plata Premium
    background: '#F5F5F7',        // Cloud Dancer
    backgroundWhite: '#FFFFFF',   // Blanco puro
    textPrimary: '#2D3436',       // Gris Carbón
    textSecondary: '#6b7280',     // Gris medio
    border: '#e5e7eb',            // Borde sutil
  },
  
  // 2. Transformative Teal - Innovación y modernidad (Tendencia 2026)
  tealTransform: {
    primary: '#006B6B',           // Transformative Teal
    secondary: '#3EEDBA',         // Neo-Mint (CTAs dinámicas)
    accent: '#E0E4E8',            // Misty Silver
    background: '#FFFFFF',        // Blanco Puro
    backgroundWhite: '#FAFBFC',   // Blanco con toque gris
    textPrimary: '#1A1A1B',       // Negro Técnico
    textSecondary: '#4a5568',     // Gris técnico
    border: '#E0E4E8',            // Misty Silver
  },
  
  // 3. Earthy Warm - Estabilidad y calidez ética
  earthyWarm: {
    primary: '#4A5D4E',           // Verde Musgo
    secondary: '#D97E6A',         // Terracota Muted
    accent: '#7E6351',            // Marrón Nogal
    background: '#FDF9F3',        // Crema Suave
    backgroundWhite: '#FFFFFF',   // Blanco puro
    textPrimary: '#2C2C2C',       // Gris Oscuro
    textSecondary: '#5a5a5a',     // Gris medio cálido
    border: '#E8DED0',            // Borde cálido
  },
  
  // 4. Premium Dark - Exclusividad y sofisticación
  premiumDark: {
    primary: '#D4AF37',           // Oro Metálico
    secondary: '#B8902C',         // Oro oscuro
    accent: '#A0A0A0',            // Gris tenue
    background: '#121212',        // Negro Mate
    backgroundWhite: '#1E1E1E',   // Gris de capas
    textPrimary: '#E1E1E1',       // Gris Seda
    textSecondary: '#A0A0A0',     // Gris tenue
    border: '#2a2a2a',            // Borde oscuro
  },
};

export const Colors = {
  // Colores Primarios (por defecto navyPro)
  primary: Themes.navyPro.primary,
  primaryDark: '#051018',
  primaryLight: '#1B3A57',
  
  // Colores Secundarios
  secondary: Themes.navyPro.secondary,
  secondaryDark: '#0f2840',
  secondaryLight: '#2a5073',
  
  // Estados (universales para todos los temas)
  success: '#6EE7B7',           // Verde éxito suave
  successDark: '#34D399',       
  error: '#F87171',             // Rojo error suave
  errorDark: '#EF4444',         
  warning: '#FBBF24',           // Naranja advertencia suave
  warningDark: '#F59E0B',       
  info: '#67E8F9',              // Cyan información suave
  
  // Textos (Light Mode)
  textPrimary: Themes.navyPro.textPrimary,
  textSecondary: Themes.navyPro.textSecondary,
  textLight: '#9ca3af',         
  textWhite: '#ffffff',         
  
  // Fondos (Light Mode)
  background: Themes.navyPro.background,
  backgroundWhite: Themes.navyPro.backgroundWhite,
  
  // Bordes
  border: Themes.navyPro.border,
  borderDark: '#d1d5db',        
  
  // Accent
  accent: Themes.navyPro.accent,
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
};

// Colores para Modo Oscuro (basado en premiumDark pero adaptable)
export const DarkColors = {
  // Primarios (oro para dark mode)
  primary: '#D4AF37',           // Oro Metálico
  primaryDark: '#B8902C',
  primaryLight: '#E5C55A',
  
  // Secundarios
  secondary: '#B8902C',
  secondaryDark: '#9A7824',
  secondaryLight: '#D4AF37',
  
  // Estados
  success: '#6EE7B7',
  successDark: '#34D399',
  error: '#F87171',
  errorDark: '#EF4444',
  warning: '#FBBF24',
  warningDark: '#F59E0B',
  info: '#67E8F9',
  
  // Textos (Dark Mode)
  textPrimary: '#E1E1E1',       // Gris Seda
  textSecondary: '#A0A0A0',     // Gris tenue
  textLight: '#808080',         
  textWhite: '#ffffff',         
  
  // Fondos (Dark Mode)
  background: '#121212',        // Negro Mate
  backgroundWhite: '#1E1E1E',   // Gris de capas (cards)
  
  // Bordes
  border: '#2a2a2a',            
  borderDark: '#3a3a3a',        
  
  // Accent
  accent: '#A0A0A0',            // Gris tenue
  
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
