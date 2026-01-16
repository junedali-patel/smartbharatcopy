// Design System extracted from new UI designs
// Colors, typography, spacing, and component standards

export const Colors = {
  // Primary greens - Farm/Agriculture themed
  primary: '#1B4332',
  primaryDark: '#0F2818',
  secondary: '#2D6A4F',
  tertiary: '#40916C',
  accent: '#74C69D',
  
  // Alternative greens for different screens
  green: {
    dark: '#2D6A4F',
    medium: '#2E7D32',
    light: '#22c55e',
    ultraLight: '#E8F5E9',
  },
  
  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  
  // Slate grays (for backgrounds and borders)
  slate: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },
  
  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Semantic
  background: {
    light: '#F8FAFC',
    dark: '#0F172A',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    tertiary: '#94A3B8',
    light: '#CBD5E1',
  },
  border: '#E2E8F0',
  cardBg: '#FFFFFF',
};

export const Typography = {
  // Font families
  family: {
    regular: 'Inter',
    medium: 'Inter',
    semibold: 'Inter',
    bold: 'Inter',
  },
  
  // Font sizes
  sizes: {
    xs: 11,
    sm: 12,
    base: 14,
    lg: 16,
    xl: 18,
    '2xl': 20,
    '3xl': 24,
    '4xl': 28,
    '5xl': 32,
  },
  
  // Font weights
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
};

export const BorderRadius = {
  sm: 8,
  default: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 8,
  },
};

// Component-specific styles
export const ComponentStyles = {
  header: {
    height: 60,
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
    paddingHorizontal: Spacing[5],
  },
  
  button: {
    height: 48,
    borderRadius: BorderRadius.default,
    paddingHorizontal: Spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  buttonSmall: {
    height: 40,
    borderRadius: BorderRadius.default,
    paddingHorizontal: Spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  input: {
    height: 48,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    fontSize: Typography.sizes.base,
    borderWidth: 1,
  },
  
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[2],
  },
  
  cardLarge: {
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[3],
  },
};

// Typography presets
export const TypographyPresets = {
  heading1: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: '700' as const,
    lineHeight: Typography.lineHeights.tight * Typography.sizes['3xl'],
    color: Colors.text.primary,
  },
  
  heading2: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '700' as const,
    lineHeight: Typography.lineHeights.tight * Typography.sizes['2xl'],
    color: Colors.text.primary,
  },
  
  heading3: {
    fontSize: Typography.sizes.xl,
    fontWeight: '600' as const,
    lineHeight: Typography.lineHeights.tight * Typography.sizes.xl,
    color: Colors.text.primary,
  },
  
  body: {
    fontSize: Typography.sizes.base,
    fontWeight: '400' as const,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.base,
    color: Colors.text.primary,
  },
  
  bodySmall: {
    fontSize: Typography.sizes.sm,
    fontWeight: '400' as const,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.sm,
    color: Colors.text.secondary,
  },
  
  caption: {
    fontSize: Typography.sizes.xs,
    fontWeight: '500' as const,
    lineHeight: Typography.lineHeights.normal * Typography.sizes.xs,
    color: Colors.text.tertiary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};
