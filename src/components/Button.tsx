import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, ripple, space, touch, type } from '../theme/tokens';
import { Icon, IconName } from './Icon';

type Variant = 'primary' | 'secondary' | 'outline' | 'text';

interface Props {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  large?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  disabled,
  loading,
  large,
  style,
  accessibilityHint,
}: Props) {
  const fg =
    variant === 'primary'
      ? colors.onAccent
      : variant === 'text'
      ? colors.accentText
      : colors.textPrimary;
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        large && styles.large,
        variants[variant],
        pressed &&
          !inactive &&
          (variant === 'primary' || variant === 'secondary'
            ? styles.pressedOpacity
            : styles.pressedBg),
        inactive && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : icon ? (
          <Icon name={icon} size={20} color={fg} />
        ) : null}
        <Text
          style={[
            type.label,
            styles.text,
            large && styles.largeText,
            { color: fg },
          ]}
          maxFontSizeMultiplier={1.5}
        >
          {title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touch,
    borderRadius: radius.input,
    paddingHorizontal: space.l,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  large: { minHeight: 56, borderRadius: radius.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  text: { textAlign: 'center' },
  largeText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  pressedOpacity: { opacity: 0.85 },
  pressedBg: { backgroundColor: colors.surfaceAlt },
  disabled: { opacity: 0.4 },
});

const variants: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceAlt },
  outline: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  text: { backgroundColor: 'transparent', paddingHorizontal: space.s },
};
