import { useFocusEffect, useNavigation } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../../components/Icon';
import { Snackbar } from '../../components/Snackbar';
import { DaySummary, listDays } from '../../db/repositories/program';
import { WEEKDAY_LONG } from '../../lib/dates';
import { colors, gutter, ripple, space, type } from '../../theme/tokens';

export function ProgramScreen() {
  const nav = useNavigation();
  const [days, setDays] = useState<DaySummary[]>([]);
  useFocusEffect(
    useCallback(() => {
      listDays().then(setDays);
    }, []),
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={[type.title, styles.title]} accessibilityRole="header">
        Program
      </Text>
      <ScrollView contentContainerStyle={styles.list}>
        {days.map(d => (
          <Pressable
            key={d.id}
            onPress={() => nav.navigate('EditDay', { dayId: d.id })}
            android_ripple={ripple}
            accessibilityRole="button"
            accessibilityLabel={`${WEEKDAY_LONG[d.weekday - 1]}, ${d.label}, ${
              d.is_rest_day ? 'rest day' : `${d.item_count} exercises`
            }`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.flex}>
              <Text style={[type.heading, styles.text]}>{d.label}</Text>
              <Text style={[type.label, styles.meta]}>
                {WEEKDAY_LONG[d.weekday - 1]} ·{' '}
                {d.is_rest_day ? 'Rest day' : `${d.item_count} exercises`}
              </Text>
            </View>
            <Icon
              name="chevron-forward-outline"
              size={20}
              color={colors.textSecondary}
            />
          </Pressable>
        ))}
      </ScrollView>
      <Snackbar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: {
    color: colors.textPrimary,
    paddingHorizontal: gutter,
    paddingVertical: space.m,
  },
  list: { paddingHorizontal: gutter, paddingBottom: space.xl },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
});
