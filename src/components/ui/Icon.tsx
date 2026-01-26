/**
 * Icon component using Lucide icons
 */

import React from 'react';
import {
  Leaf,
  Bike,
  Bus,
  Train,
  PersonStanding,
  User,
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  RefreshCw,
  AtSign,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Keyboard,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react-native';

interface IconProps {
  name: string;
  size?: number;
  color?: string;
}

const iconMap: Record<string, React.ComponentType<{size?: number; color?: string}>> = {
  // Navigation & Actions
  'leaf': Leaf,
  'bicycle': Bike,
  'bus': Bus,
  'train': Train,
  'walk': PersonStanding,
  'person': User,
  'person-outline': User,
  'close': X,
  'arrow-back': ArrowLeft,
  'arrow-forward': ArrowRight,
  'checkmark': Check,
  'sync': RefreshCw,

  // Form icons
  'at-outline': AtSign,
  'mail-outline': Mail,
  'lock-closed-outline': Lock,
  'eye-outline': Eye,
  'eye-off-outline': EyeOff,
  'keypad-outline': Keyboard,

  // Status icons
  'checkmark-circle': CheckCircle,
  'alert-circle': AlertCircle,
  'warning-outline': AlertTriangle,
  'help-circle': HelpCircle,
};

export const Icon: React.FC<IconProps> = ({name, size = 24, color = '#000'}) => {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    return null;
  }

  return <IconComponent size={size} color={color} />;
};

export default Icon;
