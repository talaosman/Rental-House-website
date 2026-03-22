/**
 * App.jsx — React Native root component
 *
 * Provider tree:
 *   <AuthProvider>          ← AsyncStorage-backed auth state
 *     <NavigationContainer> ← React Navigation root
 *       <RootNavigator />   ← AuthStack / UserRootStack / AdminRootStack
 *     </NavigationContainer>
 *   </AuthProvider>
 */

import { NavigationContainer } from '@react-navigation/native';
import { StatusBar }           from 'expo-status-bar';

import { AuthProvider }  from './context/AuthContext';
import RootNavigator     from './navigation/RootNavigator';

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <StatusBar style="light" />
    </AuthProvider>
  );
}
