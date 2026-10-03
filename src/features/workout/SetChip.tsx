import React, { memo, useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { dur } from '../../lib/motion';
import { Icon } from '../../components/Icon';
import { colors, radius, space, touch, type } from '../../theme/tokens';

export type ChipState = 'logged' | 'next' | 'pending' | 'skipped';

interface Props {
  index: string; // "1", "2", "E"
  text: string; // "60×8" or ""
  state: ChipState;
  beat?: boolean;
  onRed?: boolean; // inside the red (current) card
  onPress?: () => void;
}

export const SetChip = memo(function SetChip({
  index,
  text,
  state,
  beat,
  onRed,
  onPress,
}: Props) {
  const logged = state === 'logged';
  const scale = useRef(new Animated.Value(1)).current;
  const wasLogged = useRef(logged);
  useEffect(() => {
    if (logged && !wasLogged.current) {
      scale.setValue(0.85);
      Animated.timing(scale, {
        toValue: 1,
        duration: dur(150),
        useNativeDriver: true,
      }).start();
    }
    wasLogged.current = logged;
  }, [logged, scale]);
  const a11y = `Set ${index}${text ? `, ${text}` : ''}, ${state}${
    beat ? ', beat last session' : ''
  }`;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={logged ? onPress : undefined}
        disabled={!logged}
        accessibilityRole={logged ? 'button' : 'text'}
        accessibilityLabel={a11y}
        accessibilityHint={logged ? 'Edit this set' : undefined}
        hitSlop={4}
        style={({ pressed }) => [
          styles.chip,
          state === 'next' && styles.next,
          logged && styles.logged,
          logged && onRed && styles.loggedOnRed,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[
            type.caption,
            { color: logged ? colors.onAccent : colors.textSecondary },
          ]}
        >
          {index}
        </Text>
        {text ? (
          <Text
            style={[
              type.label,
              type.num,
              { color: logged ? colors.onAccent : colors.textSecondary },
            ]}
          >
            {text}
          </Text>
        ) : null}
        <View style={styles.icons}>
          {logged ? (
            <Icon name="checkmark-outline" size={16} color={colors.onAccent} />
          ) : null}
          {beat ? (
            <Icon name="arrow-up-outline" size={16} color={colors.onAccent} />
          ) : null}
          {state === 'skipped' ? (
            <Text style={[type.caption, { color: colors.textSecondary }]}>
              skip
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  chip: {
    minHeight: touch,
    minWidth: touch,
    paddingHorizontal: space.s,
    borderRadius: radius.input,
    borderWidth: 2,
    backgroundColor: colors.bg,
    borderColor: colors.bg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  next: { borderColor: colors.onAccent },
  logged: { backgroundColor: colors.accent, borderColor: colors.accent },
  loggedOnRed: { borderColor: colors.onAccent },
  pressed: { opacity: 0.85 },
  icons: { flexDirection: 'row', alignItems: 'center' },
});
