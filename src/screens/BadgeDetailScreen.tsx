/**
 * Badge Detail Screen
 * Displays a badge with its logo in large and description
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {Award, Calendar, ArrowLeft} from 'lucide-react-native';
import {UserBadge} from '../api/types';
import {RootStackParamList} from '../navigation/AppNavigator';

type BadgeDetailRouteProp = RouteProp<RootStackParamList, 'BadgeDetail'>;

export default function BadgeDetailScreen(): JSX.Element {
  const navigation = useNavigation();
  const route = useRoute<BadgeDetailRouteProp>();
  const {badge} = route.params;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Badge Icon Large */}
      <View style={styles.iconContainer}>
        {badge.icon_url ? (
          <Image
            source={{uri: badge.icon_url}}
            style={styles.badgeImage}
            resizeMode="contain"
          />
        ) : (
          <Award size={100} color="#FFB300" />
        )}
      </View>

      {/* Badge Name */}
      <Text style={styles.badgeName}>{badge.name}</Text>

      {/* Badge Code */}
      <View style={styles.codeBadge}>
        <Text style={styles.codeText}>{badge.code}</Text>
      </View>

      {/* Description Card */}
      <View style={styles.descriptionCard}>
        <Text style={styles.descriptionTitle}>Comment l'obtenir ?</Text>
        <Text style={styles.descriptionText}>
          {badge.description || 'Aucune description disponible pour ce badge.'}
        </Text>
      </View>

      {/* Unlock Date */}
      <View style={styles.dateCard}>
        <View style={styles.dateIcon}>
          <Calendar size={20} color="#2E7D32" />
        </View>
        <View>
          <Text style={styles.dateLabel}>Débloqué le</Text>
          <Text style={styles.dateValue}>{formatDate(badge.unlocked_at)}</Text>
        </View>
      </View>

      {/* Congratulations */}
      <View style={styles.congratsCard}>
        <Text style={styles.congratsEmoji}>🎉</Text>
        <Text style={styles.congratsText}>
          Félicitations ! Vous avez obtenu ce badge grâce à vos efforts pour une mobilité plus verte.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
    shadowColor: '#FFB300',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  badgeImage: {
    width: 120,
    height: 120,
  },
  badgeName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  codeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 24,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    textTransform: 'uppercase',
  },
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  dateCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  dateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  dateLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  congratsCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  congratsEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  congratsText: {
    fontSize: 14,
    color: '#5D4E37',
    textAlign: 'center',
    lineHeight: 22,
  },
});
