/**
 * Team Members Screen
 * Displays all members of a team with their stats
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useNavigation, useRoute, RouteProp} from '@react-navigation/native';
import {Users, TrendingUp, Award} from 'lucide-react-native';
import {apiClient} from '../api/client';
import {RootStackParamList} from '../navigation/AppNavigator';

type TeamMembersRouteProp = RouteProp<RootStackParamList, 'TeamMembers'>;

interface TeamMember {
  rank: number;
  user_id: number;
  username: string;
  firstname: string;
  lastname: string;
  score_total: number;
}

export default function TeamMembersScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const route = useRoute<TeamMembersRouteProp>();
  const {teamId, teamName, teamScore, teamRank} = route.params;

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Reset members when teamId changes to avoid showing stale data
    setMembers([]);
    setIsLoading(true);
    loadMembers();
  }, [teamId]);

  const loadMembers = async () => {
    try {
      // Utiliser l'endpoint pour récupérer les membres de la team
      console.log('[TeamMembersScreen] Loading members for team:', teamId);
      const data = await apiClient.getTeamMembers(teamId);
      console.log('[TeamMembersScreen] Received members:', JSON.stringify(data));
      // Trier par score décroissant et ajouter le rang
      const sorted = data
        .sort((a: any, b: any) => (b.score_total || 0) - (a.score_total || 0))
        .map((member: any, index: number) => ({
          ...member,
          rank: index + 1,
        }));
      setMembers(sorted);
    } catch (error) {
      console.error('Failed to load team members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  };

  const handleMemberPress = (member: TeamMember) => {
    navigation.navigate('UserStats', {
      userId: member.user_id,
      username: member.username,
      firstname: member.firstname,
      lastname: member.lastname,
      rank: member.rank,
      score: member.score_total,
    });
  };

  const renderMember = ({item}: {item: TeamMember}) => {
    const getInitials = () => {
      return `${item.firstname?.[0] || ''}${item.lastname?.[0] || ''}`.toUpperCase();
    };

    return (
      <TouchableOpacity
        style={styles.memberCard}
        onPress={() => handleMemberPress(item)}
        activeOpacity={0.7}>
        <View style={styles.memberLeft}>
          <View style={[styles.rank, item.rank <= 3 && styles.rankTop]}>
            <Text style={[styles.rankText, item.rank <= 3 && styles.rankTopText]}>
              {item.rank}
            </Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {item.firstname} {item.lastname}
            </Text>
            <Text style={styles.username}>@{item.username}</Text>
          </View>
        </View>
        <View style={styles.memberRight}>
          <Text style={styles.score}>{item.score_total || 0}</Text>
          <Text style={styles.scoreLabel}>pts</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Title */}
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>{teamName}</Text>
      </View>

      {/* Team Stats */}
      <View style={styles.header}>
        <View style={styles.teamIconContainer}>
          <Users size={40} color="#fff" />
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statBadge}>
            <TrendingUp size={16} color="#2E7D32" />
            <Text style={styles.statValue}>{teamScore} pts</Text>
          </View>
          <View style={styles.statBadge}>
            <Award size={16} color="#FFB300" />
            <Text style={styles.statValue}>#{teamRank}</Text>
          </View>
          <View style={styles.statBadge}>
            <Users size={16} color="#1976D2" />
            <Text style={styles.statValue}>{members.length} membres</Text>
          </View>
        </View>
      </View>

      {/* Members List */}
      <Text style={styles.sectionTitle}>Membres de l'équipe</Text>
      
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={item => `member-${item.user_id}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Users size={48} color="#ccc" />
            <Text style={styles.emptyText}>Aucun membre dans cette équipe</Text>
          </View>
        }
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
  headerSection: {
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#f8f9fa',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
  },
  header: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 20,
    alignItems: 'center',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  teamIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a472a',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  memberLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  rankTop: {
    backgroundColor: '#FFB300',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
  },
  rankTopText: {
    color: '#fff',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  username: {
    fontSize: 13,
    color: '#666',
  },
  memberRight: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  scoreLabel: {
    fontSize: 11,
    color: '#666',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#666',
    marginTop: 12,
  },
});
