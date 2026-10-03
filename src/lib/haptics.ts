import { trigger } from 'react-native-haptic-feedback';

const opts = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const hapticSuccess = () => trigger('notificationSuccess', opts);
export const hapticTick = () => trigger('impactLight', opts);
export const hapticAlarm = () => trigger('notificationWarning', opts);
