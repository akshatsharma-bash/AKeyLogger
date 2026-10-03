import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidVisibility,
  AndroidImportance,
  AndroidNotificationSetting,
  AuthorizationStatus,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import { getMeta, setMeta } from '../../db/repositories/meta';

export const NOTIF_ID = 'rest-timer';
// Android locks a channel's sound once created, so the custom sound needs a new channel id.
const CH_SOUND = 'rest-timer-v2';
const CH_SILENT = 'rest-timer-silent';
const OLD_CHANNELS = ['rest-timer'];
// Bundled alert: android/app/src/main/res/raw/rest_end.mp3, ios/AKeyLogger/rest_end.wav
const SOUND_ANDROID = 'rest_end';
const SOUND_IOS = 'rest_end.wav';

let channelsReady = false;
async function ensureChannels() {
  if (channelsReady || Platform.OS !== 'android') return;
  for (const id of OLD_CHANNELS)
    await notifee.deleteChannel(id).catch(() => {});
  await notifee.createChannel({
    id: CH_SOUND,
    name: 'Rest timer',
    importance: AndroidImportance.HIGH,
    sound: SOUND_ANDROID,
    vibration: true,
  });
  await notifee.createChannel({
    id: CH_SILENT,
    name: 'Rest timer (silent)',
    importance: AndroidImportance.HIGH,
    vibration: true,
  });
  channelsReady = true;
}

export interface PermissionStatus {
  notifications: boolean;
  exactAlarm: boolean | null; // null = not applicable (iOS / old Android)
}

export async function permissionStatus(): Promise<PermissionStatus> {
  const s = await notifee.getNotificationSettings();
  const alarm = Platform.OS === 'android' ? s.android?.alarm : undefined;
  return {
    notifications:
      s.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      s.authorizationStatus === AuthorizationStatus.PROVISIONAL,
    exactAlarm:
      alarm === undefined || alarm === AndroidNotificationSetting.NOT_SUPPORTED
        ? null
        : alarm === AndroidNotificationSetting.ENABLED,
  };
}

/** Asked on first timer start, not at launch. Returns hints to show (once each). */
export async function ensurePermissionOnce(): Promise<{
  deniedHint: boolean;
  exactAlarmPrompt: boolean;
}> {
  const asked = await getMeta('notif_asked');
  if (!asked) {
    await setMeta('notif_asked', '1');
    await notifee.requestPermission();
  }
  const st = await permissionStatus();
  let deniedHint = false;
  let exactAlarmPrompt = false;
  if (!st.notifications && !(await getMeta('notif_denied_hint'))) {
    await setMeta('notif_denied_hint', '1');
    deniedHint = true;
  }
  if (
    st.notifications &&
    st.exactAlarm === false &&
    !(await getMeta('exact_alarm_prompt'))
  ) {
    await setMeta('exact_alarm_prompt', '1');
    exactAlarmPrompt = true;
  }
  return { deniedHint, exactAlarmPrompt };
}

export async function scheduleRestEnd(
  endAt: number,
  body: string,
  sound: boolean,
) {
  await notifee.cancelNotification(NOTIF_ID);
  if (endAt <= Date.now()) return;
  await ensureChannels();
  const st = await permissionStatus();
  if (!st.notifications) return;
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: endAt,
    // Always go through AlarmManager: without it notifee falls back to WorkManager, which
    // Doze and OEM battery savers (MIUI, OneUI) delay by minutes or drop entirely.
    // SET_ALARM_CLOCK is the one alarm type Android treats as user-facing and fires on time when locked.
    alarmManager:
      Platform.OS === 'android'
        ? {
            type:
              st.exactAlarm === false
                ? AlarmType.SET_AND_ALLOW_WHILE_IDLE
                : AlarmType.SET_ALARM_CLOCK,
          }
        : undefined,
  };
  await notifee.createTriggerNotification(
    {
      id: NOTIF_ID,
      title: 'Rest over',
      body,
      android: {
        channelId: sound ? CH_SOUND : CH_SILENT,
        pressAction: { id: 'default' },
        smallIcon: 'ic_notification',
        category: AndroidCategory.ALARM,
        visibility: AndroidVisibility.PUBLIC, // show on the lock screen
      },
      ios: {
        sound: sound ? SOUND_IOS : undefined,
        foregroundPresentationOptions: {
          banner: false,
          list: false,
          sound, // play the custom alert in the app too; the panel replaces the banner
          badge: false,
        },
      },
    },
    trigger,
  );
}

export const cancelRestEnd = () => notifee.cancelNotification(NOTIF_ID);

/** Foreground end on Android: the trigger already played its sound; clear it from the tray shortly after. */
export const clearDisplayedSoon = () =>
  setTimeout(() => notifee.cancelDisplayedNotification(NOTIF_ID), 4000);

export const openNotificationSettings = () =>
  notifee.openNotificationSettings();
export const openAlarmSettings = () => notifee.openAlarmPermissionSettings();

/** Android battery optimisation kills scheduled alerts on many phones. */
export async function batteryStatus(): Promise<{
  optimized: boolean;
  oemSettings: boolean;
}> {
  if (Platform.OS !== 'android')
    return { optimized: false, oemSettings: false };
  const [optimized, pm] = await Promise.all([
    notifee.isBatteryOptimizationEnabled(),
    notifee.getPowerManagerInfo(),
  ]);
  return { optimized, oemSettings: !!pm.activity };
}
export const openBatterySettings = () =>
  notifee.openBatteryOptimizationSettings();
export const openOemPowerSettings = () => notifee.openPowerManagerSettings();
