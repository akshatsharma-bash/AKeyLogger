import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, space, type } from '../theme/tokens';

/** Bottom sheet on a scrim. Android back closes it (onRequestClose). */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <View style={styles.fill}>
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityLabel="Close"
          accessibilityRole="button"
        />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + space.l }]}
        >
          <View style={styles.grip} />
          {title ? (
            <Text style={[type.title, styles.title]} accessibilityRole="header">
              {title}
            </Text>
          ) : null}
          <ScrollView bounces={false}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.l,
    paddingTop: space.s,
    maxHeight: '85%',
  },
  grip: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: space.m,
  },
  title: { color: colors.textPrimary, marginBottom: space.l },
});
