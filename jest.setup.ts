/* Native module mocks. The DB is replaced per-test with an in-memory node:sqlite DB (test-utils/sqliteDb). */

jest.mock('@op-engineering/op-sqlite', () => ({ open: jest.fn() }));

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(async () => 'rest-timer'),
    deleteChannel: jest.fn(async () => {}),
    createTriggerNotification: jest.fn(async () => 'rest-timer'),
    cancelNotification: jest.fn(async () => {}),
    cancelDisplayedNotification: jest.fn(async () => {}),
    displayNotification: jest.fn(async () => 'rest-timer'),
    requestPermission: jest.fn(async () => ({ authorizationStatus: 1 })),
    getNotificationSettings: jest.fn(async () => ({
      authorizationStatus: 1,
      android: { alarm: 1 },
    })),
    openAlarmPermissionSettings: jest.fn(async () => {}),
    openNotificationSettings: jest.fn(async () => {}),
    onForegroundEvent: jest.fn(() => () => {}),
    onBackgroundEvent: jest.fn(),
    getInitialNotification: jest.fn(async () => null),
    isBatteryOptimizationEnabled: jest.fn(async () => false),
    getPowerManagerInfo: jest.fn(async () => ({ activity: null })),
    openBatteryOptimizationSettings: jest.fn(async () => {}),
    openPowerManagerSettings: jest.fn(async () => {}),
  },
  AndroidImportance: { HIGH: 4, LOW: 2 },
  AuthorizationStatus: {
    NOT_DETERMINED: -1,
    DENIED: 0,
    AUTHORIZED: 1,
    PROVISIONAL: 2,
  },
  AndroidNotificationSetting: { NOT_SUPPORTED: -1, DISABLED: 0, ENABLED: 1 },
  TriggerType: { TIMESTAMP: 0 },
  AlarmType: { SET_AND_ALLOW_WHILE_IDLE: 1, SET_ALARM_CLOCK: 4 },
  AndroidCategory: { ALARM: 'alarm' },
  AndroidVisibility: { PUBLIC: 1 },
  EventType: { PRESS: 1 },
}));

jest.mock('react-native-blob-util', () => ({
  __esModule: true,
  default: {
    fs: {
      dirs: { CacheDir: '/cache', DocumentDir: '/docs' },
      writeFile: jest.fn(async () => {}),
      readFile: jest.fn(async () => ''),
      exists: jest.fn(async () => false),
      mkdir: jest.fn(async () => {}),
      ls: jest.fn(async () => []),
      unlink: jest.fn(async () => {}),
    },
    MediaCollection: {
      copyToMediaStore: jest.fn(async () => 'content://downloads/1'),
    },
  },
}));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(async () => ({ success: true })) },
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(),
  keepLocalCopy: jest.fn(),
  types: { json: 'application/json', allFiles: '*/*' },
  errorCodes: { OPERATION_CANCELED: 'OPERATION_CANCELED' },
  isErrorWithCode: () => false,
}));

jest.mock('react-native-haptic-feedback', () => ({ trigger: jest.fn() }));

jest.mock('@sayem314/react-native-keep-awake', () => ({
  activateKeepAwake: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('react-native-bootsplash', () => ({
  __esModule: true,
  default: { hide: jest.fn(async () => {}) },
}));

jest.mock('react-native-get-random-values', () => ({}));
