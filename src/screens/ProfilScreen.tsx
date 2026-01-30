/**
 * Profil Screen
 * Displays user profile, company, team info and badges
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import {
  Building2,
  MapPin,
  Hash,
  LogOut,
  AlertCircle,
} from 'lucide-react-native';

import {useAuth} from '@/context/AuthContext';
import {apiClient} from '@/api/client';
import {UserProfile, Company, Team, UserBadge} from '@/api/types';
import {
  ProfileHeader,
  InfoCard,
  InfoRow,
  ActionButton,
  BadgeDisplay,
  TeamSection,
} from '@/components/ui';

export default function ProfilScreen(): JSX.Element {
  const {userId, logout} = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [badges, setBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchProfileData = useCallback(async () => {
    if (!userId) {
      setError('Utilisateur non connecte');
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch user profile
      const profile = await apiClient.getUserProfile(userId);
      setUserProfile(profile);

      // Fetch company, team and badges in parallel
      const [companyData, teamData, badgesData] = await Promise.all([
        profile.company_id
          ? apiClient.getCompany(profile.company_id).catch(() => null)
          : Promise.resolve(null),
        profile.team_id
          ? apiClient.getTeam(profile.team_id).catch(() => null)
          : Promise.resolve(null),
        apiClient.getUserBadges(userId).catch(() => []),
      ]);

      setCompany(companyData);
      setTeam(teamData);
      setBadges(badgesData);
    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Impossible de charger le profil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProfileData();
  }, [fetchProfileData]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <Text style={styles.loadingText}>Chargement du profil...</Text>
      </View>
    );
  }

  if (error && !userProfile) {
    return (
      <View style={styles.centered}>
        <AlertCircle size={48} color="#E53935" />
        <Text style={styles.errorText}>{error}</Text>
        <ActionButton
          title="Reessayer"
          onPress={fetchProfileData}
          variant="secondary"
          style={{marginTop: 16}}
        />
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
        <Text style={styles.headerTitle}>Mon Profil</Text>
      </View>

      {/* Profile Header */}
      {userProfile && (
        <View style={styles.headerCard}>
          <ProfileHeader
            firstname={userProfile.firstname}
            lastname={userProfile.lastname}
            username={userProfile.username}
            role={userProfile.role}
            email={userProfile.email}
            memberSince={userProfile.date_creation}
          />
        </View>
      )}

      {/* Badges Section */}
      <BadgeDisplay badges={badges} title="Mes Badges" />

      {/* Company Info */}
      {company && (
        <InfoCard
          title="Mon Entreprise"
          icon={<Building2 size={20} color="#2E7D32" />}>
          <InfoRow
            label="Nom"
            value={company.company_name}
            icon={<Building2 size={16} color="#999" />}
          />
          <InfoRow
            label="Code"
            value={company.company_code}
            icon={<Hash size={16} color="#999" />}
          />
          <InfoRow
            label="Localisation"
            value={company.company_locate}
            icon={<MapPin size={16} color="#999" />}
          />
        </InfoCard>
      )}

      {/* Team Section */}
      {userId && (
        <TeamSection
          team={team}
          userId={userId}
          onTeamChange={fetchProfileData}
        />
      )}

      {/* Logout Button */}
      <View style={styles.logoutContainer}>
        <ActionButton
          title="Se deconnecter"
          onPress={handleLogout}
          variant="danger"
          loading={loggingOut}
          icon={<LogOut size={20} color="#E53935" />}
        />
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  headerSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#E53935',
    textAlign: 'center',
  },
  headerCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  logoutContainer: {
    paddingHorizontal: 16,
    marginTop: 8,
  },
  bottomSpacer: {
    height: 32,
  },
});
