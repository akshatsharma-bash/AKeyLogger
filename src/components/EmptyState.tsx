import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../theme/tokens';
import { Button } from './Button';
import { Icon, IconName } from './Icon';

export function EmptyState({
  icon,
  title,
  action,
  onAction,
}: {
  icon: IconName;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Icon name={icon} size={48} color={colors.textSecondary} />
      <Text style={[type.heading, styles.title]}>{title}</Text>
      {action && onAction ? (
        <Button title={action} onPress={onAction} style={styles.btn} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xxl,
    gap: space.l,
  },
  title: { color: colors.textSecondary, textAlign: 'center' },
  btn: { alignSelf: 'stretch' },
});
