// ============================================================
// theme.ts - LifeLink Design System
// Central design tokens. Import from here for consistent styling
// across the entire LifeLink project.
// ============================================================

export const Colors = {
  // Primary Brand - Emergency Red
  primary: '#E63946',
  primaryDark: '#C1121F',
  primaryLight: '#FF6B77',
  primaryGlow: 'rgba(230, 57, 70, 0.2)',

  // Secondary - Deep Navy
  secondary: '#1D3557',
  secondaryLight: '#457B9D',

  // Background
  background: '#0A0E1A',
  backgroundCard: '#111827',
  backgroundElevated: '#1A2235',

  // Surface / Glassmorphism
  surfaceGlass: 'rgba(255, 255, 255, 0.05)',
  surfaceBorder: 'rgba(255, 255, 255, 0.10)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#4A5568',
  textOnPrimary: '#FFFFFF',

  // Status / Severity (used across the app)
  statusRed: '#EF4444',    // Critical
  statusOrange: '#F97316', // Moderate
  statusYellow: '#EAB308', // Minor
  statusGreen: '#22C55E',  // Safe / Success

  // Input fields
  inputBackground: 'rgba(255,255,255,0.07)',
  inputBorder: 'rgba(255,255,255,0.15)',
  inputBorderFocused: '#E63946',
  inputText: '#FFFFFF',
  inputPlaceholder: '#4A5568',

  // Utility
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  divider: 'rgba(255, 255, 255, 0.08)',
};

export const Typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    display: 38,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Shadows = {
  glow: {
    shadowColor: '#E63946',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
};
