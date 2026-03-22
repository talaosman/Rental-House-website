import { registerRootComponent } from 'expo';
import App from './src/App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App)
// and ensures the app works correctly in both Expo Go and standalone builds.
registerRootComponent(App);
