/**
 * ActionButton Component
 * Reusable button with icon support
 */

import React, {ReactNode} from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'outline';

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  icon?: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

const variantStyles = {
  primary: {
    backgroundColor: '#2E7D32',
    textColor: '#fff',
    borderColor: 'transparent',
  },
  secondary: {
    backgroundColor: '#E8F5E9',
    textColor: '#2E7D32',
    borderColor: 'transparent',
  },
  danger: {
    backgroundColor: '#FFEBEE',
    textColor: '#E53935',
    borderColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    textColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
};

export default function ActionButton({
  title,
  onPress,
  icon,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ActionButtonProps): JSX.Element {
  const config = variantStyles[variant];

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: config.borderColor,
          borderWidth: variant === 'outline' ? 1.5 : 0,
        },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={config.textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.text, {color: config.textColor}]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
});
