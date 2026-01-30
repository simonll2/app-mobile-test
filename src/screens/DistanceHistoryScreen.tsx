/**
 * Distance History Screen - Total distance and breakdown by transport mode
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Route,
  Bike,
  Footprints,
  Car,
  Bus,
} from 'lucide-react-native';
import {apiClient} from '../api/client';
import {ValidatedJourney} from '../api/types';

interface DistanceByMode {
  mode: string;
  label: string;
  distance: number;
  count: number;
  color: string;
  icon: JSX.Element;
}

export default function DistanceHistoryScreen(): JSX.Element {
  const [journeys, setJourneys] = useState<ValidatedJourney[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadJourneys();
    }, []),
  );

  const loadJourneys = async () => {
    setError(null);
    try {
      const userId = apiClient.getUserId();
      if (!userId) {
        setError('Utilisateur non connecté');
        return;
      }
      const data = await apiClient.getUserValidatedJourneys(userId);
      setJourneys(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur de chargement';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJourneys();
    setRefreshing(false);
  };

  const getTotalDistance = (): number => {
    return journeys.reduce((acc, j) => acc + (j.distance_km || 0), 0);
  };

  const getDistanceByMode = (): DistanceByMode[] => {
    const modes = [
      {
        mode: 'velo',
        label: 'Vélo',
        color: '#4CAF50',
        icon: <Bike size={28} color="#fff" />,
      },
      {
        mode: 'marche',
        label: 'Marche',
        color: '#2196F3',
        icon: <Footprints size={28} color="#fff" />,
      },
      {
        mode: 'transport_commun',
        label: 'Transport en commun',
        color: '#9C27B0',
        icon: <Bus size={28} color="#fff" />,
      },
      {
        mode: 'voiture',
        label: 'Voiture',
        color: '#FF9800',
        icon: <Car size={28} color="#fff" />,
      },
    ];

    return modes.map(m => {
      const modeJourneys = journeys.filter(j => j.transport_type === m.mode);
      const distance = modeJourneys.reduce((acc, j) => acc + (j.distance_km || 0), 0);
      const count = modeJourneys.length;
      return {
        ...m,
        distance,
        count,
      };
    });
  };

  const formatDistance = (km: number): string => {
    return `${km.toFixed(1)} km`;
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const totalDistance = getTotalDistance();
  const distanceByMode = getDistanceByMode();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#2E7D32']}
          tintColor="#2E7D32"
        />
      }>
      {/* Total Distance Card */}
      <View style={styles.totalCard}>
        <View style={styles.totalIconContainer}>
          <Route size={32} color="#fff" />
        </View>
        <View style={styles.totalInfo}>
          <Text style={styles.totalLabel}>Distance totale parcourue</Text>
          <Text style={styles.totalValue}>{formatDistance(totalDistance)}</Text>
          <Text style={styles.totalSubtext}>
            {journeys.length} trajet{journeys.length > 1 ? 's' : ''} validé{journeys.length > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Distance by Transport Mode */}
      <Text style={styles.sectionTitle}>Par mode de transport</Text>

      {distanceByMode.map((item, index) => (
        <View
          key={item.mode}
          style={[
            styles.modeCard,
            index === distanceByMode.length - 1 && styles.modeCardLast,
          ]}>
          <View style={[styles.modeIcon, {backgroundColor: item.color}]}>
            {item.icon}
          </View>
          <View style={styles.modeInfo}>
            <Text style={styles.modeLabel}>{item.label}</Text>
            <Text style={styles.modeCount}>
              {item.count} trajet{item.count > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.modeDistance}>
            <Text style={styles.modeDistanceValue}>
              {formatDistance(item.distance)}
            </Text>
            {totalDistance > 0 && (
              <Text style={styles.modePercentage}>
                {((item.distance / totalDistance) * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        </View>
      ))}

      {/* Progress bars */}
      <View style={styles.progressSection}>
        <Text style={styles.progressTitle}>Répartition</Text>
        {distanceByMode.map(item => (
          <View key={`progress-${item.mode}`} style={styles.progressItem}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>{item.label}</Text>
              <Text style={styles.progressValue}>{formatDistance(item.distance)}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: item.color,
                    width: totalDistance > 0
                      ? `${(item.distance / totalDistance) * 100}%`
                      : '0%',
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {journeys.length === 0 && (
        <View style={styles.emptyContainer}>
          <Route size={48} color="#ccc" />
          <Text style={styles.emptyText}>Aucun trajet validé</Text>
          <Text style={styles.emptySubtext}>
            Vos distances parcourues apparaîtront ici
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#d32f2f',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  totalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
  },
  totalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  totalSubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  modeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  modeCardLast: {
    marginBottom: 24,
  },
  modeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  modeInfo: {
    flex: 1,
  },
  modeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modeCount: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  modeDistance: {
    alignItems: 'flex-end',
  },
  modeDistanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modePercentage: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
  },
  progressValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});
