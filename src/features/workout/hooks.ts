import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '@sayem314/react-native-keep-awake';
import { useIsFocused } from '@react-navigation/native';
import { useEffect } from 'react';
import { AppState, BackHandler } from 'react-native';
import { localDate, weekdayOf } from '../../lib/dates';
import { useSession } from '../../store/sessionStore';

const LEAVE_GRACE_MS = 10 * 60 * 1000;

/**
 * Keep the screen awake while the session has unlogged planned sets.
 * Released on finish, after 10 min away from the Workout tab, or when the app goes to background.
 */
export function useSessionKeepAwake(active: boolean) {
  const focused = useIsFocused();
  useEffect(() => {
    if (!active) {
      deactivateKeepAwake();
      return;
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (focused && AppState.currentState === 'active') activateKeepAwake();
    if (!focused) timer = setTimeout(deactivateKeepAwake, LEAVE_GRACE_MS);
    const sub = AppState.addEventListener('change', st => {
      if (st === 'active' && focused) activateKeepAwake();
      else if (st === 'background') deactivateKeepAwake();
    });
    return () => {
      sub.remove();
      if (timer) clearTimeout(timer);
    };
  }, [active, focused]);
  useEffect(() => () => deactivateKeepAwake(), []);
}

/** New day while the app was open or backgrounded: jump to today's workout. */
export function useDayRollover() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      const s = useSession.getState();
      if (st === 'active' && s.loaded && s.date !== localDate())
        s.load(weekdayOf());
    });
    return () => sub.remove();
  }, []);
}

/** Android back closes panel edit mode before navigating. */
export function useBackClosesEdit() {
  const focused = useIsFocused();
  useEffect(() => {
    if (!focused) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const s = useSession.getState();
      if (s.mode === 'edit') {
        s.cancelEdit();
        return true;
      }
      if (s.extra) {
        s.setExtra(false);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [focused]);
}
