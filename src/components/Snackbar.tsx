import React, { useEffect, useRef } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { dur } from '../lib/motion';
import { useSnackbar } from '../store/snackbarStore';
import { colors, motion, radius, space, touch, type } from '../theme/tokens';

/** Snackbar for the focused screen (tabs stay mounted, so only the focused one renders). */
export function Snackbar({ bottom = 16 }: { bottom?: number }) {
  const focused = useIsFocused();
  const current = useSnackbar(s => s.current);
  const action = useSnackbar(s => s.action);
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!current || !focused) return;
    AccessibilityInfo.announceForAccessibility(current.message);
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: dur(motion.normal),
      useNativeDriver: true,
    }).start();
  }, [current, focused, opacity]);

  if (!current || !focused) return null;
  return (
    <Animated.View
      style={[styles.wrap, { bottom, opacity }]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.bar}>
        <Text style={[type.body, styles.msg]}>{current.message}</Text>
        {current.actionLabel ? (
          <Pressable
            onPress={action}
            hitSlop={8}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.action,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text
              style={[
                type.label,
                { color: colors.accentText, fontWeight: '700' },
              ]}
            >
              {current.actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: space.l, right: space.l },
  bar: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.card,
    paddingLeft: space.l,
    paddingRight: space.s,
    minHeight: touch,
    flexDirection: 'row',
    alignItems: 'center',
  },
  msg: { color: colors.textPrimary, flex: 1, paddingVertical: space.m },
  action: {
    minHeight: touch,
    minWidth: touch,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.m,
  },
});
