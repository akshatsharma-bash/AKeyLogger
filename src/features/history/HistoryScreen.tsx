import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { create } from 'zustand';
import { EmptyState } from '../../components/EmptyState';
import { Icon } from '../../components/Icon';
import { Snackbar } from '../../components/Snackbar';
import { listSessions, SessionSummary } from '../../db/repositories/sessions';
import { duration, longDate } from '../../lib/dates';
import { colors, gutter, ripple, space, type } from '../../theme/tokens';

/** Sessions hidden while their delete waits on the undo snackbar. */
export const usePendingDeletes = create<{ ids: string[] }>(() => ({ ids: [] }));

export function HistoryScreen() {
  const nav = useNavigation();
  const [rows, setRows] = useState<SessionSummary[] | null>(null);
  const hidden = usePendingDeletes(s => s.ids);

  useFocusEffect(
    useCallback(() => {
      listSessions().then(setRows);
    }, [hidden]), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const data = (rows ?? []).filter(r => !hidden.includes(r.id));

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={[type.title, styles.title]} accessibilityRole="header">
        History
      </Text>
      {rows && !data.length ? (
        <EmptyState
          icon="barbell-outline"
          title="No workouts yet"
          action="Go to Workout"
          onAction={() => nav.navigate('Tabs', { screen: 'Workout' })}
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={r => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                nav.navigate('SessionDetail', { sessionId: item.id })
              }
              android_ripple={ripple}
              accessibilityRole="button"
              accessibilityLabel={`${longDate(item.date)}, ${
                item.label ?? 'Workout'
              }, ${item.set_count} sets, ${duration(
                item.started_at,
                item.finished_at,
              )}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <View style={styles.flex}>
                <Text style={[type.body, styles.text]}>
                  {longDate(item.date)}
                </Text>
                <Text style={[type.label, styles.meta]}>
                  {item.label ?? 'Workout'} · {item.set_count} sets ·{' '}
                  {duration(item.started_at, item.finished_at)}
                </Text>
              </View>
              <Icon
                name="chevron-forward-outline"
                color={colors.textSecondary}
                size={20}
              />
            </Pressable>
          )}
        />
      )}
      <Snackbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.textPrimary,
    paddingHorizontal: gutter,
    paddingVertical: space.m,
  },
  list: { paddingHorizontal: gutter, paddingBottom: space.xl },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
});
