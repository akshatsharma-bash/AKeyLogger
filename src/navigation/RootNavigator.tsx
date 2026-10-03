import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { ExerciseHistoryScreen } from '../features/history/ExerciseHistoryScreen';
import { SessionDetailScreen } from '../features/history/SessionDetailScreen';
import { EditDayScreen } from '../features/program/EditDayScreen';
import { EditItemScreen } from '../features/program/EditItemScreen';
import { ImportReviewScreen } from '../features/settings/ImportReviewScreen';
import { colors } from '../theme/tokens';
import { Tabs } from './Tabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="Tabs"
        component={Tabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SessionDetail"
        component={SessionDetailScreen}
        options={{ title: 'Workout' }}
      />
      <Stack.Screen
        name="ExerciseHistory"
        component={ExerciseHistoryScreen}
        options={{ title: 'Exercise' }}
      />
      <Stack.Screen
        name="EditDay"
        component={EditDayScreen}
        options={{ title: 'Edit day' }}
      />
      <Stack.Screen
        name="EditItem"
        component={EditItemScreen}
        options={{ title: 'Exercise' }}
      />
      <Stack.Screen
        name="ImportReview"
        component={ImportReviewScreen}
        options={{ title: 'Import backup', presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
