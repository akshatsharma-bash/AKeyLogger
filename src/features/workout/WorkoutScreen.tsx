import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShallow } from 'zustand/react/shallow';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Snackbar } from '../../components/Snackbar';
import { exportBackup } from '../../backup/export';
import {
  WEEKDAY_SHORT,
  WEEKDAY_LONG,
  headerDate,
  weekdayOf,
} from '../../lib/dates';
import { useSession } from '../../store/sessionStore';
import { toast } from '../../store/snackbarStore';
import {
  colors,
  gutter,
  radius,
  ripple,
  space,
  type,
} from '../../theme/tokens';
import { ExerciseCard } from './ExerciseCard';
import {
  useBackClosesEdit,
  useDayRollover,
  useSessionKeepAwake,
} from './hooks';
import { itemProgress } from './logic';
import { LoggerPanel } from './LoggerPanel';

export function WorkoutScreen() {
  const {
    day,
    items,
    days,
    weekday,
    focusId,
    logs,
    skipped,
    session,
    summary,
    loaded,
  } = useSession(
    useShallow(s => ({
      day: s.day,
      items: s.items,
      days: s.days,
      weekday: s.weekday,
      focusId: s.focusId,
      logs: s.logs,
      skipped: s.skipped,
      session: s.session,
      summary: s.summary,
      loaded: s.loaded,
    })),
  );
  const [panelH, setPanelH] = useState(0);
  const [pickDay, setPickDay] = useState(false);
  const today = weekdayOf();

  useEffect(() => {
    if (!loaded) useSession.getState().load(today);
  }, [loaded, today]);
  useDayRollover();
  useBackClosesEdit();

  const { planned, logged, allDone } = useMemo(() => {
    let p = 0;
    let l = 0;
    let handled = 0;
    for (const i of items) {
      const pr = itemProgress(i, logs, skipped[i.id]);
      p += i.sets;
      l += pr.logged.size;
      handled += pr.handled;
    }
    return { planned: p, logged: l, allDone: p > 0 && handled >= p };
  }, [items, logs, skipped]);

  useSessionKeepAwake(!!session && !session.finished_at && !allDone);

  // Group consecutive superset items.
  const groups = useMemo(() => {
    const out: { key: string; ss: string | null; ids: string[] }[] = [];
    for (const i of items) {
      const prev = out[out.length - 1];
      if (i.superset_group && prev?.ss === i.superset_group)
        prev.ids.push(i.id);
      else out.push({ key: i.id, ss: i.superset_group, ids: [i.id] });
    }
    return out;
  }, [items]);

  const isRest = !!day?.is_rest_day;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headRow}>
          <Text style={[type.title, styles.text]} accessibilityRole="header">
            {headerDate()}
          </Text>
          {!isRest && planned > 0 ? (
            <Text
              style={[type.label, type.num, styles.meta]}
              accessibilityLabel={`${logged} of ${planned} sets logged`}
            >
              {logged} / {planned} sets
            </Text>
          ) : null}
        </View>
        {!isRest && planned > 0 ? (
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${(logged / planned) * 100}%` }]}
            />
          </View>
        ) : null}
        <View style={styles.chips}>
          {WEEKDAY_SHORT.map((d, i) => (
            <Chip
              key={d}
              label={d}
              selected={weekday === i + 1}
              dot={today === i + 1}
              onPress={() => useSession.getState().load(i + 1)}
              style={styles.dayChip}
              accessibilityLabel={`${WEEKDAY_LONG[i]}${
                today === i + 1 ? ', today' : ''
              }`}
            />
          ))}
        </View>
      </View>

      {isRest ? (
        <ScrollView contentContainerStyle={styles.restWrap}>
          <Text style={[type.title, styles.text]}>{day?.label}</Text>
          {day?.rest_note ? (
            <Text style={[type.body, styles.meta]}>{day.rest_note}</Text>
          ) : null}
          <Button
            title="Log a workout anyway"
            variant="outline"
            onPress={() => setPickDay(true)}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.list,
            { paddingBottom: panelH + space.l },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {groups.map(g =>
            g.ids.length > 1 ? (
              <View key={g.key} style={styles.superset}>
                <Text style={[type.caption, styles.ssLabel]}>
                  Superset {g.ss}
                </Text>
                {g.ids.map(id => (
                  <ExerciseCard key={id} itemId={id} focused={id === focusId} />
                ))}
              </View>
            ) : (
              <ExerciseCard
                key={g.key}
                itemId={g.key}
                focused={g.key === focusId}
              />
            ),
          )}
          {loaded && !items.length ? (
            <Text style={[type.body, styles.meta, styles.center]}>
              No exercises on this day. Add some in Program.
            </Text>
          ) : null}
        </ScrollView>
      )}

      {!isRest && items.length ? (
        <LoggerPanel
          allDone={allDone}
          onLayout={e => setPanelH(e.nativeEvent.layout.height)}
        />
      ) : null}
      <Snackbar bottom={(isRest ? 0 : panelH) + space.s} />

      <Sheet
        visible={pickDay}
        onClose={() => setPickDay(false)}
        title="Log which workout?"
      >
        {days
          .filter(d => !d.is_rest_day)
          .map(d => (
            <Pressable
              key={d.id}
              android_ripple={ripple}
              accessibilityRole="button"
              onPress={() => {
                setPickDay(false);
                useSession.getState().load(d.weekday);
              }}
              style={({ pressed }) => [
                styles.pickRow,
                pressed && { backgroundColor: colors.surfaceAlt },
              ]}
            >
              <Text style={[type.body, styles.text]}>{d.label}</Text>
              <Text style={[type.label, styles.meta]}>
                {WEEKDAY_LONG[d.weekday - 1]}
              </Text>
            </Pressable>
          ))}
      </Sheet>

      <Sheet
        visible={!!summary}
        onClose={() => useSession.getState().closeSummary()}
        title="Workout summary"
      >
        {summary ? (
          <View style={styles.summary}>
            <SummaryRow label="Duration" value={`${summary.durationMin} min`} />
            <SummaryRow label="Sets logged" value={String(summary.sets)} />
            <SummaryRow
              beat
              label="Beat last session"
              value={String(summary.beat)}
              color={colors.success}
            />
            {summary.reminder ? (
              <View style={styles.reminder}>
                <Icon name="warning-outline" color={colors.warning} />
                <Text style={[type.label, { color: colors.warning, flex: 1 }]}>
                  No backup in over 2 weeks.
                </Text>
                <Button
                  title="Export"
                  variant="secondary"
                  onPress={async () => {
                    try {
                      if (await exportBackup()) {
                        useSession.setState({
                          summary: { ...summary, reminder: false },
                        });
                        toast('Backup exported');
                      }
                    } catch (e) {
                      toast(`Export failed: ${(e as Error).message}`);
                    }
                  }}
                />
              </View>
            ) : null}
            <Button
              title="Done"
              large
              onPress={() => useSession.getState().closeSummary()}
            />
          </View>
        ) : null}
      </Sheet>
    </SafeAreaView>
  );
}

function SummaryRow({
  label,
  value,
  beat,
  color = colors.textPrimary,
}: {
  label: string;
  value: string;
  beat?: boolean;
  color?: string;
}) {
  return (
    <View style={styles.sumRow}>
      {beat ? <Icon name="arrow-up-outline" size={18} color={color} /> : null}
      <Text style={[type.body, styles.text, { flex: 1 }]}>{label}</Text>
      <Text style={[type.heading, type.num, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: gutter,
    paddingTop: space.s,
    paddingBottom: space.m,
    gap: space.s,
  },
  headRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  center: { textAlign: 'center' },
  track: {
    height: 3,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: { height: 3, backgroundColor: colors.accent },
  chips: { flexDirection: 'row', gap: 4 },
  dayChip: { flex: 1, minWidth: 0, paddingHorizontal: 0 },
  list: { paddingHorizontal: gutter, gap: space.m },
  superset: { gap: space.s },
  ssLabel: { color: colors.textSecondary, fontWeight: '600' },
  restWrap: { padding: gutter, paddingTop: space.xl, gap: space.l },
  stretch: { alignSelf: 'stretch' },
  pickRow: {
    minHeight: 56,
    paddingHorizontal: space.s,
    justifyContent: 'center',
    borderRadius: radius.input,
  },
  summary: { gap: space.l },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: 48,
  },
  reminder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    padding: space.m,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.warning,
  },
});
