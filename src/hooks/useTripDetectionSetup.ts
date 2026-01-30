/**
 * Hook for initializing trip detection permissions and starting detection
 */

import {useEffect} from 'react';
import tripDetection from '../native/TripDetection';

export const useTripDetectionSetup = () => {
  useEffect(() => {
    const initializeDetection = async () => {
      try {
        // Check if permissions are already granted
        const permissions = await tripDetection.checkPermissions();
        
        if (!permissions.allGranted) {
          // Request permissions
          await tripDetection.requestPermissions();
          
          // Check again after request
          const newPermissions = await tripDetection.checkPermissions();
          if (!newPermissions.allGranted) {
            console.warn('Trip detection permissions not granted');
            return;
          }
        }
        
        // Start detection automatically once permissions are granted
        await tripDetection.startDetection();
        console.log('Trip detection started automatically');
      } catch (error) {
        console.error('Failed to initialize trip detection:', error);
      }
    };

    initializeDetection();
  }, []);
};
