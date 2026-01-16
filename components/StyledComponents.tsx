// Reusable styled components matching the new UI designs
// Import and use these in your screens for consistent styling

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, ComponentStyles } from '../constants/newDesignSystem';

// ==================== HEADER COMPONENTS ====================

export const StyledHeader = ({ 
  title, 
  subtitle, 
  rightActions 
}: { 
  title: string; 
  subtitle?: string;
  rightActions?: React.ReactNode;
}) => (
  <View style={styles.header}>
    <View>
      {subtitle && <Text style={styles.headerCaption}>{subtitle}</Text>}
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
    {rightActions && <View style={styles.headerActions}>{rightActions}</View>}
  </View>
);

// ==================== CARD COMPONENTS ====================

export const StyledCard = ({ 
  children, 
  style,
  onPress,
  variant = 'default' 
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'accent';
}) => {
  const cardStyle = getCardStyle(variant);
  const pressableStyle = onPress ? styles.pressable : null;
  
  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={!onPress}
      style={[cardStyle, pressableStyle, style]}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

export const PrimaryCard = ({ 
  children, 
  style 
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) => (
  <View style={[styles.primaryCard, style]}>
    {children}
  </View>
);

// ==================== BUTTON COMPONENTS ====================

export const StyledButton = ({
  title,
  onPress,
  variant = 'primary',
  size = 'large',
  disabled = false,
  icon,
  loading = false,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'large';
  disabled?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  style?: ViewStyle;
}) => {
  const buttonStyle = getButtonStyle(variant, size, disabled);
  const buttonTextStyle = getButtonTextStyle(variant);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[buttonStyle, style]}
      activeOpacity={0.7}
    >
      <View style={styles.buttonContent}>
        {icon && <View style={styles.buttonIcon}>{icon}</View>}
        <Text style={buttonTextStyle}>{title}</Text>
      </View>
    </TouchableOpacity>
  );
};

// ==================== INPUT COMPONENTS ====================

export const StyledInput = ({
  placeholder,
  value,
  onChangeText,
  multiline = false,
  label,
  error,
  ...props
}: {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  multiline?: boolean;
  label?: string;
  error?: string;
  [key: string]: any;
}) => (
  <View style={styles.inputContainer}>
    {label && <Text style={styles.inputLabel}>{label}</Text>}
    <View style={[
      styles.input, 
      error && styles.inputError
    ]}>
      <Text style={styles.inputPlaceholder} numberOfLines={1}>
        {placeholder}
      </Text>
    </View>
    {error && <Text style={styles.errorText}>{error}</Text>}
  </View>
);

// ==================== TEXT COMPONENTS ====================

export const Heading1 = ({ children, style }: { children: string; style?: TextStyle }) => (
  <Text style={[styles.heading1, style]}>{children}</Text>
);

export const Heading2 = ({ children, style }: { children: string; style?: TextStyle }) => (
  <Text style={[styles.heading2, style]}>{children}</Text>
);

export const BodyText = ({ children, style }: { children: string | React.ReactNode; style?: TextStyle }) => (
  <Text style={[styles.bodyText, style]}>{children}</Text>
);

export const CaptionText = ({ children, style }: { children: string; style?: TextStyle }) => (
  <Text style={[styles.captionText, style]}>{children}</Text>
);

// ==================== BADGE & STATUS ====================

export const StatusBadge = ({
  label,
  variant = 'default',
  style,
}: {
  label: string;
  variant?: 'success' | 'warning' | 'error' | 'default';
  style?: ViewStyle;
}) => (
  <View style={[styles.badge, getBadgeStyle(variant), style]}>
    <Text style={styles.badgeText}>{label}</Text>
  </View>
);

// ==================== HELPER FUNCTIONS ====================

function getCardStyle(variant: string): ViewStyle {
  const baseStyle: ViewStyle = {
    borderRadius: BorderRadius.lg,
    padding: Spacing[4],
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[2],
    backgroundColor: Colors.cardBg,
    ...Shadows.md,
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: Colors.primary,
        borderRadius: BorderRadius.xl,
      };
    case 'success':
      return {
        ...baseStyle,
        backgroundColor: Colors.green.light,
      };
    case 'accent':
      return {
        ...baseStyle,
        backgroundColor: Colors.accent,
      };
    default:
      return baseStyle;
  }
}

function getButtonStyle(variant: string, size: string, disabled: boolean): ViewStyle {
  const height = size === 'small' ? 40 : 48;
  const baseStyle: ViewStyle = {
    height,
    borderRadius: BorderRadius.default,
    paddingHorizontal: Spacing[4],
    justifyContent: 'center',
    alignItems: 'center',
    opacity: disabled ? 0.5 : 1,
  };

  switch (variant) {
    case 'primary':
      return {
        ...baseStyle,
        backgroundColor: Colors.primary,
      };
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: Colors.secondary,
      };
    case 'outline':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: Colors.primary,
      };
    case 'ghost':
      return {
        ...baseStyle,
        backgroundColor: 'transparent',
      };
    default:
      return baseStyle;
  }
}

function getButtonTextStyle(variant: string): TextStyle {
  const baseStyle: TextStyle = {
    fontSize: Typography.sizes.base,
    fontWeight: '600',
  };

  switch (variant) {
    case 'primary':
    case 'secondary':
      return {
        ...baseStyle,
        color: Colors.white,
      };
    case 'outline':
    case 'ghost':
      return {
        ...baseStyle,
        color: Colors.primary,
      };
    default:
      return baseStyle;
  }
}

function getBadgeStyle(variant: string): ViewStyle {
  switch (variant) {
    case 'success':
      return { backgroundColor: Colors.success };
    case 'warning':
      return { backgroundColor: Colors.warning };
    case 'error':
      return { backgroundColor: Colors.error };
    default:
      return { backgroundColor: Colors.slate[300] };
  }
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[3],
  },
  headerCaption: {
    fontSize: Typography.sizes.xs,
    fontWeight: '700',
    color: Colors.text.tertiary,
    letterSpacing: 1,
    marginBottom: Spacing[1],
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: Typography.sizes['3xl'] * 1.2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing[2],
  },

  // Cards
  primaryCard: {
    borderRadius: BorderRadius.xl,
    padding: Spacing[5],
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[3],
    backgroundColor: Colors.primary,
    ...Shadows.lg,
  },
  pressable: {
    activeOpacity: 0.7,
  },

  // Buttons
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: Spacing[2],
  },

  // Inputs
  inputContainer: {
    marginBottom: Spacing[4],
  },
  inputLabel: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.text.secondary,
    marginBottom: Spacing[1],
    marginLeft: Spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.slate[50],
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputPlaceholder: {
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
  },
  errorText: {
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: Spacing[1],
    marginLeft: Spacing[2],
  },

  // Text
  heading1: {
    fontSize: Typography.sizes['3xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: Typography.sizes['3xl'] * 1.2,
  },
  heading2: {
    fontSize: Typography.sizes['2xl'],
    fontWeight: '700',
    color: Colors.text.primary,
    lineHeight: Typography.sizes['2xl'] * 1.2,
  },
  bodyText: {
    fontSize: Typography.sizes.base,
    color: Colors.text.primary,
    lineHeight: Typography.sizes.base * 1.5,
  },
  captionText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '500',
    color: Colors.text.tertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Badges
  badge: {
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default {
  StyledHeader,
  StyledCard,
  PrimaryCard,
  StyledButton,
  StyledInput,
  Heading1,
  Heading2,
  BodyText,
  CaptionText,
  StatusBadge,
};
