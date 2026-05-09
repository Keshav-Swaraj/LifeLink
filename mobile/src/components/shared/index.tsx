// ============================================================
// components/shared/index.tsx — Reusable UI Components
// ============================================================

import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native';
import { BorderRadius, Colors, Spacing, Typography } from '../../constants/theme';

// ── Primary Button ────────────────────────────────────────────
interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
  variant?: 'filled' | 'outline' | 'ghost';
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  loading,
  variant = 'filled',
  style,
  disabled,
  ...props
}) => {
  const isDisabled = disabled || loading;
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        variant === 'filled' && styles.btnFilled,
        variant === 'outline' && styles.btnOutline,
        variant === 'ghost' && styles.btnGhost,
        isDisabled && styles.btnDisabled,
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'filled' ? Colors.white : Colors.primary} size="small" />
      ) : (
        <Text
          style={[
            styles.btnText,
            variant === 'outline' && styles.btnTextOutline,
            variant === 'ghost' && styles.btnTextGhost,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

// ── Input Field ───────────────────────────────────────────────
interface InputFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const InputField: React.FC<InputFieldProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputWrapper}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          focused && styles.inputContainerFocused,
          !!error && styles.inputContainerError,
        ]}
      >
        {leftIcon && <View style={styles.inputIcon}>{leftIcon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.inputPlaceholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {rightIcon && <View style={styles.inputIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
};

// ── Section Divider ───────────────────────────────────────────
export const Divider: React.FC<{ label?: string }> = ({ label }) => (
  <View style={styles.dividerRow}>
    <View style={styles.dividerLine} />
    {label && <Text style={styles.dividerLabel}>{label}</Text>}
    {label && <View style={styles.dividerLine} />}
  </View>
);

// ── Error Banner ──────────────────────────────────────────────
export const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.errorBanner}>
    <Text style={styles.errorBannerText}>⚠ {message}</Text>
  </View>
);

// ── Styles ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Button
  btn: {
    borderRadius: BorderRadius.md,
    paddingVertical: 15,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 52,
  },
  btnFilled: {
    backgroundColor: Colors.primary,
  },
  btnOutline: {
    backgroundColor: Colors.transparent,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  btnGhost: {
    backgroundColor: Colors.transparent,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: Colors.white,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.3,
  },
  btnTextOutline: {
    color: Colors.primary,
  },
  btnTextGhost: {
    color: Colors.textSecondary,
  },

  // Input
  inputWrapper: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
  },
  inputContainerFocused: {
    borderColor: Colors.inputBorderFocused,
    backgroundColor: 'rgba(230, 57, 70, 0.05)',
  },
  inputContainerError: {
    borderColor: Colors.statusRed,
  },
  input: {
    flex: 1,
    color: Colors.inputText,
    fontSize: Typography.fontSize.base,
    paddingVertical: 14,
    fontWeight: Typography.fontWeight.regular,
  },
  inputIcon: {
    marginHorizontal: 4,
  },
  inputError: {
    color: Colors.statusRed,
    fontSize: Typography.fontSize.xs,
    marginTop: 5,
    marginLeft: 2,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.md,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  dividerLabel: {
    color: Colors.textMuted,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },

  // Error Banner
  errorBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    color: Colors.statusRed,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
});
