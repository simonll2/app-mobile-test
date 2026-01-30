/**
 * User Stats Screen
 * Displays detailed stats for a user from the leaderboard
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useRoute, RouteProp} from '@react-navigation/native';
import {
  MapPin,
  Leaf,
  TrendingUp,
} from 'lucide-react-native';
import {apiClient} from '../api/client';
import {UserStats} from '../api/types';
import {RootStackParamList} from '../navigation/AppNavigator';

type UserStatsRouteProp = RouteProp<RootStackParamList, 'UserStats'>;

export default function UserStatsScreen(): JSX.Element {
  const route = useRoute<UserStatsRouteProp>();
  const {userId, username, firstname, lastname, rank, score} = route.params;

  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const statsData = await apiClient.getUserStats(userId).catch(() => null);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = () => {
    return `${firstname?.[0] || ''}${lastname?.[0] || ''}`.toUpperCase();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header Title */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Statistiques</Text>
      </View>

      {/* User Header */}
      <View style={styles.header}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.name}>
          {firstname} {lastname}
        </Text>
        <Text style={styles.username}>@{username}</Text>
        
        {/* Rank Badge */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>#{rank}</Text>
          <Text style={styles.rankLabel}>au classement</Text>
        </View>
      </View>

      {/* Score Card */}
      <View style={styles.scoreCard}>
        <TrendingUp size={28} color="#2E7D32" />
        <View style={styles.scoreInfo}>
          <Text style={styles.scoreValue}>{score}</Text>
          <Text style={styles.scoreLabel}>points total</Text>
        </View>
      </View>

      {/* Stats Grid */}
      {stats && (
        <View style={styles.statsContainer}>
          {/* Ligne 1: Trajets + km */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <MapPin size={24} color="#1976D2" />
              <Text style={styles.statValue}>{stats.validated_journey_count || 0}</Text>
              <Text style={styles.statLabel}>Trajets</Text>
            </View>

            <View style={styles.statCard}>
              <TrendingUp size={24} color="#2E7D32" />
              <Text style={styles.statValue}>
                {(stats.total_distance_km || 0).toFixed(1)}
              </Text>
              <Text style={styles.statLabel}>km parcourus</Text>
            </View>
          </View>

          {/* Ligne 2: CO2 (pleine largeur) */}
          <View style={styles.co2Card}>
            <Leaf size={32} color="#4CAF50" />
            <Text style={styles.co2Value}>
              {(stats.carbon_footprint_total || 0).toFixed(1)}
            </Text>
            <Text style={styles.co2Label}>kg CO₂ économisés</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  headerSection: {
    paddingTop: 55,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  rankText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  rankLabel: {
    fontSize: 14,
    color: '#2E7D32',
  },
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  scoreInfo: {
    flex: 1,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    width: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  co2Card: {
    backgroundColor: '#E8F5E9',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  co2Value: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 8,
  },
  co2Label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 4,
  },
});
