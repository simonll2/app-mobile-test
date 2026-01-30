/**
 * Green Mobility Pass - React Native App
 *
 * A mobile application for tracking green mobility trips
 * with automatic activity recognition and backend integration.
 */

import React, {useEffect} from 'react';
import {StatusBar, LogBox} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AuthProvider} from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import {usePermissionsSetup} from './src/hooks/usePermissionsSetup';

// Ignore specific warnings in development
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);

function AppContent(): React.JSX.Element {
  // Request all permissions at app startup (once)
  const {permissionsRequested, permissionsGranted} = usePermissionsSetup();

  useEffect(() => {
    if (permissionsRequested) {
      console.log(`📱 Permissions setup complete. Granted: ${permissionsGranted}`);
    }
  }, [permissionsRequested, permissionsGranted]);

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />
      <AppNavigator />
    </>
  );
}

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
