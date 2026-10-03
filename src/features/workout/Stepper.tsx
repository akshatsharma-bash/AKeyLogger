import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { hapticTick } from '../../lib/haptics';
import { parseNumber } from '../../lib/units';
import {
  colors,
  displayMaxScale,
  radius,
  ripple,
  space,
  type,
} from '../../theme/tokens';

interface Props {
  value: string; // formatted display value, '' when empty
  unit: string;
  onStep: (dir: 1 | -1) => void;
  onSubmit: (n: number) => void;
  decimal?: boolean;
  label: string; // accessibility: "Weight" / "Reps"
}

const REPEAT_MS = 90;

function StepButton({
  dir,
  onStep,
  label,
}: {
  dir: 1 | -1;
  onStep: (d: 1 | -1) => void;
  label: string;
}) {
  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const clear = () => {
    if (interval.current) clearInterval(interval.current);
    interval.current = null;
  };
  useEffect(() => clear, []);
  return (
    <Pressable
      onPress={() => {
        hapticTick();
        onStep(dir);
      }}
      delayLongPress={400}
      onLongPress={() => {
        clear();
        interval.current = setInterval(() => onStep(dir), REPEAT_MS);
      }}
      onPressOut={clear}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Increase' : 'Decrease'} ${label}`}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Icon name={dir > 0 ? 'add-outline' : 'remove-outline'} size={28} />
    </Pressable>
  );
}

export function Stepper({
  value,
  unit,
  onStep,
  onSubmit,
  decimal,
  label,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');

  const commit = () => {
    const n = parseNumber(text);
    if (n != null) onSubmit(decimal ? n : Math.round(n));
    setEditing(false);
  };

  return (
    <View style={styles.row}>
      <StepButton dir={-1} onStep={onStep} label={label} />
      {editing ? (
        <TextInput
          autoFocus
          value={text}
          onChangeText={t => setText(t.replace(',', '.'))}
          onBlur={commit}
          onSubmitEditing={commit}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          returnKeyType="done"
          selectTextOnFocus
          style={[type.display, styles.input]}
          maxFontSizeMultiplier={displayMaxScale}
          accessibilityLabel={label}
        />
      ) : (
        <Pressable
          style={({ pressed }) => [styles.value, pressed && { opacity: 0.85 }]}
          onPress={() => {
            setText(value);
            setEditing(true);
          }}
          accessibilityRole="adjustable"
          accessibilityLabel={`${label} ${value || 'empty'} ${unit}`}
          accessibilityHint="Tap to type a value"
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={e =>
            onStep(e.nativeEvent.actionName === 'increment' ? 1 : -1)
          }
        >
          <Text
            style={[type.display, styles.valueText]}
            maxFontSizeMultiplier={displayMaxScale}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {value || '—'}
          </Text>
          <Text
            style={[type.label, styles.unit]}
            maxFontSizeMultiplier={displayMaxScale}
          >
            {unit}
          </Text>
        </Pressable>
      )}
      <StepButton dir={1} onStep={onStep} label={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  btn: {
    width: 56,
    height: 56,
    borderRadius: radius.card,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pressed: { backgroundColor: colors.border },
  value: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: space.xs,
  },
  valueText: { color: colors.textPrimary, fontSize: 40 },
  unit: { color: colors.textSecondary },
  input: {
    flex: 1,
    minHeight: 56,
    fontSize: 36,
    color: colors.textPrimary,
    textAlign: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    paddingVertical: 0,
  },
});
