/**
 * Validated Journeys Screen - List of journeys sent to backend
 */

import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import {useFocusEffect, useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Clock,
  Route,
  MapPin,
  Bike,
  Footprints,
  Car,
  Bus,
  Trophy,
  Zap,
  Leaf,
  ChevronRight,
} from 'lucide-react-native';
import {apiClient} from '../api/client';
import {JourneyRead} from '../api/types';

type RootStackParamList = {
  ValidatedJourneys: {transportFilter?: string} | undefined;
  ValidatedJourneyDetail: {journey: JourneyRead};
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ValidatedJourneysRouteProp = RouteProp<RootStackParamList, 'ValidatedJourneys'>;

export default function ValidatedJourneysScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ValidatedJourneysRouteProp>();
  const transportFilter = route.params?.transportFilter;
  
  const [journeys, setJourneys] = useState<JourneyRead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter journeys by transport type if filter is set
  const filteredJourneys = useMemo(() => {
    if (!transportFilter) return journeys;
    return journeys.filter(j => j.transport_type === transportFilter);
  }, [journeys, transportFilter]);

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

  const getTransportLabel = (type: string): string => {
    const labels: Record<string, string> = {
      marche: 'Marche',
      velo: 'Vélo',
      voiture: 'Voiture',
      transport_commun: 'Transport en commun',
    };
    return labels[type] || type;
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'velo':
        return <Bike size={22} color="#fff" />;
      case 'marche':
        return <Footprints size={22} color="#fff" />;
      case 'voiture':
        return <Car size={22} color="#fff" />;
      case 'transport_commun':
        return <Bus size={22} color="#fff" />;
      default:
        return <Route size={22} color="#fff" />;
    }
  };

  const getTransportColor = (type: string): string => {
    switch (type) {
      case 'velo':
        return '#4CAF50';
      case 'marche':
        return '#2196F3';
      case 'voiture':
        return '#FF9800';
      case 'transport_commun':
        return '#9C27B0';
      default:
        return '#607D8B';
    }
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dayLabel = '';
    if (date.toDateString() === today.toDateString()) {
      dayLabel = "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayLabel = 'Hier';
    } else {
      dayLabel = date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      });
    }

    const time = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${dayLabel} à ${time}`;
  };

  const getTotalScore = (): number => {
    return filteredJourneys.reduce((acc, j) => acc + j.score_journey, 0);
  };

  const getTotalDistance = (): number => {
    return filteredJourneys.reduce((acc, j) => acc + j.distance_km, 0);
  };

  const getTotalCO2 = (): number => {
    return filteredJourneys.reduce((acc, j) => acc + (j.carbon_footprint || 0), 0);
  };

  const getFilterLabel = (): string => {
    if (!transportFilter) return '';
    const labels: Record<string, string> = {
      marche: 'à pied',
      velo: 'à vélo',
      voiture: 'en voiture',
      transport_commun: 'en transport',
    };
    return labels[transportFilter] || '';
  };

  const getFilterIcon = () => {
    switch (transportFilter) {
      case 'velo':
        return <Bike size={48} color="#4CAF50" />;
      case 'marche':
        return <Footprints size={48} color="#2196F3" />;
      case 'voiture':
        return <Car size={48} color="#FF9800" />;
      case 'transport_commun':
        return <Bus size={48} color="#9C27B0" />;
      default:
        return <Route size={48} color="#ccc" />;
    }
  };

  const renderJourney = ({item, index}: {item: JourneyRead; index: number}) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('ValidatedJourneyDetail', {journey: item})}
      activeOpacity={0.7}
      style={[
        styles.journeyCard,
        index === filteredJourneys.length - 1 && styles.journeyCardLast,
      ]}>
      <View style={styles.journeyHeader}>
        <View
          style={[
            styles.transportIconContainer,
            {backgroundColor: getTransportColor(item.transport_type)},
          ]}>
          {getTransportIcon(item.transport_type)}
        </View>
        <View style={styles.journeyInfo}>
          <Text style={styles.transportType}>
            {getTransportLabel(item.transport_type)}
          </Text>
          <Text style={styles.journeyDate}>
            {formatDate(item.time_departure)}
          </Text>
        </View>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>+{item.score_journey}</Text>
          <Text style={styles.scoreLabel}>pts</Text>
        </View>
      </View>

      <View style={styles.journeyDetails}>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, {backgroundColor: '#E3F2FD'}]}>
            <Clock size={16} color="#1976D2" />
          </View>
          <View>
            <Text style={styles.detailValue}>{item.duration_minutes} min</Text>
            <Text style={styles.detailLabel}>Durée</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, {backgroundColor: '#E8F5E9'}]}>
            <Route size={16} color="#2E7D32" />
          </View>
          <View>
            <Text style={styles.detailValue}>
              {item.distance_km.toFixed(1)} km
            </Text>
            <Text style={styles.detailLabel}>Distance</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, {backgroundColor: '#F3E5F5'}]}>
            <Leaf size={16} color="#7B1FA2" />
          </View>
          <View>
            <Text style={styles.detailValue}>
              {item.carbon_footprint > 0 
                ? `${item.carbon_footprint.toFixed(1)} kg`
                : '0 kg'
              }
            </Text>
            <Text style={styles.detailLabel}>CO₂</Text>
          </View>
        </View>
      </View>

      <View style={styles.placesContainer}>
        <MapPin size={14} color="#999" />
        <Text style={styles.placeText} numberOfLines={1}>
          {item.place_departure} → {item.place_arrival}
        </Text>
        <ChevronRight size={18} color="#ccc" style={{marginLeft: 'auto'}} />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[
        styles.emptyIconContainer, 
        transportFilter && {backgroundColor: getTransportColor(transportFilter) + '20'}
      ]}>
        {transportFilter ? getFilterIcon() : <Route size={48} color="#ccc" />}
      </View>
      <Text style={styles.emptyTitle}>
        {transportFilter 
          ? `Aucun trajet ${getFilterLabel()}`
          : 'Aucun trajet validé'
        }
      </Text>
      <Text style={styles.emptySubtitle}>
        {transportFilter
          ? `Vous n'avez pas encore effectué de trajet ${getFilterLabel()}`
          : 'Validez vos trajets détectés pour les voir apparaître ici'
        }
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, {backgroundColor: '#FFEBEE'}]}>
        <Route size={48} color="#F44336" />
      </View>
      <Text style={styles.emptyTitle}>Erreur de chargement</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text style={styles.headerTitle}>
        {transportFilter 
          ? `Trajets ${getFilterLabel()}`
          : 'Historique'
        }
      </Text>
      <Text style={styles.headerSubtitle}>
        {filteredJourneys.length} trajet{filteredJourneys.length !== 1 ? 's' : ''} validé
        {filteredJourneys.length !== 1 ? 's' : ''}
      </Text>

      {/* Stats Summary */}
      <View style={styles.statsRowFirst}>
        <View style={styles.statItemCentered}>
          <View style={[styles.statIcon, {backgroundColor: '#E8F5E9'}]}>
            <Trophy size={20} color="#2E7D32" />
          </View>
          <View style={styles.statTextCentered}>
            <Text style={styles.statValueLarge}>{getTotalScore()}</Text>
            <Text style={styles.statLabel}>points gagnés</Text>
          </View>
        </View>
      </View>
      <View style={styles.statsRowSecond}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, {backgroundColor: '#E3F2FD'}]}>
            <Route size={20} color="#1976D2" />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{getTotalDistance().toFixed(1)} km</Text>
            <Text style={styles.statLabel}>parcourus</Text>
          </View>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, {backgroundColor: '#F3E5F5'}]}>
            <Leaf size={20} color="#7B1FA2" />
          </View>
          <View style={styles.statTextContainer}>
            <Text style={styles.statValue}>{getTotalCO2().toFixed(1)} kg</Text>
            <Text style={styles.statLabel}>CO₂ économisé</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredJourneys}
        renderItem={renderJourney}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#2E7D32']}
            tintColor="#2E7D32"
          />
        }
        ListHeaderComponent={filteredJourneys.length > 0 ? renderHeader : null}
        ListEmptyComponent={error ? renderError : renderEmpty}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  listContent: {
    padding: 16,
    paddingTop: 55,
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
  },
  headerSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 4,
  },
  statsRowFirst: {
    marginTop: 16,
  },
  statsRowSecond: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 12,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statItemCentered: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  statTextContainer: {
    flex: 1,
  },
  statTextCentered: {
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statValueLarge: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  journeyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  journeyCardLast: {
    marginBottom: 0,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  transportIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transportType: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  journeyDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scoreContainer: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 1,
  },
  journeyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#999',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  placeText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
});
