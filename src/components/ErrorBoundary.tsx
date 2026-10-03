import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { exportBackup } from '../backup/export';
import { colors, gutter, space, type } from '../theme/tokens';
import { Button } from './Button';

interface State {
  error: Error | null;
  exportMsg: string | null;
}

/** Top-level crash screen with an "Export backup" escape hatch so data can be rescued. */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null, exportMsg: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={[type.title, styles.text]}>This screen crashed</Text>
        <Text style={[type.body, styles.meta]}>
          Your logged sets are saved. Export a backup to be safe, then try
          again.
        </Text>
        <Text style={[type.caption, styles.meta]}>
          {String(this.state.error.message)}
        </Text>
        <Button
          title="Export backup"
          large
          onPress={async () => {
            try {
              await exportBackup();
              this.setState({ exportMsg: 'Backup exported.' });
            } catch (e) {
              this.setState({
                exportMsg: `Export failed: ${(e as Error).message}`,
              });
            }
          }}
        />
        {this.state.exportMsg ? (
          <Text style={[type.label, styles.meta]}>{this.state.exportMsg}</Text>
        ) : null}
        <Button
          title="Try again"
          variant="secondary"
          onPress={() => this.setState({ error: null, exportMsg: null })}
        />
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { padding: gutter, paddingTop: 80, gap: space.l },
  text: { color: colors.textPrimary },
  meta: { color: colors.textSecondary },
});
