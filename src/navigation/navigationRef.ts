import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingWorkout = false;

/** Notification taps land here; queued until the container is ready. */
export function goToWorkout() {
  if (navigationRef.isReady())
    navigationRef.navigate('Tabs', { screen: 'Workout' });
  else pendingWorkout = true;
}

export function flushPendingNavigation() {
  if (pendingWorkout && navigationRef.isReady()) {
    pendingWorkout = false;
    navigationRef.navigate('Tabs', { screen: 'Workout' });
  }
}
