import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import {
  deleteSession,
  getSession,
  SessionSummary,
} from '../../db/repositories/sessions';
import { sessionDetail } from '../../db/repositories/setLogs';
import { duration, longDate } from '../../lib/dates';
import { fmtSet } from '../../lib/format';
import type { RootProps } from '../../navigation/types';
import { useSession } from '../../store/sessionStore';
import { useSettings } from '../../store/settingsStore';
import { useSnackbar } from '../../store/snackbarStore';
import {
  colors,
  gutter,
  radius,
  ripple,
  space,
  type,
} from '../../theme/tokens';
import { usePendingDeletes } from './HistoryScreen';

type Row = Awaited<ReturnType<typeof sessionDetail>>[number];

export function SessionDetailScreen({
  route,
  navigation,
}: RootProps<'SessionDetail'>) {
  const { sessionId } = route.params;
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const units = useSettings(s => s.settings.units);

  useEffect(() => {
    getSession(sessionId).then(s => {
      setSession(s);
      if (s) navigation.setOptions({ title: s.label ?? 'Workout' });
    });
    sessionDetail(sessionId).then(setRows);
  }, [sessionId, navigation]);

  const groups = useMemo(() => {
    const m = new Map<string, Row[]>();
    for (const r of rows)
      m.set(r.exercise_id, [...(m.get(r.exercise_id) ?? []), r]);
    return [...m.values()];
  }, [rows]);

  const confirmDelete = () =>
    Alert.alert(
      'Delete this workout?',
      'All sets logged in this session will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            usePendingDeletes.setState(s => ({ ids: [...s.ids, sessionId] }));
            const unhide = () =>
              usePendingDeletes.setState(s => ({
                ids: s.ids.filter(x => x !== sessionId),
              }));
            navigation.goBack();
            useSnackbar.getState().show({
              message: 'Workout deleted',
              actionLabel: 'Undo',
              onAction: unhide,
              onExpire: async () => {
                await deleteSession(sessionId); // stays hidden; it no longer exists
                await useSession.getState().load();
              },
            });
          },
        },
      ],
    );

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {session ? (
          <Text style={[type.label, styles.meta]}>
            {longDate(session.date)} · {session.set_count} sets ·{' '}
            {duration(session.started_at, session.finished_at)}
          </Text>
        ) : null}
        {groups.map(g => (
          <View key={g[0].exercise_id} style={styles.card}>
            <Pressable
              onPress={() =>
                navigation.navigate('ExerciseHistory', {
                  exerciseId: g[0].exercise_id,
                })
              }
              android_ripple={ripple}
              accessibilityRole="button"
              accessibilityHint="Open exercise history"
              style={({ pressed }) => [
                styles.nameRow,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[type.heading, styles.text, styles.flex]}>
                {g[0].exercise_name}
              </Text>
              <Icon
                name="chevron-forward-outline"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
            {g.map(r => (
              <Text key={r.id} style={[type.body, type.num, styles.meta]}>
                {r.is_extra ? 'Extra' : `Set ${r.set_index + 1}`}{' '}
                {fmtSet(r, units, r.load_type === 'bodyweight')}
              </Text>
            ))}
          </View>
        ))}
        <View style={styles.danger}>
          <Button
            title="Delete workout"
            variant="outline"
            icon="trash-outline"
            onPress={confirmDelete}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: space.m },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.m,
    gap: space.xs,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    borderRadius: radius.input,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  danger: {
    marginTop: space.xxl,
    paddingTop: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
