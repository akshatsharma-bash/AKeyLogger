import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Icon, IconName } from '../components/Icon';
import { HistoryScreen } from '../features/history/HistoryScreen';
import { ProgramScreen } from '../features/program/ProgramScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { WorkoutScreen } from '../features/workout/WorkoutScreen';
import { colors } from '../theme/tokens';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, IconName> = {
  Workout: 'barbell-outline',
  History: 'time-outline',
  Program: 'list-outline',
  Settings: 'settings-outline',
};

const tabIcon = (
  name: keyof TabParamList,
  { focused, color }: { focused: boolean; color: string },
) => (
  <View style={styles.iconWrap}>
    <View style={[styles.indicator, focused && styles.indicatorOn]} />
    <Icon name={ICONS[name]} color={color} size={22} />
  </View>
);

const tabLabel = ({
  focused,
  color,
  children,
}: {
  focused: boolean;
  color: string;
  children: string;
}) => (
  <Text
    style={[styles.label, { color }, focused && styles.labelOn]}
    maxFontSizeMultiplier={1.3}
  >
    {children}
  </Text>
);

export function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
        },
        tabBarIcon: p => tabIcon(route.name, p),
        tabBarLabel: tabLabel,
        tabBarButtonTestID: `tab-${route.name}`,
        sceneStyle: { backgroundColor: colors.bg },
      })}
    >
      {(Object.keys(ICONS) as (keyof TabParamList)[]).map(name => (
        <Tab.Screen
          key={name}
          name={name}
          component={
            {
              Workout: WorkoutScreen,
              History: HistoryScreen,
              Program: ProgramScreen,
              Settings: SettingsScreen,
            }[name]
          }
        />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: '500' },
  labelOn: { fontWeight: '700' },
  iconWrap: { alignItems: 'center' },
  indicator: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'transparent',
  },
  indicatorOn: { backgroundColor: colors.accent },
});
