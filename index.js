/**
 * @format
 */
import 'react-native-get-random-values'; // must be first: uuid needs crypto.getRandomValues
import notifee from '@notifee/react-native';
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Notification taps while the app is killed/backgrounded open the app; App reads getInitialNotification().
notifee.onBackgroundEvent(async () => {});

AppRegistry.registerComponent(appName, () => App);
