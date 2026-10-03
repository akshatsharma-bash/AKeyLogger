import { useNavigation } from '@react-navigation/native';
import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

/**
 * Confirm before leaving a screen with unsaved changes (back button, gesture, header back).
 * Call the returned `leave()` after saving to navigate back without the prompt.
 */
export function useUnsavedGuard(dirty: boolean) {
  const nav = useNavigation();
  const bypass = useRef(false);
  useEffect(
    () =>
      nav.addListener('beforeRemove', e => {
        if (!dirty || bypass.current) return;
        e.preventDefault();
        Alert.alert('Discard changes?', 'You have unsaved changes.', [
          { text: 'Keep editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => nav.dispatch(e.data.action),
          },
        ]);
      }),
    [nav, dirty],
  );
  return () => {
    bypass.current = true;
    nav.goBack();
  };
}
