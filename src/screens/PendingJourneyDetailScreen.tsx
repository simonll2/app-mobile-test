/**
 * Pending Journey Detail Screen - Edit and validate a journey
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {
  Clock,
  MapPin,
  Route,
  Gauge,
  ChevronLeft,
  Check,
  Bike,
  Footprints,
  Car,
  Bus,
  Sparkles,
  Navigation,
  Target,
  Send,
} from 'lucide-react-native';
import tripDetection from '../native/TripDetection';
import {apiClient} from '../api/client';
import {LocalJourney, TransportType, JourneyCreate} from '../api/types';
import {reverseGeocode} from '../utils/geocoding';

type RootStackParamList = {
  PendingJourneyDetail: {journeyId: number};
};

type RouteType = RouteProp<RootStackParamList, 'PendingJourneyDetail'>;

const TRANSPORT_OPTIONS: {
  value: TransportType;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}[] = [
  {
    value: 'marche',
    label: 'Marche',
    icon: <Footprints size={28} color="#4CAF50" />,
    color: '#4CAF50',
    bgColor: '#E8F5E9',
  },
  {
    value: 'velo',
    label: 'Vélo',
    icon: <Bike size={28} color="#2196F3" />,
    color: '#2196F3',
    bgColor: '#E3F2FD',
  },
  {
    value: 'transport_commun',
    label: 'Transport',
    icon: <Bus size={28} color="#9C27B0" />,
    color: '#9C27B0',
    bgColor: '#F3E5F5',
  },
  {
    value: 'voiture',
    label: 'Voiture',
    icon: <Car size={28} color="#FF9800" />,
    color: '#FF9800',
    bgColor: '#FFF3E0',
  },
];

export default function PendingJourneyDetailScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const {journeyId} = route.params;

  const [journey, setJourney] = useState<LocalJourney | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const [rewardScore, setRewardScore] = useState(0);

  // Editable fields
  const [transportType, setTransportType] = useState<TransportType>('marche');
  const [distanceKm, setDistanceKm] = useState('');
  const [placeDeparture, setPlaceDeparture] = useState('');
  const [placeArrival, setPlaceArrival] = useState('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  useEffect(() => {
    loadJourney();
  }, [journeyId]);

  const loadJourney = async () => {
    try {
      const data = await tripDetection.getJourney(journeyId);
      setJourney(data);

      // Initialize editable fields
      setTransportType(data.detectedTransportType as TransportType);
      setDistanceKm(data.distanceKm.toFixed(2));

      // Load real addresses from GPS coordinates
      await loadAddressesFromCoordinates(data);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger le trajet');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  const loadAddressesFromCoordinates = async (data: LocalJourney) => {
    setIsLoadingAddresses(true);
    
    try {
      // Geocode departure location
      if (data.startLatitude && data.startLongitude) {
        const departureResult = await reverseGeocode(data.startLatitude, data.startLongitude);
        setPlaceDeparture(departureResult.shortAddress);
      } else {
        setPlaceDeparture(data.placeDeparture || 'Lieu de départ');
      }

      // Geocode arrival location
      if (data.endLatitude && data.endLongitude) {
        const arrivalResult = await reverseGeocode(data.endLatitude, data.endLongitude);
        setPlaceArrival(arrivalResult.shortAddress);
      } else {
        setPlaceArrival(data.placeArrival || "Lieu d'arrivée");
      }
    } catch (error) {
      console.warn('Failed to load addresses:', error);
      setPlaceDeparture(data.placeDeparture || 'Lieu de départ');
      setPlaceArrival(data.placeArrival || "Lieu d'arrivée");
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleValidateAndSend = async () => {
    if (!journey) {
      return;
    }

    setIsSending(true);

    try {
      // Validation avec valeurs par défaut pour tester la détection automatique
      let finalDistance = parseFloat(distanceKm);
      if (isNaN(finalDistance) || finalDistance <= 0) {
        console.warn(
          'Distance invalide, utilisation de la valeur par défaut: 0.5 km',
        );
        finalDistance = 0.5; // Valeur par défaut pour test
      }

      let finalPlaceDeparture = placeDeparture.trim();
      if (!finalPlaceDeparture) {
        console.warn(
          'Lieu de départ vide, utilisation de la valeur par défaut',
        );
        finalPlaceDeparture = 'Départ auto-détecté';
      }

      let finalPlaceArrival = placeArrival.trim();
      if (!finalPlaceArrival) {
        console.warn(
          "Lieu d'arrivée vide, utilisation de la valeur par défaut",
        );
        finalPlaceArrival = 'Arrivée auto-détectée';
      }

      // Validation des timestamps avec valeurs par défaut
      let timeDepartureISO: string;
      let timeArrivalISO: string;

      if (
        !journey.timeDeparture ||
        isNaN(journey.timeDeparture) ||
        journey.timeDeparture <= 0
      ) {
        console.warn(
          'Timestamp de départ invalide, utilisation de la date actuelle',
        );
        timeDepartureISO = new Date().toISOString();
      } else {
        const departureDate = new Date(journey.timeDeparture);
        if (isNaN(departureDate.getTime())) {
          console.warn(
            'Date de départ invalide, utilisation de la date actuelle',
          );
          timeDepartureISO = new Date().toISOString();
        } else {
          timeDepartureISO = departureDate.toISOString();
        }
      }

      if (
        !journey.timeArrival ||
        isNaN(journey.timeArrival) ||
        journey.timeArrival <= 0
      ) {
        console.warn(
          "Timestamp d'arrivée invalide, utilisation de la date actuelle",
        );
        timeArrivalISO = new Date().toISOString();
      } else {
        const arrivalDate = new Date(journey.timeArrival);
        if (isNaN(arrivalDate.getTime())) {
          console.warn(
            "Date d'arrivée invalide, utilisation de la date actuelle",
          );
          timeArrivalISO = new Date().toISOString();
        } else {
          timeArrivalISO = arrivalDate.toISOString();
        }
      }

      // Validation du transport type avec valeur par défaut
      const validTransportTypes: TransportType[] = [
        'marche',
        'velo',
        'transport_commun',
        'voiture',
      ];
      let finalTransportType = transportType;
      if (!validTransportTypes.includes(transportType)) {
        console.warn(
          `Transport type invalide (${transportType}), utilisation de "marche" par défaut`,
        );
        finalTransportType = 'marche';
      }

      // Update local journey first
      await tripDetection.updateLocalJourney(journey.id, {
        transportType: finalTransportType,
        distanceKm: finalDistance,
        placeDeparture: finalPlaceDeparture,
        placeArrival: finalPlaceArrival,
      });

      // Prepare journey for backend
      const journeyCreate: JourneyCreate = {
        place_departure: finalPlaceDeparture,
        place_arrival: finalPlaceArrival,
        time_departure: timeDepartureISO,
        time_arrival: timeArrivalISO,
        distance_km: finalDistance,
        transport_type: finalTransportType,
        detection_source: 'auto',
      };

      console.log('Envoi du trajet avec les données:', journeyCreate);

      // Send to backend
      const result = await apiClient.createJourney(journeyCreate);

      // Mark as sent locally
      await tripDetection.markJourneySent(journey.id);

      // Show reward
      setRewardScore(result.score_journey);
      setShowReward(true);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      console.error("Erreur lors de l'envoi du trajet:", error);
      Alert.alert('Erreur', `Impossible d'envoyer le trajet: ${message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseReward = () => {
    setShowReward(false);
    navigation.goBack();
  };

  const formatDateTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getSelectedTransport = () => {
    return TRANSPORT_OPTIONS.find(t => t.value === transportType);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (!journey) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Trajet non trouvé</Text>
      </View>
    );
  }

  const selectedTransport = getSelectedTransport();

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <ChevronLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Valider le trajet</Text>
            <Text style={styles.headerSubtitle}>
              Vérifiez et ajustez les détails
            </Text>
          </View>
        </View>

        {/* Journey Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View
              style={[
                styles.transportBadge,
                {backgroundColor: selectedTransport?.bgColor || '#E8F5E9'},
              ]}>
              {selectedTransport?.icon}
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryDate}>
                {formatDateTime(journey.timeDeparture)}
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <Clock size={14} color="#666" />
                  <Text style={styles.statText}>
                    {journey.durationMinutes} min
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Route size={14} color="#666" />
                  <Text style={styles.statText}>
                    {parseFloat(distanceKm).toFixed(1)} km
                  </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Gauge size={14} color="#666" />
                  <Text style={styles.statText}>{journey.confidenceAvg}%</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timeline}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>
                  {formatTime(journey.timeDeparture)}
                </Text>
                <Text style={styles.timelineLabel}>Départ</Text>
              </View>
            </View>
            <View style={styles.timelineLine} />
            <View style={styles.timelineItem}>
              <View style={[styles.timelineDot, styles.timelineDotEnd]} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineTime}>
                  {formatTime(journey.timeArrival)}
                </Text>
                <Text style={styles.timelineLabel}>Arrivée</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Transport Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mode de transport</Text>
          <View style={styles.transportGrid}>
            {TRANSPORT_OPTIONS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.transportOption,
                  transportType === option.value && {
                    borderColor: option.color,
                    backgroundColor: option.bgColor,
                  },
                ]}
                onPress={() => setTransportType(option.value)}
                activeOpacity={0.7}>
                <View
                  style={[
                    styles.transportIconContainer,
                    {backgroundColor: option.bgColor},
                  ]}>
                  {option.icon}
                </View>
                <Text
                  style={[
                    styles.transportLabel,
                    transportType === option.value && {
                      color: option.color,
                      fontWeight: '600',
                    },
                  ]}>
                  {option.label}
                </Text>
                {transportType === option.value && (
                  <View
                    style={[
                      styles.checkBadge,
                      {backgroundColor: option.color},
                    ]}>
                    <Check size={12} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Location Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détails du parcours</Text>
          <View style={styles.detailsCard}>
            {/* Distance */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <View style={styles.inputIconContainer}>
                  <Route size={18} color="#4CAF50" />
                </View>
                <Text style={styles.inputLabel}>Distance (km)</Text>
              </View>
              <TextInput
                style={styles.input}
                value={distanceKm}
                onChangeText={setDistanceKm}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#aaa"
              />
            </View>

            {/* Departure */}
            <View style={styles.inputGroup}>
              <View style={styles.inputHeader}>
                <View
                  style={[
                    styles.inputIconContainer,
                    {backgroundColor: '#E3F2FD'},
                  ]}>
                  <Navigation size={18} color="#2196F3" />
                </View>
                <Text style={styles.inputLabel}>Lieu de départ</Text>
                {isLoadingAddresses && (
                  <ActivityIndicator size="small" color="#2196F3" style={{marginLeft: 8}} />
                )}
              </View>
              <TextInput
                style={styles.input}
                value={placeDeparture}
                onChangeText={setPlaceDeparture}
                placeholder={isLoadingAddresses ? "Recherche de l'adresse..." : "Ex: Domicile, Gare de Lyon..."}
                placeholderTextColor="#aaa"
                editable={!isLoadingAddresses}
              />
            </View>

            {/* Arrival */}
            <View style={[styles.inputGroup, {borderBottomWidth: 0}]}>
              <View style={styles.inputHeader}>
                <View
                  style={[
                    styles.inputIconContainer,
                    {backgroundColor: '#FFF3E0'},
                  ]}>
                  <Target size={18} color="#FF9800" />
                </View>
                <Text style={styles.inputLabel}>Lieu d'arrivée</Text>
                {isLoadingAddresses && (
                  <ActivityIndicator size="small" color="#FF9800" style={{marginLeft: 8}} />
                )}
              </View>
              <TextInput
                style={styles.input}
                value={placeArrival}
                onChangeText={setPlaceArrival}
                placeholder={isLoadingAddresses ? "Recherche de l'adresse..." : "Ex: Bureau, Centre commercial..."}
                placeholderTextColor="#aaa"
                editable={!isLoadingAddresses}
              />
            </View>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Fixed Submit Button */}
      <View style={styles.submitContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            isSending && styles.submitButtonDisabled,
          ]}
          onPress={handleValidateAndSend}
          disabled={isSending}
          activeOpacity={0.8}>
          {isSending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Send size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Valider et envoyer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Reward Modal */}
      <Modal visible={showReward} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.rewardCard}>
            <View style={styles.rewardIconContainer}>
              <Sparkles size={48} color="#FFD700" />
            </View>
            <Text style={styles.rewardTitle}>Félicitations !</Text>
            <View style={styles.rewardScoreContainer}>
              <Text style={styles.rewardScoreLabel}>Vous avez gagné</Text>
              <Text style={styles.rewardScore}>+{rewardScore}</Text>
              <Text style={styles.rewardScoreUnit}>points</Text>
            </View>
            <Text style={styles.rewardMessage}>
              Votre trajet a été validé et enregistré avec succès.
            </Text>
            <TouchableOpacity
              style={styles.rewardButton}
              onPress={handleCloseReward}
              activeOpacity={0.8}>
              <Text style={styles.rewardButtonText}>Continuer</Text>
              <ChevronLeft
                size={20}
                color="#fff"
                style={{transform: [{rotate: '180deg'}]}}
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerContent: {
    marginLeft: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  transportBadge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryInfo: {
    marginLeft: 14,
    flex: 1,
  },
  summaryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
    color: '#666',
  },
  statDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ddd',
    marginHorizontal: 10,
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  timelineDotEnd: {
    backgroundColor: '#FF9800',
  },
  timelineContent: {
    marginLeft: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timelineTime: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  timelineLabel: {
    fontSize: 13,
    color: '#666',
  },
  timelineLine: {
    width: 2,
    height: 24,
    backgroundColor: '#E0E0E0',
    marginLeft: 5,
    marginVertical: 4,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  transportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
  },
  transportOption: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  transportIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  transportLabel: {
    fontSize: 14,
    color: '#666',
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsCard: {
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputGroup: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  inputIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
  },
  bottomSpacer: {
    height: 20,
  },
  submitContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#9E9E9E',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  rewardCard: {
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  rewardIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  rewardTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  rewardScoreContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  rewardScoreLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  rewardScore: {
    fontSize: 56,
    fontWeight: '800',
    color: '#4CAF50',
    letterSpacing: -2,
  },
  rewardScoreUnit: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: -4,
  },
  rewardMessage: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  rewardButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rewardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
