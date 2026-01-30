/**
 * Pending Journeys Screen - List of detected journeys awaiting validation
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Clock,
  Route,
  Trash2,
  ChevronRight,
  Bike,
  Footprints,
  Car,
  Bus,
  TrendingUp,
} from 'lucide-react-native';
import tripDetection from '../native/TripDetection';
import {LocalJourney} from '../api/types';

type RootStackParamList = {
  PendingJourneys: undefined;
  PendingJourneyDetail: {journeyId: number};
};

type NavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PendingJourneys'
>;

export default function PendingJourneysScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const [journeys, setJourneys] = useState<LocalJourney[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadJourneys();
    }, []),
  );

  const loadJourneys = async () => {
    try {
      const pending = await tripDetection.getPendingJourneys();
      setJourneys(pending);
    } catch (error) {
      console.error('Failed to load journeys:', error);
      Alert.alert('Erreur', 'Impossible de charger les trajets');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadJourneys();
    setRefreshing(false);
  };

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Supprimer ce trajet ?',
      'Cette action est irréversible.',
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await tripDetection.deleteLocalJourney(id);
              setJourneys(prev => prev.filter(j => j.id !== id));
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer le trajet');
            }
          },
        },
      ],
    );
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

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
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

  const renderJourney = ({item, index}: {item: LocalJourney; index: number}) => (
    <TouchableOpacity
      style={[
        styles.journeyCard,
        index === journeys.length - 1 && styles.journeyCardLast,
      ]}
      onPress={() =>
        navigation.navigate('PendingJourneyDetail', {journeyId: item.id})
      }
      activeOpacity={0.8}>
      <View style={styles.journeyHeader}>
        <View
          style={[
            styles.transportIconContainer,
            {backgroundColor: getTransportColor(item.detectedTransportType)},
          ]}>
          {getTransportIcon(item.detectedTransportType)}
        </View>
        <View style={styles.journeyInfo}>
          <Text style={styles.transportType}>
            {getTransportLabel(item.detectedTransportType)}
          </Text>
          <Text style={styles.journeyDate}>
            {formatDate(item.timeDeparture)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Trash2 size={18} color="#F44336" />
        </TouchableOpacity>
      </View>

      <View style={styles.journeyDetails}>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, {backgroundColor: '#E3F2FD'}]}>
            <Clock size={16} color="#1976D2" />
          </View>
          <View>
            <Text style={styles.detailValue}>{item.durationMinutes} min</Text>
            <Text style={styles.detailLabel}>Durée</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, {backgroundColor: '#E8F5E9'}]}>
            <Route size={16} color="#2E7D32" />
          </View>
          <View>
            <Text style={styles.detailValue}>
              {item.distanceKm.toFixed(1)} km
            </Text>
            <Text style={styles.detailLabel}>Distance</Text>
          </View>
        </View>
        <View style={styles.detailItem}>
          <View style={[styles.detailIcon, {backgroundColor: '#FFF3E0'}]}>
            <TrendingUp size={16} color="#E65100" />
          </View>
          <View>
            <Text style={styles.detailValue}>{item.confidenceAvg}%</Text>
            <Text style={styles.detailLabel}>Confiance</Text>
          </View>
        </View>
      </View>

      <View style={styles.journeyFooter}>
        <Text style={styles.validateHint}>Appuyer pour valider</Text>
        <ChevronRight size={18} color="#2E7D32" />
      </View>
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Route size={48} color="#ccc" />
      </View>
      <Text style={styles.emptyTitle}>Aucun trajet en attente</Text>
      <Text style={styles.emptySubtitle}>
        Vos trajets détectés apparaîtront ici pour validation
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <Text style={styles.headerTitle}>À valider</Text>
      <Text style={styles.headerSubtitle}>
        {journeys.length} trajet{journeys.length !== 1 ? 's' : ''} en attente
      </Text>
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
        data={journeys}
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
        ListHeaderComponent={journeys.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
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
    marginBottom: 16,
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
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  journeyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 10,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
  },
  validateHint: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
    marginRight: 4,
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
