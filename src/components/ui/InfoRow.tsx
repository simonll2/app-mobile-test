/**
 * InfoRow Component
 * A single row displaying a label and value
 */

import React, {ReactNode} from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface InfoRowProps {
  label: string;
  value: string | number | null | undefined;
  icon?: ReactNode;
  valueColor?: string;
}

export default function InfoRow({
  label,
  value,
  icon,
  valueColor,
}: InfoRowProps): JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.labelContainer}>
        {icon && <View style={styles.icon}>{icon}</View>}
        <Text style={styles.label}>{label}</Text>
      </View>
      <Text
        style={[styles.value, valueColor ? {color: valueColor} : undefined]}>
        {value ?? '-'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    opacity: 0.6,
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    maxWidth: '50%',
    textAlign: 'right',
  },
});
