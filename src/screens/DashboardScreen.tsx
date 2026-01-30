/**
 * Dashboard Screen
 * Main screen with user statistics and recent journeys
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {
  Trophy,
  Leaf,
  MapPin,
  Route,
  Bike,
  Footprints,
  Car,
  Bus,
  Clock,
  ChevronRight,
} from 'lucide-react-native';

import {useAuth} from '@/context/AuthContext';
import {apiClient} from '@/api/client';
import {UserStats, ValidatedJourney, UserProfile, JourneyRead} from '@/api/types';

type RootStackParamList = {
  ValidatedJourneys: {transportFilter?: string} | undefined;
  ValidatedJourneyDetail: {journey: JourneyRead};
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const {width} = Dimensions.get('window');

export default function DashboardScreen(): JSX.Element {
  const navigation = useNavigation<NavigationProp>();
  const {userId} = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [journeys, setJourneys] = useState<ValidatedJourney[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transportStats, setTransportStats] = useState({
    transport_commun_count: 0,
    transport_commun_distance: 0,
  });

  const fetchData = useCallback(async () => {
    if (!userId) return;

    try {
      const [profileData, statsData, journeysData] = await Promise.all([
        apiClient.getUserProfile(userId).catch(() => null),
        apiClient.getUserStats(userId).catch(() => null),
        apiClient.getUserValidatedJourneys(userId).catch(() => []),
      ]);

      setUserProfile(profileData);
      setStats(statsData);
      // Get only last 3 journeys
      setJourneys(journeysData.slice(0, 3));

      // Calculate transport_commun stats from journeys
      const tcJourneys = journeysData.filter(j => j.transport_type === 'transport_commun');
      setTransportStats({
        transport_commun_count: tcJourneys.length,
        transport_commun_distance: tcJourneys.reduce((acc, j) => acc + j.distance_km, 0),
      });
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const formatDistance = (km: number) => {
    if (km >= 1000) {
      return `${(km / 1000).toFixed(1)}k`;
    }
    return km.toFixed(1);
  };

  const formatCO2 = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${kg.toFixed(1)}kg`;
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'velo':
        return <Bike size={20} color="#fff" />;
      case 'marche':
        return <Footprints size={20} color="#fff" />;
      case 'voiture':
        return <Car size={20} color="#fff" />;
      case 'transport_commun':
        return <Bus size={20} color="#fff" />;
      default:
        return <Route size={20} color="#fff" />;
    }
  };

  const getTransportColor = (type: string) => {
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

  const getTransportLabel = (type: string) => {
    switch (type) {
      case 'velo':
        return 'Velo';
      case 'marche':
        return 'Marche';
      case 'voiture':
        return 'Voiture';
      case 'transport_commun':
        return 'Transport';
      default:
        return type;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  if (loading) {
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
      {/* Header Title */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
      </View>

      {/* Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreCardGradient}>
          <View style={styles.scoreHeader}>
            <View style={styles.scoreIconContainer}>
              <Trophy size={28} color="#FFD700" />
            </View>
          </View>
          <Text style={styles.scoreValue}>{stats?.score_total || 0}</Text>
          <Text style={styles.scoreLabel}>Points Green Mobility</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('DistanceHistory')}
          activeOpacity={0.7}
          style={[styles.statCard, styles.statCardPrimary]}>
          <View style={styles.statIconContainer}>
            <Route size={22} color="#2E7D32" />
          </View>
          <Text style={styles.statValue}>
            {formatDistance(stats?.total_distance_km || 0)}
          </Text>
          <Text style={styles.statUnit}>km</Text>
          <Text style={styles.statLabel}>Distance totale</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('ValidatedJourneys', {})}
          activeOpacity={0.7}
          style={[styles.statCard, styles.statCardSecondary]}>
          <View style={[styles.statIconContainer, {backgroundColor: '#E3F2FD'}]}>
            <MapPin size={22} color="#1976D2" />
          </View>
          <Text style={styles.statValue}>
            {stats?.validated_journey_count || 0}
          </Text>
          <Text style={styles.statUnit}>trajets</Text>
          <Text style={styles.statLabel}>Validés</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => navigation.navigate('CO2History')}
          activeOpacity={0.7}
          style={[styles.statCard, styles.statCardTertiary]}>
          <View style={[styles.statIconContainer, {backgroundColor: '#F3E5F5'}]}>
            <Leaf size={22} color="#7B1FA2" />
          </View>
          <Text style={styles.statValue}>
            {formatCO2(stats?.carbon_footprint_total || 0)}
          </Text>
          <Text style={styles.statUnit}>CO2</Text>
          <Text style={styles.statLabel}>Économisé</Text>
        </TouchableOpacity>
      </View>

      {/* Transport Breakdown */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Par mode de transport</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ValidatedJourneys')}
            style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <ChevronRight size={16} color="#2E7D32" />
          </TouchableOpacity>
        </View>
        <View style={styles.transportGrid}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('ValidatedJourneys', {transportFilter: 'velo'})}
            activeOpacity={0.7}
            style={styles.transportCard}>
            <View style={[styles.transportIcon, {backgroundColor: '#E8F5E9'}]}>
              <Bike size={24} color="#4CAF50" />
            </View>
            <View style={styles.transportInfo}>
              <Text style={styles.transportValue}>
                {stats?.bike_journey_count || 0}
              </Text>
              <Text style={styles.transportLabel}>trajets vélo</Text>
            </View>
            <Text style={styles.transportDistance}>
              {formatDistance(stats?.bike_distance_km || 0)} km
            </Text>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('ValidatedJourneys', {transportFilter: 'marche'})}
            activeOpacity={0.7}
            style={styles.transportCard}>
            <View style={[styles.transportIcon, {backgroundColor: '#E3F2FD'}]}>
              <Footprints size={24} color="#2196F3" />
            </View>
            <View style={styles.transportInfo}>
              <Text style={styles.transportValue}>
                {stats?.walk_journey_count || 0}
              </Text>
              <Text style={styles.transportLabel}>trajets marche</Text>
            </View>
            <Text style={styles.transportDistance}>
              {formatDistance(stats?.walk_distance_km || 0)} km
            </Text>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('ValidatedJourneys', {transportFilter: 'transport_commun'})}
            activeOpacity={0.7}
            style={styles.transportCard}>
            <View style={[styles.transportIcon, {backgroundColor: '#F3E5F5'}]}>
              <Bus size={24} color="#9C27B0" />
            </View>
            <View style={styles.transportInfo}>
              <Text style={styles.transportValue}>
                {transportStats.transport_commun_count}
              </Text>
              <Text style={styles.transportLabel}>trajets transport</Text>
            </View>
            <Text style={styles.transportDistance}>
              {formatDistance(transportStats.transport_commun_distance)} km
            </Text>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('ValidatedJourneys', {transportFilter: 'voiture'})}
            activeOpacity={0.7}
            style={styles.transportCard}>
            <View style={[styles.transportIcon, {backgroundColor: '#FFF3E0'}]}>
              <Car size={24} color="#FF9800" />
            </View>
            <View style={styles.transportInfo}>
              <Text style={styles.transportValue}>
                {stats?.car_journey_count || 0}
              </Text>
              <Text style={styles.transportLabel}>trajets voiture</Text>
            </View>
            <Text style={styles.transportDistance}>
              {formatDistance(stats?.car_distance_km || 0)} km
            </Text>
            <ChevronRight size={18} color="#ccc" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Journeys */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Derniers trajets</Text>
          {journeys.length > 0 && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('ValidatedJourneys')}
              style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>Voir tout</Text>
              <ChevronRight size={16} color="#2E7D32" />
            </TouchableOpacity>
          )}
        </View>
        {journeys.length === 0 ? (
          <View style={styles.emptyJourneys}>
            <Route size={40} color="#ccc" />
            <Text style={styles.emptyText}>Aucun trajet validé</Text>
            <Text style={styles.emptySubtext}>
              Vos trajets apparaîtront ici
            </Text>
          </View>
        ) : (
          <View style={styles.journeysList}>
            {journeys.map((journey, index) => (
              <TouchableOpacity
                key={journey.id}
                onPress={() => navigation.navigate('ValidatedJourneyDetail', {journey: journey as unknown as JourneyRead})}
                activeOpacity={0.7}
                style={[
                  styles.journeyCard,
                  index === journeys.length - 1 && styles.journeyCardLast,
                ]}>
                <View
                  style={[
                    styles.journeyIcon,
                    {backgroundColor: getTransportColor(journey.transport_type)},
                  ]}>
                  {getTransportIcon(journey.transport_type)}
                </View>
                <View style={styles.journeyContent}>
                  <View style={styles.journeyHeader}>
                    <Text style={styles.journeyRoute} numberOfLines={1}>
                      {journey.place_departure} → {journey.place_arrival}
                    </Text>
                    <Text style={styles.journeyScore}>
                      +{journey.score_journey} pts
                    </Text>
                  </View>
                  <View style={styles.journeyMeta}>
                    <View style={styles.journeyMetaItem}>
                      <Clock size={12} color="#999" />
                      <Text style={styles.journeyMetaText}>
                        {journey.duration_minutes} min
                      </Text>
                    </View>
                    <View style={styles.journeyMetaItem}>
                      <Route size={12} color="#999" />
                      <Text style={styles.journeyMetaText}>
                        {journey.distance_km.toFixed(1)} km
                      </Text>
                    </View>
                    <Text style={styles.journeyDate}>
                      {formatDate(journey.validated_at || journey.created_at)}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={18} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        )}
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
    paddingTop: 55,
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
  welcomeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
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
  scoreCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  scoreCardGradient: {
    backgroundColor: '#1a1a1a',
    padding: 24,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statCardPrimary: {},
  statCardSecondary: {},
  statCardTertiary: {},
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statUnit: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  transportGrid: {
    paddingHorizontal: 16,
    gap: 10,
  },
  transportCard: {
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
  transportIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transportInfo: {
    flex: 1,
    marginLeft: 14,
  },
  transportValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  transportLabel: {
    fontSize: 13,
    color: '#666',
  },
  transportDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  emptyJourneys: {
    alignItems: 'center',
    paddingVertical: 32,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  journeysList: {
    paddingHorizontal: 16,
  },
  journeyCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
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
  journeyIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  journeyContent: {
    flex: 1,
    marginLeft: 12,
  },
  journeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journeyRoute: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    marginRight: 8,
  },
  journeyScore: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  journeyMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
  },
  journeyMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  journeyMetaText: {
    fontSize: 12,
    color: '#666',
  },
  journeyDate: {
    fontSize: 12,
    color: '#999',
    marginLeft: 'auto',
  },
  bottomSpacer: {
    height: 32,
  },
});
