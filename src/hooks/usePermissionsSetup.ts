/**
 * Hook for requesting all permissions at app startup (once)
 * Permissions are requested immediately when the app launches,
 * before the user logs in, so they only see the dialogs once.
 */

import {useEffect, useState} from 'react';
import {Platform} from 'react-native';
import tripDetection from '../native/TripDetection';

export const usePermissionsSetup = () => {
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    const requestAllPermissions = async () => {
      if (Platform.OS !== 'android') {
        setPermissionsRequested(true);
        return;
      }

      try {
        console.log('📱 Checking permissions at app startup...');
        const permissions = await tripDetection.checkPermissions();

        if (permissions.allGranted) {
          console.log('✅ All permissions already granted');
          setPermissionsGranted(true);
          setPermissionsRequested(true);
          return;
        }

        console.log('📱 Requesting permissions...');
        console.log('   Location:', permissions.location ? '✅' : '❌');
        console.log('   Activity:', permissions.activityRecognition ? '✅' : '❌');
        console.log('   Notifications:', permissions.notifications ? '✅' : '❌');

        // Request permissions - this opens system dialogs
        await tripDetection.requestPermissions();

        // Wait for user to respond to permission dialogs
        // Check periodically until all permissions are granted or timeout
        let retries = 0;
        const maxRetries = 15; // 15 seconds max wait
        const retryDelay = 1000;

        while (retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          const newPermissions = await tripDetection.checkPermissions();

          console.log(`📱 Permission check (${retries + 1}/${maxRetries}):`);
          console.log('   Location:', newPermissions.location ? '✅' : '❌');
          console.log('   Activity:', newPermissions.activityRecognition ? '✅' : '❌');
          console.log('   Notifications:', newPermissions.notifications ? '✅' : '❌');

          if (newPermissions.allGranted) {
            console.log('✅ All permissions granted!');
            setPermissionsGranted(true);
            break;
          }
          retries++;
        }

        setPermissionsRequested(true);
      } catch (error) {
        console.error('❌ Error requesting permissions:', error);
        setPermissionsRequested(true);
      }
    };

    requestAllPermissions();
  }, []);

  return {permissionsRequested, permissionsGranted};
};
