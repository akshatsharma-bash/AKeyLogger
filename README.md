# AKey Logger

Local-first workout logger for a fixed Upper/Lower program. Bare React Native CLI (no Expo), TypeScript strict, New Architecture + Hermes. No accounts, no server, no network calls.

## Run

```sh
npm install
cd ios && pod install && cd ..   # macOS only
npm run android                  # or: npm run ios
```

## Checks

```sh
npx tsc --noEmit   # strict typecheck
npm test           # Jest: dates, units, progression, lastSession, superset advance, backup, app smoke test
npm run lint
```

Tests run real SQL against Node's built-in `node:sqlite` (Node 22.5+) through the same repository interface the app uses (`test-utils/sqliteDb.ts`). Native modules are mocked in `jest.setup.ts`.

## Release APK (Android)

1. Create a keystore once (keep it safe and out of git):

   ```sh
   keytool -genkeypair -v -storetype PKCS12 -keystore akey-release.keystore -alias akey -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Put it in `android/app/` and add to `~/.gradle/gradle.properties` (or `android/gradle.properties`, not committed):

   ```properties
   AKEY_UPLOAD_STORE_FILE=akey-release.keystore
   AKEY_UPLOAD_KEY_ALIAS=akey
   AKEY_UPLOAD_STORE_PASSWORD=...
   AKEY_UPLOAD_KEY_PASSWORD=...
   ```

   Without these properties the release build falls back to the debug key (fine for testing, not for keeping installs updatable).

3. Build: `cd android && ./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk`.

Bump `versionCode` / `versionName` in `android/app/build.gradle` and `version` in `package.json` for each release.

**Keep using the same keystore**: Android only installs an update over an existing app if it's signed with the same key.

## iOS

Open `ios/AKeyLogger.xcworkspace` in Xcode, pick your team under Signing, run on device. Free provisioning works but needs re-signing every 7 days. Version: `MARKETING_VERSION` / `CURRENT_PROJECT_VERSION` in the target build settings.

## Splash and icon

Generated from `assets/logo.svg`:

```sh
npx react-native-bootsplash generate assets/logo.svg --platforms=android,ios --background=0E1016 --logo-width=120 --assets-output=assets/bootsplash
```

The Android adaptive icon is `res/mipmap-anydpi-v26/ic_launcher.xml` (accent barbell on `#0E1016`); legacy PNGs and the iOS AppIcon set are rendered from the same mark.

## Phone switch

Old phone: Settings → Export backup → Drive / WhatsApp / email.
New phone: install → Settings → Import backup → pick the file → Replace all data.

## Layout

```
index.js            polyfill, notifee background handler, AppRegistry
App.tsx             boot (DB open, migrate, seed, settings), splash hide, navigation
src/db              op-sqlite client, migrations, seed, repositories, types
src/backup          zod schema, export, import (parse/replace/merge), migrateBackup, snapshots, reminder
src/features        workout (screen, cards, logger panel, logic), timer, history, program, settings
src/store           zustand: session, settings, snackbar, import
```

## Manual QA (spec 13.4)

- Small Android (~360 dp) and large iPhone: panel fits, nothing behind the tab bar or home indicator.
- Lock the screen during rest: notification on time, with and without exact-alarm permission.
- Kill the app mid-session: logged sets persist and the session resumes.
- Airplane mode: everything works.
- Full phone-switch flow through Drive or WhatsApp.
- Maximum system font size.
