/**
 * Home Screen - Detection controls and statistics
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {apiClient} from '../api/client';
import tripDetection from '../native/TripDetection';
import {UserStatistics, LocalJourney} from '../api/types';

type RootStackParamList = {
  Home: undefined;
  PendingJourneys: undefined;
  ValidatedJourneys: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export default function HomeScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const {user, logout} = useAuth();

  const [isDetectionRunning, setIsDetectionRunning] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [statistics, setStatistics] = useState<UserStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transitions, setTransitions] = useState<
    Array<{
      activityType: string;
      transitionType: string;
      timestamp: string;
      timestampMs: number;
    }>
  >([]);
  const [gpsLogs, setGpsLogs] = useState<
    Array<{
      event: string;
      timestamp: number;
      formattedTime: string;
      [key: string]: any;
    }>
  >([]);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Set up event listeners
  useEffect(() => {
    const unsubscribeTripDetected = tripDetection.addTripDetectedListener(
      (journey: LocalJourney) => {
        Alert.alert(
          'Nouveau trajet detecte!',
          `Mode: ${getTransportLabel(journey.detectedTransportType)}\n` +
            `Duree: ${journey.durationMinutes} min\n` +
            `Distance: ${journey.distanceKm.toFixed(1)} km`,
        );
        loadPendingCount();
      },
    );

    const unsubscribeStateChange = tripDetection.addStateChangeListener(
      state => {
        setIsDetectionRunning(state.isRunning);
      },
    );

    const unsubscribeTransition = tripDetection.addTransitionListener(data => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      const timestampMs = now.getTime();

      console.log(
        `[${timestamp}] Transition detected:`,
        `${data.activityType} -> ${data.transitionType}`,
        `(${timestampMs}ms)`,
      );

      setTransitions(prev => {
        const newTransitions = [
          {
            ...data,
            timestamp,
            timestampMs,
          },
          ...prev,
        ].slice(0, 10); // Keep last 10
        return newTransitions;
      });
    });

    const unsubscribeGpsLog = tripDetection.addGpsLogListener?.((data: any) => {
      const now = new Date();
      const formattedTime = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      console.log('[GPS Log]', data.event, data);

      setGpsLogs(prev => {
        const newLogs = [
          {
            event: data.event,
            timestamp: data.timestamp || now.getTime(),
            formattedTime,
            ...data,
          },
          ...prev,
        ].slice(0, 15); // Keep last 15
        return newLogs;
      });
    });

    return () => {
      unsubscribeTripDetected?.();
      unsubscribeStateChange?.();
      unsubscribeTransition?.();
      unsubscribeGpsLog?.();
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadDetectionStatus(),
        loadPendingCount(),
        loadStatistics(),
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDetectionStatus = async () => {
    try {
      const running = await tripDetection.isDetectionRunning();
      setIsDetectionRunning(running);
    } catch (error) {
      console.error('Failed to check detection status:', error);
    }
  };

  const loadPendingCount = async () => {
    try {
      const count = await tripDetection.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error('Failed to get pending count:', error);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await apiClient.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStartDetection = async () => {
    try {
      // Check permissions first
      const permissions = await tripDetection.checkPermissions();
      if (!permissions.allGranted) {
        await tripDetection.requestPermissions();
        // Check again after request
        const newPermissions = await tripDetection.checkPermissions();
        if (!newPermissions.allGranted) {
          Alert.alert(
            'Permissions requises',
            'Veuillez accorder les permissions necessaires dans les parametres.',
          );
          return;
        }
      }

      await tripDetection.startDetection();
      setIsDetectionRunning(true);
      Alert.alert(
        'Detection activee',
        'La detection de trajets est maintenant active.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    }
  };

  const handleStopDetection = async () => {
    try {
      await tripDetection.stopDetection();
      setIsDetectionRunning(false);
      Alert.alert(
        'Detection desactivee',
        'La detection de trajets a ete arretee.',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Deconnexion', 'Voulez-vous vous deconnecter?', [
      {text: 'Annuler', style: 'cancel'},
      {
        text: 'Deconnecter',
        style: 'destructive',
        onPress: async () => {
          if (isDetectionRunning) {
            await tripDetection.stopDetection();
          }
          await logout();
        },
      },
    ]);
  };

  const getTransportLabel = (type: string): string => {
    const labels: Record<string, string> = {
      marche: 'Marche',
      velo: 'Velo',
      voiture: 'Voiture',
      transport_commun: 'Transport en commun',
    };
    return labels[type] || type;
  };

  const getActivityLabel = (activityType: string): string => {
    const labels: Record<string, string> = {
      WALKING: 'Marche',
      RUNNING: 'Course',
      ON_BICYCLE: 'Vélo',
      IN_VEHICLE: 'Véhicule',
      STILL: 'Immobile',
      UNKNOWN: 'Inconnu',
    };
    return labels[activityType] || activityType;
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Accueil</Text>
      </View>

      {/* Detection Control */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detection de trajets</Text>
        <View style={styles.detectionCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                isDetectionRunning
                  ? styles.statusActive
                  : styles.statusInactive,
              ]}
            />
            <Text style={styles.statusText}>
              {isDetectionRunning ? 'Active' : 'Inactive'}
            </Text>
          </View>

          {isDetectionRunning ? (
            <TouchableOpacity
              style={[styles.button, styles.stopButton]}
              onPress={handleStopDetection}>
              <Text style={styles.buttonText}>Arreter la detection</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.button, styles.startButton]}
              onPress={handleStartDetection}>
              <Text style={styles.buttonText}>Demarrer la detection</Text>
            </TouchableOpacity>
          )}

          {/* DEBUG / DEMO controls (POC) */}
          <View style={styles.spacerMd} />
          <TouchableOpacity
            style={[
              styles.button,
              debugEnabled ? styles.stopButton : styles.startButton,
            ]}
            onPress={async () => {
              try {
                await tripDetection.setDebugMode(!debugEnabled);
                setDebugEnabled(!debugEnabled);
                Alert.alert(
                  'Mode DEBUG',
                  !debugEnabled ? 'Activé' : 'Désactivé',
                );
              } catch (e) {
                console.error('Failed to toggle debug mode', e);
              }
            }}>
            <Text style={styles.buttonText}>
              {debugEnabled ? 'Désactiver mode DEBUG' : 'Activer mode DEBUG'}
            </Text>
          </TouchableOpacity>

          <View style={styles.spacerSm} />
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={async () => {
              try {
                await tripDetection.simulateTrip();
                Alert.alert('Simulateur', 'Trajet simulé inséré.');
                loadPendingCount();
              } catch (e) {
                console.error('Failed to simulate trip', e);
              }
            }}>
            <Text style={styles.buttonText}>Simuler un trajet</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Live Transitions Tracking */}
      {isDetectionRunning && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suivi en temps réel</Text>
          <View style={styles.liveCard}>
            {transitions.length === 0 ? (
              <Text style={styles.liveEmptyText}>
                En attente de détection d'activité...
              </Text>
            ) : (
              <>
                <Text style={styles.liveHeader}>
                  Dernières transitions ({transitions.length})
                </Text>
                {transitions.map((transition, index) => {
                  const activityLabel = getActivityLabel(
                    transition.activityType,
                  );
                  const isEnter = transition.transitionType === 'ENTER';

                  return (
                    <View key={index} style={styles.transitionRow}>
                      <View
                        style={[
                          styles.transitionDot,
                          isEnter
                            ? styles.transitionEnter
                            : styles.transitionExit,
                        ]}
                      />
                      <View style={styles.transitionInfo}>
                        <Text style={styles.transitionText}>
                          <Text style={styles.transitionBold}>
                            {activityLabel}
                          </Text>{' '}
                          {isEnter ? '→ Début' : '→ Fin'}
                        </Text>
                        <Text style={styles.transitionTime}>
                          {transition.timestamp} ({transition.timestampMs}ms)
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        </View>
      )}

      {/* GPS Logs */}
      {gpsLogs.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📍 Logs GPS</Text>
          <View style={styles.debugCard}>
            {gpsLogs.map((log, index) => {
              const isStart = log.event === 'gps_start';
              const isStop = log.event === 'gps_stop';
              const isStats = log.event === 'gps_stats';

              return (
                <View key={index} style={styles.logEntry}>
                  {isStart && (
                    <>
                      <Text style={styles.logStart}>
                        🟢 GPS DÉBUT - {log.activity}
                      </Text>
                      <Text style={styles.logTime}>{log.formattedTime}</Text>
                    </>
                  )}
                  {isStop && (
                    <>
                      <Text style={styles.logStop}>
                        🔴 GPS ARRÊT - {log.activity}
                      </Text>
                      <Text style={styles.logTime}>{log.formattedTime}</Text>
                    </>
                  )}
                  {isStats && (
                    <>
                      <Text style={styles.logStats}>📊 STATS GPS</Text>
                      <Text style={styles.logText}>
                        {log.isGpsBased
                          ? `✅ GPS-BASÉ: ${
                              log.gpsPoints
                            } points, ${log.distance?.toFixed(2)}km`
                          : `⚠️  ESTIMATION: ${
                              log.gpsPoints
                            } points, ${log.distance?.toFixed(2)}km`}
                      </Text>
                      {log.isGpsBased && log.startLat && (
                        <>
                          <Text style={styles.logText}>
                            📍 Départ: ({log.startLat?.toFixed(4)},{' '}
                            {log.startLon?.toFixed(4)})
                          </Text>
                          <Text style={styles.logText}>
                            📍 Arrivée: ({log.endLat?.toFixed(4)},{' '}
                            {log.endLon?.toFixed(4)})
                          </Text>
                        </>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Pending Journeys */}
      <TouchableOpacity
        style={styles.section}
        onPress={() => navigation.navigate('PendingJourneys')}>
        <View style={styles.pendingCard}>
          <Text style={styles.pendingCount}>{pendingCount}</Text>
          <Text style={styles.pendingLabel}>
            Trajet{pendingCount !== 1 ? 's' : ''} en attente
          </Text>
          <Text style={styles.pendingHint}>Appuyez pour voir et valider</Text>
        </View>
      </TouchableOpacity>

      {/* Statistics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mes statistiques</Text>
        {isLoading ? (
          <ActivityIndicator color="#2E7D32" />
        ) : statistics ? (
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{statistics.total_journeys}</Text>
              <Text style={styles.statLabel}>Trajets</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>
                {statistics.total_distance_km.toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>km parcourus</Text>
            </View>
            <View style={[styles.statCard, styles.scoreCard]}>
              <Text style={[styles.statValue, styles.scoreValue]}>
                {statistics.total_score}
              </Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noStats}>Aucune statistique disponible</Text>
        )}
      </View>

      {/* Validated Journeys Link */}
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('ValidatedJourneys')}>
        <Text style={styles.linkText}>Voir mes trajets valides</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingTop: 55,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
  },
  welcomeText: {
    fontSize: 14,
    color: '#666',
  },
  username: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#F44336',
    fontWeight: '500',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  detectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusActive: {
    backgroundColor: '#4CAF50',
  },
  statusInactive: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#2E7D32',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  pendingCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#E65100',
  },
  pendingLabel: {
    fontSize: 16,
    color: '#E65100',
    marginTop: 4,
  },
  pendingHint: {
    fontSize: 12,
    color: '#FF8A65',
    marginTop: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scoreCard: {
    backgroundColor: '#E8F5E9',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  scoreValue: {
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  noStats: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  linkButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  linkText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '500',
  },
  liveCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    maxHeight: 300,
  },
  liveHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  liveEmptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontSize: 14,
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  transitionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  transitionEnter: {
    backgroundColor: '#4CAF50',
  },
  transitionExit: {
    backgroundColor: '#FF9800',
  },
  transitionInfo: {
    flex: 1,
  },
  transitionText: {
    fontSize: 14,
    color: '#333',
  },
  transitionBold: {
    fontWeight: '600',
  },
  transitionTime: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  debugCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
  },
  logEntry: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  logText: {
    fontSize: 12,
    color: '#4CAF50',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  logTime: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
    fontFamily: 'monospace',
  },
  logStart: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  logStop: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  logStats: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  spacerSm: {
    height: 8,
  },
  spacerMd: {
    height: 12,
  },
});
