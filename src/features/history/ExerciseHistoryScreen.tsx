import React, { useEffect, useMemo, useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { getExercise } from '../../db/repositories/exercises';
import { historyForExercise, HistoryRow } from '../../db/repositories/setLogs';
import type { Exercise } from '../../db/types';
import { longDate } from '../../lib/dates';
import { fmtSet } from '../../lib/format';
import type { RootProps } from '../../navigation/types';
import { useSettings } from '../../store/settingsStore';
import { colors, gutter, radius, space, type } from '../../theme/tokens';

/** Best = heaviest, then most reps. */
export const bestSet = (rows: HistoryRow[]) =>
  rows.reduce<HistoryRow | null>((b, r) => {
    if (!b) return r;
    const w = r.weight_kg ?? 0;
    const bw = b.weight_kg ?? 0;
    return w > bw || (w === bw && r.reps > b.reps) ? r : b;
  }, null);

export function ExerciseHistoryScreen({
  route,
  navigation,
}: RootProps<'ExerciseHistory'>) {
  const { exerciseId } = route.params;
  const [ex, setEx] = useState<Exercise | null>(null);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const units = useSettings(s => s.settings.units);

  useEffect(() => {
    getExercise(exerciseId).then(e => {
      setEx(e);
      if (e) navigation.setOptions({ title: e.name });
    });
    historyForExercise(exerciseId).then(setRows);
  }, [exerciseId, navigation]);

  const sections = useMemo(() => {
    const m = new Map<string, HistoryRow[]>();
    for (const r of rows ?? []) m.set(r.date, [...(m.get(r.date) ?? []), r]);
    return [...m.entries()].map(([date, data]) => ({ title: date, data }));
  }, [rows]);

  const bw = ex?.load_type === 'bodyweight';
  const best = rows ? bestSet(rows) : null;

  if (rows && !rows.length) {
    return (
      <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
        <EmptyState
          icon="time-outline"
          title="No sets logged for this exercise yet"
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <SectionList
        sections={sections}
        keyExtractor={r => r.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={
          best ? (
            <View
              style={styles.best}
              accessibilityLabel={`Best set ${fmtSet(
                best,
                units,
                bw,
              )} on ${longDate(best.date)}`}
            >
              <Icon name="trending-up-outline" color={colors.success} />
              <View>
                <Text style={[type.caption, styles.meta]}>Best set</Text>
                <Text style={[type.heading, type.num, styles.text]}>
                  {fmtSet(best, units, bw)}{' '}
                  <Text style={[type.label, styles.meta]}>
                    {longDate(best.date)}
                  </Text>
                </Text>
              </View>
            </View>
          ) : undefined
        }
        renderSectionHeader={({ section }) => (
          <Text style={[type.label, styles.section]}>
            {longDate(section.title)}
          </Text>
        )}
        renderItem={({ item }) => (
          <Text style={[type.body, type.num, styles.meta, styles.row]}>
            {item.is_extra ? 'Extra' : `Set ${item.set_index + 1}`}{' '}
            {fmtSet(item, units, bw)}
          </Text>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, paddingBottom: space.xxl },
  best: {
    flexDirection: 'row',
    gap: space.m,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.l,
    marginBottom: space.s,
  },
  section: {
    color: colors.textPrimary,
    marginTop: space.l,
    marginBottom: space.xs,
  },
  row: { paddingVertical: space.xs },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
});
