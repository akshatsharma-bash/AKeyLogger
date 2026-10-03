import notifee, { EventType } from '@notifee/react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { StatusBar, StyleSheet, Text, View } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { openDb } from './src/db/client';
import { migrate } from './src/db/migrations';
import { seedIfEmpty } from './src/db/seed';
import {
  flushPendingNavigation,
  goToWorkout,
  navigationRef,
} from './src/navigation/navigationRef';
import { RootNavigator } from './src/navigation/RootNavigator';
import { useSettings } from './src/store/settingsStore';
import { colors, gutter, type } from './src/theme/tokens';

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.bg,
    text: colors.textPrimary,
    border: colors.border,
    primary: colors.accentText,
  },
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const db = await openDb();
        await migrate(db);
        await seedIfEmpty(db);
        await useSettings.getState().load();
        setReady(true);
        const initial = await notifee.getInitialNotification();
        if (initial) goToWorkout();
      } catch (e) {
        setBootError((e as Error).message);
      } finally {
        BootSplash.hide({ fade: true });
      }
    })();
    return notifee.onForegroundEvent(({ type: t }) => {
      if (t === EventType.PRESS) goToWorkout();
    });
  }, []);

  return (
    <SafeAreaProvider style={{ backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <ErrorBoundary>
        {bootError ? (
          <View style={styles.error}>
            <Text style={[type.title, { color: colors.textPrimary }]}>
              Could not open the database
            </Text>
            <Text style={[type.body, { color: colors.textSecondary }]}>
              {bootError}
            </Text>
          </View>
        ) : ready ? (
          <NavigationContainer
            ref={navigationRef}
            theme={navTheme}
            onReady={flushPendingNavigation}
          >
            <RootNavigator />
          </NavigationContainer>
        ) : (
          <View style={styles.fill} />
        )}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  error: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: gutter,
    paddingTop: 80,
    gap: 12,
  },
});
