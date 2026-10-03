import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, ripple, space, touch, type } from '../theme/tokens';

/** Selectable chip (segmented controls, day chips, superset picker). */
export function Chip({
  label,
  selected,
  onPress,
  dot,
  style,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && (selected ? { opacity: 0.85 } : styles.pressed),
        style,
      ]}
    >
      <Text
        style={[
          type.label,
          { color: selected ? colors.onAccent : colors.textPrimary },
          selected && { fontWeight: '700' },
        ]}
        maxFontSizeMultiplier={1.3}
      >
        {label}
      </Text>
      <View
        style={[
          styles.dot,
          { opacity: dot ? 1 : 0 },
          selected && { backgroundColor: colors.onAccent },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touch,
    minWidth: 44,
    paddingHorizontal: space.s,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  selected: { backgroundColor: colors.accent },
  pressed: { backgroundColor: colors.border },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accentText,
    marginTop: 2,
  },
});
