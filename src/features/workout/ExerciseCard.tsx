import React, { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../../components/Icon';
import { shortDate } from '../../lib/dates';
import { fmtSet, targetLine } from '../../lib/format';
import { fmtWeight } from '../../lib/units';
import { useSession } from '../../store/sessionStore';
import { useSettings } from '../../store/settingsStore';
import { colors, radius, ripple, space, type } from '../../theme/tokens';
import { beatsLast, itemProgress, progressionHint, stepKgFor } from './logic';
import { ChipState, SetChip } from './SetChip';

export const ExerciseCard = memo(function ExerciseCard({
  itemId,
  focused,
}: {
  itemId: string;
  focused: boolean;
}) {
  const item = useSession(s => s.items.find(i => i.id === itemId));
  const logs = useSession(s => s.logs);
  const last = useSession(s => (item ? s.last[item.exercise_id] : null));
  const skipped = useSession(s => s.skipped[itemId]);
  const editId = useSession(s => s.editLog?.id);
  const settings = useSettings(s => s.settings);
  const [expanded, setExpanded] = useState(false);

  const p = useMemo(
    () => (item ? itemProgress(item, logs, skipped) : null),
    [item, logs, skipped],
  );
  if (!item || !p) return null;

  const u = settings.units;
  const bw = item.exercise.load_type === 'bodyweight';
  const hint = progressionHint(item, last, stepKgFor(item, settings));
  const done = p.next === null;
  const onFocus = () => useSession.getState().focus(item.id);
  const edit = (id: string) => {
    const l = logs.find(x => x.id === id);
    if (l) useSession.getState().startEdit(l);
  };

  if (done && !expanded && !focused) {
    const summary = [...p.logged.values(), ...p.extras]
      .map(l => fmtSet(l, u, bw))
      .join(' · ');
    return (
      <Pressable
        onPress={() => setExpanded(true)}
        android_ripple={ripple}
        accessibilityRole="button"
        accessibilityLabel={`${item.exercise.name}, done. ${summary}`}
        accessibilityHint="Expand"
        style={({ pressed }) => [
          styles.card,
          styles.collapsed,
          pressed && styles.pressed,
        ]}
      >
        <Icon
          name="checkmark-circle-outline"
          size={22}
          color={colors.success}
        />
        <View style={styles.flex}>
          <Text style={[type.body, styles.name]} numberOfLines={1}>
            {item.exercise.name}
          </Text>
          <Text style={[type.label, type.num, styles.meta]} numberOfLines={1}>
            {summary || 'Skipped'}
          </Text>
        </View>
        <Icon
          name="chevron-down-outline"
          size={20}
          color={colors.textSecondary}
        />
      </Pressable>
    );
  }

  const chips: {
    key: string;
    index: string;
    text: string;
    state: ChipState;
    beat: boolean;
    id?: string;
  }[] = [];
  for (let i = 0; i < item.sets; i++) {
    const l = p.logged.get(i);
    const state: ChipState = l
      ? 'logged'
      : skipped?.includes(i)
      ? 'skipped'
      : p.next === i
      ? 'next'
      : 'pending';
    chips.push({
      key: `p${i}`,
      index: String(i + 1),
      text: l ? fmtSet(l, u, bw) : '',
      state,
      beat: !!l && beatsLast(l, last),
      id: l?.id,
    });
  }
  for (const l of p.extras)
    chips.push({
      key: l.id,
      index: 'E',
      text: fmtSet(l, u, bw),
      state: 'logged',
      beat: false,
      id: l.id,
    });

  const onCardPress = () =>
    done && expanded && !focused ? setExpanded(false) : onFocus();

  return (
    // The whole card is the tap target. Logged set chips are their own Pressables and win the
    // touch (they open edit); pending chips are disabled, so their taps fall through to the card.
    <Pressable
      onPress={onCardPress}
      android_ripple={focused ? undefined : ripple}
      accessible={false}
      style={({ pressed }) => [
        styles.card,
        focused && styles.focused,
        pressed && (focused ? styles.pressedRed : styles.pressed),
      ]}
    >
      <View
        accessible
        accessibilityRole="button"
        accessibilityLabel={`${item.exercise.name}, ${targetLine(item)}${
          focused ? ', current exercise' : ''
        }`}
        accessibilityHint={
          focused ? undefined : 'Make this the current exercise'
        }
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityAction={onCardPress}
        style={styles.header}
      >
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text
              style={[
                type.heading,
                styles.name,
                focused && styles.white,
                styles.flex,
              ]}
            >
              {item.exercise.name}
            </Text>
            {focused ? (
              <Text style={[type.caption, styles.now]}>Now</Text>
            ) : null}
          </View>
          {item.note ? (
            <Text style={[type.label, styles.meta, focused && styles.white]}>
              {item.note}
            </Text>
          ) : null}
          <Text
            style={[type.label, type.num, styles.meta, focused && styles.white]}
          >
            {targetLine(item)}
          </Text>
        </View>
      </View>

      <Text
        style={[type.label, type.num, styles.meta, focused && styles.white]}
      >
        {last
          ? `Last ${shortDate(last.date)}: ${last.sets
              .map(s => fmtSet(s, u, bw))
              .join(' · ')}`
          : 'First session for this exercise'}
      </Text>

      <View style={styles.chips}>
        {chips.map(c => (
          <SetChip
            key={c.key}
            index={c.index}
            text={c.text}
            state={
              c.id && c.id === editId
                ? 'next'
                : c.state === 'next' && !focused
                ? 'pending'
                : c.state
            }
            beat={c.beat}
            onRed={focused}
            onPress={c.id ? () => edit(c.id!) : undefined}
          />
        ))}
      </View>

      {hint != null && !done ? (
        <View
          style={styles.badge}
          accessibilityLabel={`Add load to ${fmtWeight(hint, u)} ${u}`}
        >
          <Icon
            name="trending-up-outline"
            size={18}
            color={focused ? colors.onAccent : colors.success}
          />
          <Text
            style={[
              type.label,
              type.num,
              { color: focused ? colors.onAccent : colors.success },
              focused && { fontWeight: '700' },
            ]}
          >
            Add load → {fmtWeight(hint, u)} {u}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.m,
    gap: space.s,
    overflow: 'hidden',
  },
  focused: { backgroundColor: colors.accent, borderColor: colors.accent },
  white: { color: colors.onAccent },
  pressedRed: { opacity: 0.85 },
  collapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: 56,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  header: { flexDirection: 'row', minHeight: 48, borderRadius: radius.input },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  flex: { flex: 1 },
  name: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  now: { color: colors.onAccent, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  badge: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
