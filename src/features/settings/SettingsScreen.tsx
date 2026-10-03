import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { exportBackup, saveToDownloads } from '../../backup/export';
import { dismissReminder, reminderDue } from '../../backup/reminder';
import { writeSnapshot } from '../../backup/snapshots';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { Snackbar } from '../../components/Snackbar';
import { getDb } from '../../db/client';
import { SCHEMA_VERSION } from '../../db/migrations';
import { getMeta } from '../../db/repositories/meta';
import { wipeAndReseed } from '../../db/seed';
import { useSession } from '../../store/sessionStore';
import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/snackbarStore';
import { colors, gutter, radius, space, touch, type } from '../../theme/tokens';
import { APP_VERSION } from '../../version';
import {
  batteryStatus,
  openAlarmSettings,
  openBatterySettings,
  openNotificationSettings,
  openOemPowerSettings,
  permissionStatus,
  PermissionStatus,
} from '../timer/notifications';
import { useTimer } from '../timer/timerStore';
import { startImport } from './importFlow';

const STEPS = [1.25, 2.5, 5];

export function SettingsScreen() {
  const { settings, update } = useSettings();
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [reminder, setReminder] = useState(false);
  const [perm, setPerm] = useState<PermissionStatus | null>(null);
  const [battery, setBattery] = useState<{
    optimized: boolean;
    oemSettings: boolean;
  } | null>(null);
  const [busy, setBusy] = useState<'export' | 'downloads' | null>(null);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const refresh = useCallback(() => {
    getMeta('last_backup_at').then(setLastBackup);
    reminderDue().then(setReminder);
    permissionStatus()
      .then(setPerm)
      .catch(() => {});
    batteryStatus()
      .then(setBattery)
      .catch(() => {});
  }, []);
  useFocusEffect(refresh);

  const doExport = async (kind: 'export' | 'downloads') => {
    if (busy) return;
    setBusy(kind);
    try {
      if (kind === 'export') {
        if (await exportBackup()) toast('Backup exported');
      } else {
        toast(`Saved to ${await saveToDownloads()}`, 4000);
      }
    } catch (e) {
      Alert.alert('Export failed', (e as Error).message);
    } finally {
      setBusy(null);
      refresh();
    }
  };

  const wipe = async () => {
    try {
      await writeSnapshot();
      await wipeAndReseed(getDb());
      useTimer.getState().skip();
      await useSettings.getState().load();
      useSession.setState({ loaded: false, skipped: {} });
      await useSession.getState().load();
      setWipeOpen(false);
      setConfirmText('');
      toast(
        'All data deleted. A safety snapshot was kept on this phone.',
        4000,
      );
      refresh();
    } catch (e) {
      Alert.alert('Delete failed', (e as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[type.title, styles.text]} accessibilityRole="header">
          Settings
        </Text>

        {reminder ? (
          <View style={styles.banner} accessibilityRole="alert">
            <Icon name="warning-outline" color={colors.warning} />
            <Text style={[type.label, { color: colors.warning, flex: 1 }]}>
              Last backup was more than 2 weeks ago.
            </Text>
            <Button
              title="Later"
              variant="text"
              onPress={async () => {
                await dismissReminder();
                setReminder(false);
              }}
            />
          </View>
        ) : null}

        <Section title="Units">
          <View style={styles.chips}>
            <Chip
              label="kg"
              selected={settings.units === 'kg'}
              onPress={() => update({ units: 'kg' })}
              style={styles.flex}
            />
            <Chip
              label="lb"
              selected={settings.units === 'lb'}
              onPress={() => update({ units: 'lb' })}
              style={styles.flex}
            />
          </View>
          <Text style={[type.label, styles.meta]}>
            Default weight step (kg)
          </Text>
          <View style={styles.chips}>
            {STEPS.map(s => (
              <Chip
                key={s}
                label={String(s)}
                selected={settings.default_step_kg === s}
                onPress={() => update({ default_step_kg: s })}
                style={styles.flex}
              />
            ))}
          </View>
        </Section>

        <Section title="Rest timer">
          <ToggleRow
            label="Sound"
            value={settings.timer_sound}
            onChange={v => update({ timer_sound: v })}
          />
          <ToggleRow
            label="Haptics"
            value={settings.timer_haptics}
            onChange={v => update({ timer_haptics: v })}
          />
          <StatusRow
            label="Notifications"
            ok={perm?.notifications ?? null}
            onOpen={() => openNotificationSettings().finally(refresh)}
          />
          {Platform.OS === 'android' && perm?.exactAlarm !== null ? (
            <StatusRow
              label="Exact alarms"
              ok={perm?.exactAlarm ?? null}
              onOpen={() => openAlarmSettings().finally(refresh)}
            />
          ) : null}
          {Platform.OS === 'android' ? (
            <StatusRow
              label="Battery restrictions"
              ok={battery ? !battery.optimized : null}
              okText="off"
              badText="on"
              onOpen={() => openBatterySettings().finally(refresh)}
            />
          ) : null}
          {battery?.oemSettings ? (
            <Button
              title="Phone's own battery settings"
              variant="secondary"
              onPress={() => openOemPowerSettings()}
            />
          ) : null}
          <Text style={[type.label, styles.meta]}>
            Rest alerts arrive when the phone is locked only if notifications
            are allowed and battery restrictions are off for AKey Logger.
          </Text>
        </Section>

        <Section title="Backup">
          <Text style={[type.label, styles.meta]}>
            Last backup:{' '}
            {lastBackup ? new Date(lastBackup).toLocaleString() : 'never'}
          </Text>
          <Button
            title="Export backup"
            large
            loading={busy === 'export'}
            onPress={() => doExport('export')}
          />
          <Button
            title="Import backup"
            variant="secondary"
            onPress={() => startImport()}
          />
          {Platform.OS === 'android' ? (
            <Button
              title="Save to Downloads"
              variant="secondary"
              loading={busy === 'downloads'}
              onPress={() => doExport('downloads')}
            />
          ) : null}
        </Section>

        <View style={styles.danger}>
          <Text style={[type.heading, styles.text]}>Danger zone</Text>
          <Button
            title="Delete all data"
            variant="outline"
            icon="trash-outline"
            onPress={() => setWipeOpen(true)}
          />
        </View>

        <Text style={[type.caption, styles.meta, styles.footer]}>
          AKey Logger {APP_VERSION} · schema v{SCHEMA_VERSION}
        </Text>
      </ScrollView>
      <Snackbar />

      <Sheet
        visible={wipeOpen}
        onClose={() => setWipeOpen(false)}
        title="Delete all data?"
      >
        <View style={styles.gap}>
          <Text style={[type.body, styles.text]}>
            This removes every workout, set and program change, and restores the
            default program. A safety snapshot is saved on this phone first.
            Export a backup if you want to keep your data.
          </Text>
          <Text style={[type.label, styles.meta]}>Type DELETE to confirm</Text>
          <TextInput
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            style={[type.body, styles.input]}
            accessibilityLabel="Type DELETE to confirm"
          />
          <Button
            title="Delete all data"
            variant="outline"
            icon="trash-outline"
            disabled={confirmText !== 'DELETE'}
            onPress={wipe}
          />
          <Button
            title="Cancel"
            variant="secondary"
            onPress={() => setWipeOpen(false)}
          />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={[type.heading, styles.text]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={[type.body, styles.text, styles.flex]}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.accent, false: colors.border }}
        thumbColor={colors.textPrimary}
        accessibilityLabel={label}
      />
    </View>
  );
}

function StatusRow({
  label,
  ok,
  onOpen,
  okText = 'allowed',
  badText = 'off',
}: {
  label: string;
  ok: boolean | null;
  onOpen: () => void;
  okText?: string;
  badText?: string;
}) {
  return (
    <View style={styles.row}>
      <Icon
        name={ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        color={ok ? colors.success : colors.warning}
      />
      <Text style={[type.body, styles.text, styles.flex]}>
        {label}: {ok == null ? '…' : ok ? okText : badText}
      </Text>
      <Button title="Open settings" variant="text" onPress={onOpen} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, gap: space.xl, paddingBottom: space.xxl },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
  flex: { flex: 1 },
  gap: { gap: space.m, paddingBottom: space.l },
  section: {
    gap: space.m,
    paddingTop: space.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  chips: { flexDirection: 'row', gap: space.s },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    minHeight: touch,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    padding: space.m,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  danger: {
    marginTop: space.xxl,
    paddingTop: space.xl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.m,
  },
  input: {
    minHeight: touch,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.input,
    color: colors.textPrimary,
    paddingHorizontal: space.m,
    borderWidth: 1,
    borderColor: colors.border,
  },
  footer: { textAlign: 'center' },
});
