/**
 * CO2 History Screen - Simple list of CO2 per journey
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {
  Leaf,
  Bike,
  Footprints,
  Car,
  Bus,
  Route,
} from 'lucide-react-native';
import {apiClient} from '../api/client';
import {ValidatedJourney} from '../api/types';

export default function CO2HistoryScreen(): JSX.Element {
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

  const getTransportIcon = (type: string) => {
    const size = 20;
    const color = '#fff';
    switch (type) {
      case 'velo':
        return <Bike size={size} color={color} />;
      case 'marche':
        return <Footprints size={size} color={color} />;
      case 'voiture':
        return <Car size={size} color={color} />;
      case 'transport_commun':
        return <Bus size={size} color={color} />;
      default:
        return <Route size={size} color={color} />;
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

  const getTransportLabel = (type: string): string => {
    const labels: Record<string, string> = {
      marche: 'Marche',
      velo: 'Vélo',
      voiture: 'Voiture',
      transport_commun: 'Transport',
    };
    return labels[type] || type;
  };

  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getTotalCO2 = (): number => {
    return journeys.reduce((acc, j) => acc + (j.carbon_footprint || 0), 0);
  };

  const renderJourney = ({item, index}: {item: ValidatedJourney; index: number}) => {
    const isEcoFriendly = item.transport_type === 'marche' || item.transport_type === 'velo';
    
    return (
      <View
        style={[
          styles.journeyCard,
          index === journeys.length - 1 && styles.journeyCardLast,
        ]}>
        <View
          style={[
            styles.transportIcon,
            {backgroundColor: getTransportColor(item.transport_type)},
          ]}>
          {getTransportIcon(item.transport_type)}
        </View>
        
        <View style={styles.journeyInfo}>
          <Text style={styles.transportType}>
            {getTransportLabel(item.transport_type)}
          </Text>
          <Text style={styles.journeyDate}>
            {formatDate(item.time_departure)} • {item.distance_km.toFixed(1)} km
          </Text>
        </View>
        
        <View style={styles.co2Container}>
          {isEcoFriendly ? (
            <View style={styles.ecoBadge}>
              <Leaf size={14} color="#4CAF50" />
              <Text style={styles.ecoText}>Éco</Text>
            </View>
          ) : (
            <Text style={styles.co2Value}>
              {item.carbon_footprint.toFixed(1)} kg
            </Text>
          )}
          <Text style={styles.co2Label}>CO₂</Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.totalCard}>
        <View style={styles.totalIconContainer}>
          <Leaf size={32} color="#7B1FA2" />
        </View>
        <Text style={styles.totalValue}>{getTotalCO2().toFixed(1)} kg</Text>
        <Text style={styles.totalLabel}>CO₂ total émis</Text>
        <Text style={styles.totalSubtitle}>
          {journeys.length} trajet{journeys.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <Text style={styles.listTitle}>Détail par trajet</Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Leaf size={48} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>Aucun trajet</Text>
      <Text style={styles.emptySubtitle}>
        Vos émissions CO₂ apparaîtront ici
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, {backgroundColor: '#FFEBEE'}]}>
        <Leaf size={48} color="#F44336" />
      </View>
      <Text style={styles.emptyTitle}>Erreur de chargement</Text>
      <Text style={styles.emptySubtitle}>{error}</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B1FA2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={journeys}
        renderItem={renderJourney}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7B1FA2']}
            tintColor="#7B1FA2"
          />
        }
        ListHeaderComponent={journeys.length > 0 ? renderHeader : null}
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
    flexGrow: 1,
  },
  headerSection: {
    marginBottom: 16,
  },
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  totalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#7B1FA2',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  totalSubtitle: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  journeyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  journeyCardLast: {
    marginBottom: 0,
  },
  transportIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  transportType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  journeyDate: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  co2Container: {
    alignItems: 'flex-end',
  },
  co2Value: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF9800',
  },
  co2Label: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  ecoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ecoText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
