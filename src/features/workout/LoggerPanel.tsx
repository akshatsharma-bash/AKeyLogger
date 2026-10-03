import React from 'react';
import {
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../components/Button';
import { displayStep, roundDisplay } from '../../lib/units';
import { useSession } from '../../store/sessionStore';
import { useSettings } from '../../store/settingsStore';
import { colors, radius, space, type } from '../../theme/tokens';
import { RestTimerBar, RestTimerFull } from '../timer/RestTimer';
import { useTimer } from '../timer/timerStore';
import { itemProgress, stepKgFor } from './logic';
import { Stepper } from './Stepper';

const fmt = (n: number | null) => (n == null ? '' : String(n));

/** Reads fresh state on every call so long-press repeat never uses a stale value. */
function stepWeight(dir: 1 | -1) {
  const st = useSession.getState();
  const item = st.items.find(i => i.id === st.focusId);
  if (!item) return;
  const s = useSettings.getState().settings;
  const step = displayStep(stepKgFor(item, s), s.units);
  const cur = st.draft.weight ?? 0;
  st.setDraft({ weight: Math.max(0, roundDisplay(cur + dir * step, s.units)) });
}

function stepReps(dir: 1 | -1) {
  const st = useSession.getState();
  st.setDraft({ reps: Math.max(0, st.draft.reps + dir) });
}

export function LoggerPanel({
  onLayout,
  allDone,
}: {
  onLayout: (e: LayoutChangeEvent) => void;
  allDone: boolean;
}) {
  const item = useSession(s => s.items.find(i => i.id === s.focusId));
  const logs = useSession(s => s.logs);
  const skipped = useSession(s =>
    s.focusId ? s.skipped[s.focusId] : undefined,
  );
  const draft = useSession(s => s.draft);
  const mode = useSession(s => s.mode);
  const extra = useSession(s => s.extra);
  const editLog = useSession(s => s.editLog);
  const busy = useSession(s => s.busy);
  const session = useSession(s => s.session);
  const units = useSettings(s => s.settings.units);
  const timerOn = useTimer(s => s.endAt != null);
  const compact = useTimer(s => s.compact);
  const act = useSession.getState();

  const wrap = (children: React.ReactNode) => (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
      pointerEvents="box-none"
    >
      <View style={styles.panel} onLayout={onLayout}>
        {children}
      </View>
    </KeyboardAvoidingView>
  );

  if (timerOn && !compact && mode === 'log') return wrap(<RestTimerFull />);

  if (!item || (allDone && mode === 'log' && !extra)) {
    if (!session) return wrap(null);
    return wrap(
      <View style={styles.gap}>
        {timerOn ? <RestTimerBar /> : null}
        {session.finished_at ? (
          <Text style={[type.body, styles.center]}>Workout finished.</Text>
        ) : (
          <Button title="Finish workout" large onPress={() => act.finish()} />
        )}
        {item && !session.finished_at ? (
          <Button
            title="+ Extra set"
            variant="text"
            onPress={() => act.setExtra(true)}
          />
        ) : null}
      </View>,
    );
  }

  const p = itemProgress(item, logs, skipped);
  const bw = item.exercise.load_type === 'bodyweight';
  const showWeight = !bw || draft.bwAdded;
  const isExtra = mode === 'log' && (extra || p.next === null);
  const title =
    mode === 'edit' && editLog
      ? `Edit · ${
          editLog.is_extra ? 'Extra set' : `Set ${editLog.set_index + 1}`
        }`
      : isExtra
      ? 'Extra set'
      : `Set ${(p.next ?? 0) + 1} of ${item.sets}`;
  const needsWeight = !bw && !(draft.weight && draft.weight > 0);

  return wrap(
    <>
      {timerOn && compact ? <RestTimerBar /> : null}
      <Text
        style={[type.label, styles.title]}
        numberOfLines={1}
        accessibilityRole="header"
      >
        <Text style={styles.titleName}>{item.exercise.name}</Text> · {title}
      </Text>

      <View style={styles.gap}>
        {showWeight ? (
          <View>
            <Stepper
              label={bw ? 'Added weight' : 'Weight'}
              value={fmt(draft.weight)}
              unit={units}
              decimal
              onStep={stepWeight}
              onSubmit={n => act.setDraft({ weight: roundDisplay(n, units) })}
            />
            {bw ? (
              <Pressable
                onPress={() => act.setDraft({ bwAdded: false, weight: null })}
                hitSlop={12}
                accessibilityRole="button"
                style={styles.link}
              >
                <Text style={[type.label, { color: colors.accentText }]}>
                  Remove added weight
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={styles.bwRow}>
            <View style={styles.bwTag}>
              <Text style={[type.heading, { color: colors.textPrimary }]}>
                BW
              </Text>
            </View>
            <Pressable
              onPress={() => act.setDraft({ bwAdded: true })}
              hitSlop={12}
              accessibilityRole="button"
              style={styles.link}
            >
              <Text style={[type.label, { color: colors.accentText }]}>
                + add weight
              </Text>
            </Pressable>
          </View>
        )}
        <Stepper
          label="Reps"
          value={String(draft.reps)}
          unit="reps"
          onStep={stepReps}
          onSubmit={n => act.setDraft({ reps: Math.max(0, n) })}
        />
      </View>

      {mode === 'edit' ? (
        <View style={styles.gap}>
          <Button title="UPDATE SET" large onPress={() => act.saveEdit()} />
          <View style={styles.row}>
            <Button
              title="Cancel"
              variant="secondary"
              onPress={act.cancelEdit}
              style={styles.flex}
            />
            <Button
              title="Delete"
              variant="outline"
              icon="trash-outline"
              onPress={act.deleteEdit}
              style={styles.flex}
            />
          </View>
        </View>
      ) : (
        <View style={styles.gap}>
          <Button
            title={
              needsWeight
                ? 'Set starting weight'
                : isExtra
                ? 'LOG EXTRA SET'
                : 'LOG SET'
            }
            large
            disabled={needsWeight}
            loading={busy}
            onPress={() => act.logSet()}
          />
          <View style={styles.row}>
            {extra ? (
              <Button
                title="Cancel extra"
                variant="text"
                onPress={() => act.setExtra(false)}
                style={styles.flex}
              />
            ) : (
              <Button
                title="+ Extra set"
                variant="text"
                onPress={() => act.setExtra(true)}
                style={styles.flex}
              />
            )}
            {p.next !== null && !extra ? (
              <Button
                title="Skip set"
                variant="text"
                onPress={act.skipSet}
                style={styles.flex}
              />
            ) : null}
          </View>
        </View>
      )}
    </>,
  );
}

const styles = StyleSheet.create({
  kav: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
    gap: space.s,
  },
  title: { color: colors.textSecondary },
  titleName: { color: colors.textPrimary, fontWeight: '600' },
  gap: { gap: space.s },
  row: { flexDirection: 'row', gap: space.s },
  flex: { flex: 1 },
  center: {
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: space.m,
  },
  bwRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
  },
  bwTag: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    paddingHorizontal: space.l,
    minHeight: 48,
    justifyContent: 'center',
  },
  link: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
});
