import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { retireExerciseIfUnused } from '../../db/repositories/exercises';
import {
  deleteItem,
  getDay,
  itemsForDay,
  reorderItems,
  updateDay,
} from '../../db/repositories/program';
import type { Item, ProgramDay } from '../../db/types';
import { WEEKDAY_LONG } from '../../lib/dates';
import { targetLine } from '../../lib/format';
import type { RootProps } from '../../navigation/types';
import { toast } from '../../store/snackbarStore';
import {
  colors,
  gutter,
  radius,
  ripple,
  space,
  touch,
  type,
} from '../../theme/tokens';
import { Field, Input } from './fields';
import { useUnsavedGuard } from './useUnsavedGuard';

export function EditDayScreen({ route, navigation }: RootProps<'EditDay'>) {
  const { dayId } = route.params;
  const [saved, setSaved] = useState<ProgramDay | null>(null);
  const [day, setDay] = useState<ProgramDay | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    getDay(dayId).then(d => {
      setSaved(d);
      setDay(d);
      if (d) navigation.setOptions({ title: WEEKDAY_LONG[d.weekday - 1] });
    });
  }, [dayId, navigation]);

  useFocusEffect(
    useCallback(() => {
      itemsForDay(dayId).then(setItems);
    }, [dayId]),
  );

  const dirty =
    !!day &&
    !!saved &&
    (day.label !== saved.label ||
      day.is_rest_day !== saved.is_rest_day ||
      (day.rest_note ?? '') !== (saved.rest_note ?? ''));
  const leave = useUnsavedGuard(dirty);

  const move = async (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
    await reorderItems(next.map(x => x.id));
  };

  const remove = (it: Item) =>
    Alert.alert(
      `Remove ${it.exercise.name}?`,
      'Logged history for this exercise is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteItem(it.id);
            await retireExerciseIfUnused(it.exercise_id);
            setItems(await itemsForDay(dayId));
          },
        },
      ],
    );

  const save = async () => {
    if (!day) return;
    if (!day.label.trim())
      return Alert.alert('Label required', 'Give this day a name.');
    await updateDay({
      ...day,
      label: day.label.trim(),
      rest_note: day.rest_note?.trim() || null,
    });
    toast('Saved. Applies from your next session.');
    leave();
  };

  if (!day) return <View style={styles.screen} />;

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Field label="Label">
          <Input
            label="Day label"
            value={day.label}
            onChangeText={label => setDay({ ...day, label })}
            maxLength={40}
          />
        </Field>
        <View style={styles.switchRow}>
          <Text style={[type.body, styles.text, styles.flex]}>Rest day</Text>
          <Switch
            value={!!day.is_rest_day}
            onValueChange={v => setDay({ ...day, is_rest_day: v ? 1 : 0 })}
            trackColor={{ true: colors.accent, false: colors.border }}
            thumbColor={colors.textPrimary}
            accessibilityLabel="Rest day"
          />
        </View>
        {day.is_rest_day ? (
          <Field label="Rest note">
            <Input
              label="Rest note"
              value={day.rest_note ?? ''}
              onChangeText={rest_note => setDay({ ...day, rest_note })}
              multiline
            />
          </Field>
        ) : null}

        <Text style={[type.heading, styles.text, styles.section]}>
          Exercises
        </Text>
        {items.map((it, i) => (
          <View key={it.id} style={styles.item}>
            <Pressable
              style={({ pressed }) => [
                styles.itemMain,
                pressed && styles.pressed,
              ]}
              android_ripple={ripple}
              onPress={() =>
                navigation.navigate('EditItem', { itemId: it.id, dayId })
              }
              accessibilityRole="button"
              accessibilityHint="Edit exercise"
            >
              <Text style={[type.body, styles.text]}>
                {it.superset_group ? (
                  <Text style={{ color: colors.accentText }}>
                    {it.superset_group} ·{' '}
                  </Text>
                ) : null}
                {it.exercise.name}
              </Text>
              <Text style={[type.label, type.num, styles.meta]}>
                {targetLine(it)}
              </Text>
            </Pressable>
            <IconBtn
              icon="chevron-up-outline"
              label={`Move ${it.exercise.name} up`}
              onPress={() => move(i, -1)}
              disabled={i === 0}
            />
            <IconBtn
              icon="chevron-down-outline"
              label={`Move ${it.exercise.name} down`}
              onPress={() => move(i, 1)}
              disabled={i === items.length - 1}
            />
            <IconBtn
              icon="trash-outline"
              label={`Remove ${it.exercise.name}`}
              onPress={() => remove(it)}
            />
          </View>
        ))}
        <Button
          title="Add exercise"
          variant="secondary"
          onPress={() => navigation.navigate('EditItem', { dayId })}
        />
        <Button
          title="Save"
          large
          onPress={save}
          disabled={!dirty}
          style={styles.save}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function IconBtn({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      android_ripple={ripple}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.iconBtn,
        pressed && styles.pressed,
        disabled && { opacity: 0.3 },
      ]}
    >
      <Icon name={icon} size={20} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: space.l, paddingBottom: space.xxl },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  flex: { flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', minHeight: touch },
  section: { marginTop: space.s },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: space.m,
    overflow: 'hidden',
  },
  itemMain: {
    flex: 1,
    minHeight: 56,
    justifyContent: 'center',
    paddingVertical: space.s,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  iconBtn: {
    width: touch,
    height: touch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  save: { marginTop: space.l },
});
