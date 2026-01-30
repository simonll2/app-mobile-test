/**
 * Trips Screen - Trip detection and journey management
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
import {
  Clock,
  MapPin,
  ChevronRight,
  Route,
  CheckCircle,
  AlertCircle,
} from 'lucide-react-native';
import {useAuth} from '../context/AuthContext';
import tripDetection from '../native/TripDetection';
import {LocalJourney} from '../api/types';

type RootStackParamList = {
  Trips: undefined;
  PendingJourneys: undefined;
  ValidatedJourneys: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Trips'>;

export default function TripsScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const {user} = useAuth();

  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isDetectionActive, setIsDetectionActive] = useState(false);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  // Set up event listeners for trip detection
  useEffect(() => {
    const unsubscribeTripDetected = tripDetection.addTripDetectedListener(
      (journey: LocalJourney) => {
        Alert.alert(
          'Nouveau trajet détecté ! 🎉',
          `Mode: ${getTransportLabel(journey.detectedTransportType)}\n` +
            `Durée: ${journey.durationMinutes} min\n` +
            `Distance: ${journey.distanceKm.toFixed(1)} km`,
        );
        loadPendingCount();
      },
    );

    const unsubscribeStateChange = tripDetection.addStateChangeListener(
      state => {
        setIsDetectionActive(state.isRunning);
      },
    );

    return () => {
      unsubscribeTripDetected?.();
      unsubscribeStateChange?.();
    };
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadPendingCount(), checkDetectionStatus()]);
    } finally {
      setIsLoading(false);
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

  const checkDetectionStatus = async () => {
    try {
      const isRunning = await tripDetection.isDetectionRunning();
      setIsDetectionActive(isRunning);
    } catch (error) {
      console.error('Failed to check detection status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getTransportLabel = (type: string): string => {
    const labels: Record<string, string> = {
      marche: 'Marche',
      velo: 'Vélo',
      voiture: 'Voiture',
      transport_commun: 'Transport en commun',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2E7D32']}
          tintColor="#2E7D32"
        />
      }>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Mes Trajets</Text>
      </View>

      {/* Pending Journeys Card */}
      <TouchableOpacity
        style={styles.pendingCard}
        onPress={() => navigation.navigate('PendingJourneys')}
        activeOpacity={0.8}>
        <View style={styles.pendingCardGradient}>
          <View style={styles.pendingIconContainer}>
            <Clock size={28} color="#FF9800" />
          </View>
          <Text style={styles.pendingCount}>{pendingCount}</Text>
          <Text style={styles.pendingLabel}>
            Trajet{pendingCount !== 1 ? 's' : ''} en attente
          </Text>
          <View style={styles.pendingAction}>
            <Text style={styles.pendingActionText}>Voir et valider</Text>
            <ChevronRight size={18} color="#FF9800" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          {/* Validated Journeys */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('ValidatedJourneys')}
            activeOpacity={0.8}>
            <View style={[styles.actionIcon, {backgroundColor: '#E8F5E9'}]}>
              <CheckCircle size={24} color="#4CAF50" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Trajets validés</Text>
              <Text style={styles.actionSubtitle}>
                Voir l'historique complet
              </Text>
            </View>
            <ChevronRight size={20} color="#ccc" />
          </TouchableOpacity>

          {/* Pending Journeys */}
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('PendingJourneys')}
            activeOpacity={0.8}>
            <View style={[styles.actionIcon, {backgroundColor: '#FFF3E0'}]}>
              <MapPin size={24} color="#FF9800" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>À valider</Text>
              <Text style={styles.actionSubtitle}>
                {pendingCount} trajet{pendingCount !== 1 ? 's' : ''} en attente
              </Text>
            </View>
            <ChevronRight size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Route size={20} color="#1976D2" />
        <Text style={styles.infoText}>
          Vos trajets sont automatiquement détectés. Validez-les pour gagner des
          points et contribuer à une mobilité plus verte !
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  contentContainer: {
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 2,
  },
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIconActive: {
    backgroundColor: '#4CAF50',
  },
  statusIconInactive: {
    backgroundColor: '#9E9E9E',
  },
  statusTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: '#E8F5E9',
  },
  badgeInactive: {
    backgroundColor: '#F5F5F5',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  dotActive: {
    backgroundColor: '#4CAF50',
  },
  dotInactive: {
    backgroundColor: '#9E9E9E',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
  badgeTextInactive: {
    color: '#666',
  },
  pendingCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  pendingCardGradient: {
    backgroundColor: '#1a1a1a',
    padding: 24,
    alignItems: 'center',
  },
  pendingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingCount: {
    fontSize: 64,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -2,
  },
  pendingLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  pendingAction: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    borderRadius: 12,
  },
  pendingActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginRight: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  actionsGrid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionContent: {
    flex: 1,
    marginLeft: 14,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  actionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 32,
  },
});
