import { Alert } from 'react-native';
import { parseBackup, pickBackupText } from '../../backup/import';
import { navigationRef } from '../../navigation/navigationRef';
import { useImportStore } from '../../store/importStore';

/** Pick a file, validate it, and open ImportReview. Invalid files change nothing and explain why. */
export async function startImport() {
  let text: string | null;
  try {
    text = await pickBackupText();
  } catch (e) {
    return fail(`Could not read the file: ${(e as Error).message}`);
  }
  if (text == null) return;
  const r = parseBackup(text);
  if (!r.ok) return fail(r.error);
  const key = useImportStore.getState().put(r.backup);
  navigationRef.navigate('ImportReview', { parsedBackupKey: key });
}

export function fail(reason: string) {
  Alert.alert(
    'Import failed',
    `${reason}\n\nYour existing data was not changed.`,
    [
      { text: 'Close', style: 'cancel' },
      { text: 'Try another file', onPress: () => startImport() },
    ],
  );
}
