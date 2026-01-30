/**
 * Validated Journey Detail Screen - View details of a validated journey
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import {
  Clock,
  MapPin,
  Route,
  Calendar,
  Trophy,
  Bike,
  Footprints,
  Car,
  Bus,
  Zap,
  Leaf,
  Navigation,
  Target,
  Timer,
  TrendingUp,
} from 'lucide-react-native';
import {JourneyRead} from '../api/types';

type RootStackParamList = {
  ValidatedJourneyDetail: {journey: JourneyRead};
};

type RouteType = RouteProp<RootStackParamList, 'ValidatedJourneyDetail'>;

export default function ValidatedJourneyDetailScreen(): JSX.Element {
  const route = useRoute<RouteType>();
  const {journey} = route.params;

  const getTransportLabel = (type: string): string => {
    const labels: Record<string, string> = {
      marche: 'Marche à pied',
      velo: 'Vélo',
      voiture: 'Voiture',
      transport_commun: 'Transport en commun',
    };
    return labels[type] || type;
  };

  const getTransportIcon = (type: string, size: number = 32) => {
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

  const formatDateTime = (isoDate: string): {date: string; time: string} => {
    const date = new Date(isoDate);
    return {
      date: date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const departureDateTime = formatDateTime(journey.time_departure);
  const arrivalDateTime = formatDateTime(journey.time_arrival);
  const transportColor = getTransportColor(journey.transport_type);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Card */}
      <View style={styles.headerCard}>
        <View
          style={[
            styles.transportIconLarge,
            {backgroundColor: transportColor},
          ]}>
          {getTransportIcon(journey.transport_type, 40)}
        </View>
        <Text style={styles.transportTitle}>
          {getTransportLabel(journey.transport_type)}
        </Text>
        <Text style={styles.dateText}>{departureDateTime.date}</Text>
        
        {/* Score Badge */}
        <View style={styles.scoreBadge}>
          <Trophy size={24} color="#FFD700" />
          <Text style={styles.scoreText}>+{journey.score_journey} points</Text>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, {backgroundColor: '#E3F2FD'}]}>
            <Route size={24} color="#1976D2" />
          </View>
          <Text style={styles.statValue}>{journey.distance_km.toFixed(1)} km</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, {backgroundColor: '#E8F5E9'}]}>
            <Timer size={24} color="#2E7D32" />
          </View>
          <Text style={styles.statValue}>{journey.duration_minutes} min</Text>
          <Text style={styles.statLabel}>Durée</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, {backgroundColor: '#F3E5F5'}]}>
            <Leaf size={24} color="#7B1FA2" />
          </View>
          <Text style={styles.statValue}>
            {journey.carbon_footprint > 0 
              ? `${journey.carbon_footprint.toFixed(1)} kg`
              : '0 kg'
            }
          </Text>
          <Text style={styles.statLabel}>CO₂</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, {backgroundColor: '#FFF3E0'}]}>
            <TrendingUp size={24} color="#E65100" />
          </View>
          <Text style={styles.statValue}>
            {journey.duration_minutes > 0
              ? ((journey.distance_km / journey.duration_minutes) * 60).toFixed(1)
              : '0'} km/h
          </Text>
          <Text style={styles.statLabel}>Vitesse moy.</Text>
        </View>
      </View>

      {/* Timeline Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itinéraire</Text>
        
        <View style={styles.timelineCard}>
          {/* Departure */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, {backgroundColor: '#4CAF50'}]}>
                <Navigation size={14} color="#fff" />
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Départ</Text>
              <Text style={styles.timelinePlace}>{journey.place_departure}</Text>
              <View style={styles.timeRow}>
                <Clock size={14} color="#666" />
                <Text style={styles.timeText}>{departureDateTime.time}</Text>
              </View>
            </View>
          </View>

          {/* Arrival */}
          <View style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[styles.timelineDot, {backgroundColor: '#F44336'}]}>
                <Target size={14} color="#fff" />
              </View>
            </View>
            <View style={styles.timelineContent}>
              <Text style={styles.timelineLabel}>Arrivée</Text>
              <Text style={styles.timelinePlace}>{journey.place_arrival}</Text>
              <View style={styles.timeRow}>
                <Clock size={14} color="#666" />
                <Text style={styles.timeText}>{arrivalDateTime.time}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Journey Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Calendar size={18} color="#666" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date du trajet</Text>
              <Text style={styles.infoValue}>{departureDateTime.date}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Zap size={18} color="#666" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Source de détection</Text>
              <Text style={styles.infoValue}>
                {journey.detection_source === 'auto'
                  ? 'Détection automatique'
                  : 'Saisie manuelle'}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Trophy size={18} color="#666" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Points attribués</Text>
              <Text style={[styles.infoValue, {color: '#2E7D32', fontWeight: '700'}]}>
                +{journey.score_journey} points
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Spacing */}
      <View style={{height: 30}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  transportIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  transportTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
    marginTop: 20,
    gap: 8,
  },
  scoreText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F57C00',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  timelineCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineLine: {
    width: 2,
    height: 50,
    backgroundColor: '#e0e0e0',
    marginVertical: 8,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 20,
  },
  timelineLabel: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
    marginBottom: 4,
  },
  timelinePlace: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 52,
  },
});
