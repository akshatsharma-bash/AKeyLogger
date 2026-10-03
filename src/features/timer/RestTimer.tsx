import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { clock } from '../../lib/dates';
import {
  colors,
  displayMaxScale,
  radius,
  space,
  touch,
  type,
} from '../../theme/tokens';
import { useTimer } from './timerStore';

/** Re-renders every 250 ms while active; completes the timer at zero. */
function useRemaining(): number {
  const endAt = useTimer(s => s.endAt);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!endAt) return;
    let id: ReturnType<typeof setInterval> | null = null;
    const tick = () => {
      setNow(Date.now());
      if (Date.now() >= endAt) useTimer.getState().complete();
    };
    const startTicking = () => {
      tick();
      if (!id) id = setInterval(tick, 250);
    };
    const stop = () => {
      if (id) clearInterval(id);
      id = null;
    };
    if (AppState.currentState === 'active') startTicking();
    const sub = AppState.addEventListener('change', st =>
      st === 'active' ? startTicking() : stop(),
    );
    return () => {
      stop();
      sub.remove();
    };
  }, [endAt]);
  return endAt ? Math.max(0, endAt - now) : 0;
}

export function RestTimerFull() {
  const remaining = useRemaining();
  const { label, total, adjust, skip } = useTimer();
  const pct = total ? Math.min(1, remaining / (total * 1000)) : 0;
  return (
    <View
      style={styles.full}
      accessibilityLabel={`${label}. ${clock(remaining)} remaining`}
    >
      <Text style={[type.label, styles.label]} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[type.display, styles.clock]}
        maxFontSizeMultiplier={displayMaxScale}
        accessibilityRole="timer"
      >
        {clock(remaining)}
      </Text>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.buttons}>
        <Button
          title="−15s"
          variant="secondary"
          onPress={() => adjust(-15)}
          style={styles.flex}
        />
        <Button
          title="+15s"
          variant="secondary"
          onPress={() => adjust(15)}
          style={styles.flex}
        />
        <Button
          title="Skip"
          variant="outline"
          onPress={skip}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

export function RestTimerBar() {
  const remaining = useRemaining();
  const label = useTimer(s => s.label);
  const skip = useTimer(s => s.skip);
  return (
    <View style={styles.bar}>
      <Pressable
        style={({ pressed }) => [styles.barMain, pressed && { opacity: 0.85 }]}
        onPress={() => useTimer.setState({ compact: false })}
        accessibilityRole="button"
        accessibilityLabel={`${label}. ${clock(
          remaining,
        )} remaining. Show timer`}
      >
        <Text style={[type.heading, type.num, { color: colors.textPrimary }]}>
          {clock(remaining)}
        </Text>
        <Text style={[type.label, styles.label, styles.flex]} numberOfLines={1}>
          {label}
        </Text>
      </Pressable>
      <Button title="Skip" variant="text" onPress={skip} />
    </View>
  );
}

const styles = StyleSheet.create({
  full: { alignItems: 'center', gap: space.s },
  label: { color: colors.textSecondary },
  clock: { color: colors.textPrimary, fontSize: 64 },
  track: {
    height: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: 4, backgroundColor: colors.accent },
  buttons: {
    flexDirection: 'row',
    gap: space.s,
    alignSelf: 'stretch',
    marginTop: space.s,
  },
  flex: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    paddingLeft: space.m,
    minHeight: touch,
    marginBottom: space.s,
  },
  barMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: touch,
  },
});
