import React from 'react';
import { Ionicons } from '@react-native-vector-icons/ionicons/static';
import { colors } from '../theme/tokens';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

export function Icon({
  name,
  size = 22,
  color = colors.textPrimary,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons
      name={name}
      size={size}
      color={color}
      accessibilityElementsHidden
      importantForAccessibility="no"
    />
  );
}
