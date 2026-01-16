/**
 * SquadPro Theme Configuration
 * Paleta de colores profesional y neutra para cualquier tipo de equipo deportivo
 */

export const Colors = {
  // Colores Primarios
  primary: '#2563eb',           // Azul profesional
  primaryDark: '#1e40af',       // Azul oscuro (hover/activo)
  primaryLight: '#3b82f6',      // Azul claro
  
  // Colores Secundarios
  secondary: '#8b5cf6',         // Morado para acentos
  secondaryDark: '#7c3aed',     // Morado oscuro
  secondaryLight: '#a78bfa',    // Morado claro
  
  // Estados
  success: '#10b981',           // Verde éxito
  successDark: '#059669',       // Verde oscuro
  error: '#ef4444',             // Rojo error
  errorDark: '#dc2626',         // Rojo oscuro
  warning: '#f59e0b',           // Naranja advertencia
  warningDark: '#d97706',       // Naranja oscuro
  info: '#06b6d4',              // Cyan información
  
  // Textos
  textPrimary: '#1f2937',       // Gris muy oscuro
  textSecondary: '#6b7280',     // Gris medio
  textLight: '#9ca3af',         // Gris claro
  textWhite: '#ffffff',         // Blanco
  
  // Fondos
  background: '#f9fafb',        // Gris muy claro
  backgroundWhite: '#ffffff',   // Blanco puro
  backgroundDark: '#111827',    // Oscuro (modo oscuro futuro)
  
  // Bordes
  border: '#e5e7eb',            // Gris claro
  borderDark: '#d1d5db',        // Gris medio
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
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

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

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
  Spacing,
  BorderRadius,
  FontSizes,
  Shadows,
};
