import { Alert, AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { hapticAlarm } from '../../lib/haptics';
import { useSettings } from '../../store/settingsStore';
import { toast } from '../../store/snackbarStore';
import {
  cancelRestEnd,
  clearDisplayedSoon,
  ensurePermissionOnce,
  openAlarmSettings,
  scheduleRestEnd,
} from './notifications';

interface S {
  endAt: number | null; // epoch ms
  total: number; // seconds, for progress
  label: string; // "Rest · next: Set 3 of 3"
  compact: boolean; // shrinks to a bar when the user taps a card mid-rest
  start: (seconds: number, label: string) => void;
  adjust: (deltaSec: number) => void;
  skip: () => void;
  /** Called by the ticking UI when remaining hits zero while active. */
  complete: () => void;
}

const reschedule = (endAt: number, label: string) => {
  const { timer_sound } = useSettings.getState().settings;
  scheduleRestEnd(endAt, label.replace('Rest · ', 'Up '), timer_sound).catch(
    () => {},
  );
};

async function firstStartPrompts() {
  try {
    const r = await ensurePermissionOnce();
    if (r.deniedHint)
      toast('Allow notifications to get alerts when your screen is off.', 5000);
    if (r.exactAlarmPrompt) {
      Alert.alert(
        'Exact rest alerts',
        'Allow alarms so rest alerts arrive on time when the screen is off. Without it they may be a few seconds late.',
        [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open settings', onPress: () => openAlarmSettings() },
        ],
      );
    }
  } catch {}
}

export const useTimer = create<S>((set, get) => ({
  endAt: null,
  total: 0,
  label: '',
  compact: false,
  start: (seconds, label) => {
    const endAt = Date.now() + seconds * 1000;
    set({ endAt, total: seconds, label, compact: false });
    firstStartPrompts().finally(() => reschedule(endAt, label));
  },
  adjust: delta => {
    const { endAt, label, total } = get();
    if (!endAt) return;
    const next = Math.max(Date.now() + 1000, endAt + delta * 1000);
    set({ endAt: next, total: Math.max(1, total + delta) });
    reschedule(next, label);
  },
  skip: () => {
    set({ endAt: null });
    cancelRestEnd().catch(() => {});
  },
  complete: () => {
    if (!get().endAt) return;
    set({ endAt: null });
    if (useSettings.getState().settings.timer_haptics) hapticAlarm();
    if (Platform.OS === 'android' && AppState.currentState === 'active')
      clearDisplayedSoon();
    else cancelRestEnd().catch(() => {});
  },
}));
