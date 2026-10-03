import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { Icon } from '../../components/Icon';
import { colors, radius, ripple, space, touch, type } from '../../theme/tokens';

export function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={[type.label, styles.label]}>{label}</Text>
      {children}
      {error ? (
        <Text
          style={[type.label, styles.error]}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function Input(props: TextInputProps & { label: string }) {
  return (
    <TextInput
      placeholderTextColor={colors.textSecondary}
      accessibilityLabel={props.label}
      {...props}
      style={[
        type.body,
        styles.input,
        props.multiline && styles.multi,
        props.style,
      ]}
    />
  );
}

/** Compact numeric stepper for forms. */
export function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format = String,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (n: number) => string;
  label: string;
}) {
  const btn = (dir: 1 | -1) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + dir * step)))}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Increase' : 'Decrease'} ${label}`}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Icon name={dir > 0 ? 'add-outline' : 'remove-outline'} />
    </Pressable>
  );
  return (
    <View
      style={styles.stepper}
      accessibilityLabel={`${label} ${format(value)}`}
    >
      {btn(-1)}
      <Text style={[type.heading, type.num, styles.value]}>
        {format(value)}
      </Text>
      {btn(1)}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.xs },
  label: { color: colors.textSecondary },
  error: { color: colors.accentText },
  input: {
    minHeight: touch,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    color: colors.textPrimary,
    paddingHorizontal: space.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multi: { minHeight: 96, textAlignVertical: 'top', paddingTop: space.m },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  btn: {
    width: touch,
    height: touch,
    borderRadius: radius.input,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.border },
  value: { color: colors.textPrimary, minWidth: 56, textAlign: 'center' },
});
