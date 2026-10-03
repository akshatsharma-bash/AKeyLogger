import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mergeInto, replaceAll, summarize } from '../../backup/import';
import { writeSnapshot } from '../../backup/snapshots';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { getDb } from '../../db/client';
import { longDate } from '../../lib/dates';
import type { RootProps } from '../../navigation/types';
import { useImportStore } from '../../store/importStore';
import { useSession } from '../../store/sessionStore';
import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/snackbarStore';
import { useTimer } from '../timer/timerStore';
import {
  colors,
  gutter,
  radius,
  ripple,
  space,
  touch,
  type,
} from '../../theme/tokens';
import { fail } from './importFlow';

export function ImportReviewScreen({
  route,
  navigation,
}: RootProps<'ImportReview'>) {
  const key = route.params.parsedBackupKey;
  const backup = useImportStore(s => s.backups[key]);
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [replaceProgram, setReplaceProgram] = useState(false);
  const [busy, setBusy] = useState(false);
  const info = useMemo(() => (backup ? summarize(backup) : null), [backup]);

  useEffect(() => () => useImportStore.getState().take(key), [key]);

  if (!backup || !info) return <View style={styles.screen} />;

  const run = async () => {
    setBusy(true);
    try {
      let n = info.sessions;
      if (mode === 'replace') {
        await writeSnapshot();
        await replaceAll(getDb(), backup);
      } else {
        n = (await mergeInto(getDb(), backup, replaceProgram)).sessions;
      }
      useTimer.getState().skip();
      await useSettings.getState().load();
      useSession.setState({ loaded: false, skipped: {} });
      await useSession.getState().load();
      toast(`Imported ${n} session${n === 1 ? '' : 's'}`);
      navigation.goBack();
    } catch (e) {
      setBusy(false);
      navigation.goBack();
      fail(`The import was rolled back: ${(e as Error).message}`);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Row
            label="Exported"
            value={new Date(info.exportedAt).toLocaleString()}
          />
          <Row label="Sessions" value={String(info.sessions)} />
          <Row label="Set logs" value={String(info.setLogs)} />
          <Row
            label="Date range"
            value={
              info.from
                ? `${longDate(info.from)} – ${longDate(info.to!)}`
                : 'No sessions'
            }
          />
          <Row label="Program" value={info.days.join(', ')} />
        </View>

        <Option
          selected={mode === 'replace'}
          title="Replace all data"
          body="Use this when moving to a new phone. Your current data is replaced. A safety snapshot is saved first."
          onPress={() => setMode('replace')}
        />
        <Option
          selected={mode === 'merge'}
          title="Merge"
          body="Add sessions and sets that are not already on this phone. Nothing existing is overwritten."
          onPress={() => setMode('merge')}
        />
        {mode === 'merge' ? (
          <Pressable
            onPress={() => setReplaceProgram(!replaceProgram)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: replaceProgram }}
            style={({ pressed }) => [
              styles.check,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon
              name={replaceProgram ? 'checkbox-outline' : 'square-outline'}
              color={replaceProgram ? colors.accentText : colors.textSecondary}
            />
            <Text style={[type.body, styles.text]}>
              Also replace my program
            </Text>
          </Pressable>
        ) : null}

        <Button
          title={mode === 'replace' ? 'Replace all data' : 'Merge'}
          large
          loading={busy}
          onPress={run}
        />
        <Button
          title="Cancel"
          variant="secondary"
          onPress={() => navigation.goBack()}
          disabled={busy}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={[type.label, styles.meta, styles.rowLabel]}>{label}</Text>
      <Text style={[type.body, type.num, styles.text, styles.flex]}>
        {value}
      </Text>
    </View>
  );
}

function Option({
  selected,
  title,
  body,
  onPress,
}: {
  selected: boolean;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={ripple}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.option,
        selected && styles.optionOn,
        pressed && { backgroundColor: colors.surfaceAlt },
      ]}
    >
      <Icon
        name={selected ? 'radio-button-on-outline' : 'radio-button-off-outline'}
        color={selected ? colors.accentText : colors.textSecondary}
      />
      <View style={styles.flex}>
        <Text style={[type.heading, styles.text]}>{title}</Text>
        <Text style={[type.label, styles.meta]}>{body}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: space.m, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.l,
    gap: space.s,
  },
  row: { flexDirection: 'row', gap: space.m },
  rowLabel: { width: 88 },
  flex: { flex: 1 },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  option: {
    flexDirection: 'row',
    gap: space.m,
    padding: space.l,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  optionOn: { borderColor: colors.accentText },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: touch,
  },
});
