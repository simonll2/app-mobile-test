/**
 * Leaderboard Screen - Premium Modern Design with Podium
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  LinearGradient,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Trophy, Crown, Medal, Users, Building2, UserCircle} from 'lucide-react-native';
import {useAuth} from '../context/AuthContext';
import {apiClient} from '../api/client';
import {LeaderboardUser, LeaderboardTeam, Team} from '../api/types';

type LeaderboardTab = 'company' | 'teams' | 'my-team';
type LeaderboardEntry = LeaderboardUser | LeaderboardTeam;

export default function LeaderboardScreen(): JSX.Element {
  const navigation = useNavigation<any>();
  const {user, refreshUser} = useAuth();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('company');
  const [userLeaderboard, setUserLeaderboard] = useState<LeaderboardUser[]>([]);
  const [teamLeaderboard, setTeamLeaderboard] = useState<LeaderboardTeam[]>([]);
  const [myTeamLeaderboard, setMyTeamLeaderboard] = useState<LeaderboardUser[]>(
    [],
  );
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 50;

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await refreshUser();
        await loadUserTeam();
      };
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      resetAndLoad();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]),
  );

  const loadUserTeam = async () => {
    if (user?.team_id) {
      try {
        const team = await apiClient.getTeam(user.team_id);
        setUserTeam(team);
      } catch (error) {
        console.error('Failed to load user team:', error);
      }
    } else {
      setUserTeam(null);
      // If user is on my-team tab but has no team, switch to company
      if (activeTab === 'my-team') {
        setActiveTab('company');
      }
    }
  };

  const resetAndLoad = () => {
    setOffset(0);
    setHasMore(true);
    setUserLeaderboard([]);
    setTeamLeaderboard([]);
    setMyTeamLeaderboard([]);
    loadLeaderboard(0, true);
  };

  const loadLeaderboard = async (
    currentOffset: number = offset,
    isReset: boolean = false,
  ) => {
    if (!isReset && !hasMore) {
      return;
    }

    if (isReset) {
      setIsLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      if (activeTab === 'company') {
        const data = await apiClient.getGlobalLeaderboard(LIMIT, currentOffset);
        if (isReset) {
          setUserLeaderboard(data);
        } else {
          setUserLeaderboard(prev => [...prev, ...data]);
        }
        setHasMore(data.length === LIMIT);
      } else if (activeTab === 'teams') {
        const data = await apiClient.getTeamLeaderboard(LIMIT, currentOffset);
        if (isReset) {
          setTeamLeaderboard(data);
        } else {
          setTeamLeaderboard(prev => [...prev, ...data]);
        }
        setHasMore(data.length === LIMIT);
      } else if (activeTab === 'my-team') {
        const data = await apiClient.getTeamMembersLeaderboard(
          LIMIT,
          currentOffset,
        );
        if (isReset) {
          setMyTeamLeaderboard(data);
        } else {
          setMyTeamLeaderboard(prev => [...prev, ...data]);
        }
        setHasMore(data.length === LIMIT);
      }

      setOffset(currentOffset + LIMIT);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setOffset(0);
    setHasMore(true);
    await loadLeaderboard(0, true);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !isLoading) {
      loadLeaderboard(offset, false);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) {
      return null;
    }
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#2E7D32" />
      </View>
    );
  };

  const isUserEntry = (entry: LeaderboardEntry): entry is LeaderboardUser => {
    return 'user_id' in entry;
  };

  const isTeamEntry = (entry: LeaderboardEntry): entry is LeaderboardTeam => {
    return 'team_id' in entry && !('user_id' in entry);
  };

  const getCurrentData = () => {
    if (activeTab === 'company') {
      return userLeaderboard;
    } else if (activeTab === 'teams') {
      return teamLeaderboard;
    } else {
      return myTeamLeaderboard;
    }
  };

  const renderItem = ({item}: {item: LeaderboardEntry}) => {
    if (isUserEntry(item)) {
      const isMe = item.user_id === user?.id;

      const handleUserPress = () => {
        navigation.navigate('UserStats', {
          userId: item.user_id,
          username: item.username,
          firstname: item.firstname,
          lastname: item.lastname,
          rank: item.rank,
          score: item.score_total,
        });
      };

      return (
        <TouchableOpacity 
          style={[styles.item, isMe && styles.itemMe]}
          onPress={handleUserPress}
          activeOpacity={0.7}>
          <View style={styles.itemLeft}>
            <View style={[styles.rank, item.rank <= 3 && styles.rankTop]}>
              <Text
                style={[styles.rankText, item.rank <= 3 && styles.rankTopText]}>
                {item.rank}
              </Text>
            </View>
            <View style={[styles.avatar, isMe && styles.avatarMe]}>
              <Text style={styles.avatarText}>
                {item.firstname?.[0]}
                {item.lastname?.[0]}
              </Text>
            </View>
            <View style={styles.info}>
              <Text
                style={[styles.name, isMe && styles.nameMe]}
                numberOfLines={1}>
                {item.firstname} {item.lastname}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                @{item.username}
              </Text>
            </View>
          </View>
          <View style={styles.itemRight}>
            <Text style={[styles.points, isMe && styles.pointsMe]}>
              {item.score_total}
            </Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </TouchableOpacity>
      );
    } else if (isTeamEntry(item)) {
      const isMyTeam = item.team_id === user?.team_id;

      const handleTeamPress = () => {
        navigation.navigate('TeamMembers', {
          teamId: item.team_id,
          teamName: item.name,
          teamScore: item.score_total,
          teamRank: item.rank,
        });
      };

      return (
        <TouchableOpacity 
          style={[styles.item, isMyTeam && styles.itemMe]}
          onPress={handleTeamPress}
          activeOpacity={0.7}>
          <View style={styles.itemLeft}>
            <View style={[styles.rank, item.rank <= 3 && styles.rankTop]}>
              <Text
                style={[styles.rankText, item.rank <= 3 && styles.rankTopText]}>
                {item.rank}
              </Text>
            </View>
            <View
              style={[
                styles.avatar,
                styles.avatarTeam,
                isMyTeam && styles.avatarMe,
              ]}>
              <Text style={styles.avatarText}>
                {item.name.substring(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={styles.info}>
              <Text
                style={[styles.name, isMyTeam && styles.nameMe]}
                numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.subtitle}>Team</Text>
            </View>
          </View>
          <View style={styles.itemRight}>
            <Text style={[styles.points, isMyTeam && styles.pointsMe]}>
              {item.score_total}
            </Text>
            <Text style={styles.pointsLabel}>pts</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return null;
  };

  const currentData = getCurrentData();
  const hasTeam = Boolean(user?.team_id);

  // Separate top 3 from the rest
  const top3 = currentData.slice(0, 3);
  const restOfList = currentData.slice(3);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={14} color="#FFD700" />;
      case 2:
        return <Medal size={12} color="#C0C0C0" />;
      case 3:
        return <Medal size={12} color="#CD7F32" />;
      default:
        return null;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return '#FFD700';
      case 2:
        return '#C0C0C0';
      case 3:
        return '#CD7F32';
      default:
        return '#E0E0E0';
    }
  };

  const renderPodiumItem = (item: LeaderboardEntry, position: 'left' | 'center' | 'right') => {
    if (!item) return <View style={styles.podiumPlaceholder} />;
    
    const isUser = isUserEntry(item);
    const isMe = isUser && item.user_id === user?.id;
    const isMyTeam = !isUser && isTeamEntry(item) && item.team_id === user?.team_id;
    const highlighted = isMe || isMyTeam;

    const handlePress = () => {
      if (isUser) {
        navigation.navigate('UserStats', {
          userId: item.user_id,
          username: item.username,
          firstname: item.firstname,
          lastname: item.lastname,
          rank: item.rank,
          score: item.score_total,
        });
      } else if (isTeamEntry(item)) {
        navigation.navigate('TeamMembers', {
          teamId: item.team_id,
          teamName: item.name,
          teamScore: item.score_total,
          teamRank: item.rank,
        });
      }
    };

    const podiumHeight = position === 'center' ? 100 : position === 'left' ? 70 : 50;
    const avatarSize = position === 'center' ? 70 : 56;

    return (
      <TouchableOpacity
        style={[
          styles.podiumItem,
          position === 'center' && styles.podiumCenter,
        ]}
        onPress={handlePress}
        activeOpacity={0.8}>
        <View style={[
          styles.podiumAvatar,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            borderColor: getRankColor(item.rank),
            borderWidth: 3,
          },
          highlighted && styles.podiumAvatarHighlighted,
        ]}>
          <Text style={[
            styles.podiumAvatarText,
            {fontSize: position === 'center' ? 24 : 18},
          ]}>
            {isUser
              ? `${item.firstname?.[0]}${item.lastname?.[0]}`
              : item.name.substring(0, 2).toUpperCase()}
          </Text>
        </View>
        
        <View style={styles.podiumRankBadge}>
          {getRankIcon(item.rank)}
        </View>

        <Text style={[styles.podiumName, highlighted && styles.podiumNameHighlighted]} numberOfLines={1}>
          {isUser ? item.firstname : item.name}
        </Text>
        
        <Text style={styles.podiumScore}>{item.score_total}</Text>
        <Text style={styles.podiumScoreLabel}>pts</Text>

        <View style={[
          styles.podiumBar,
          {height: podiumHeight, backgroundColor: getRankColor(item.rank)},
        ]}>
          <Text style={styles.podiumRankText}>{item.rank}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Title */}
      <View style={styles.tabsContainer}>
        <Text style={styles.headerTitle}>Classement</Text>
        
        {/* Modern Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'company' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('company')}>
            <Building2 size={18} color={activeTab === 'company' ? '#fff' : '#666'} />
            <Text style={[
              styles.tabText,
              activeTab === 'company' && styles.tabTextActive,
            ]}>
              Entreprise
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'teams' && styles.tabActive,
            ]}
            onPress={() => setActiveTab('teams')}>
            <Users size={18} color={activeTab === 'teams' ? '#fff' : '#666'} />
            <Text style={[
              styles.tabText,
              activeTab === 'teams' && styles.tabTextActive,
            ]}>
              Teams
            </Text>
          </TouchableOpacity>

          {hasTeam && (
            <TouchableOpacity
              style={[styles.tab, activeTab === 'my-team' && styles.tabActive]}
              onPress={() => setActiveTab('my-team')}>
              <UserCircle size={18} color={activeTab === 'my-team' ? '#fff' : '#666'} />
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'my-team' && styles.tabTextActive,
                ]}
                numberOfLines={1}>
                Ma team
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Podium Section */}
      {top3.length > 0 && (
        <View style={styles.podiumSection}>
          <View style={styles.podiumContainer}>
            {renderPodiumItem(top3[1], 'left')}
            {renderPodiumItem(top3[0], 'center')}
            {renderPodiumItem(top3[2], 'right')}
          </View>
        </View>
      )}

      {/* Rest of the List */}
      <FlatList
        data={restOfList}
        renderItem={renderItem}
        keyExtractor={(item, _index) =>
          isUserEntry(item)
            ? `user-${item.user_id}`
            : `team-${(item as LeaderboardTeam).team_id}`
        }
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          top3.length === 0 ? (
            <View style={styles.empty}>
              <Trophy size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {activeTab === 'company' && 'Aucun utilisateur'}
                {activeTab === 'teams' && 'Aucune team'}
                {activeTab === 'my-team' &&
                  `Aucun membre dans ${userTeam?.name || 'votre team'}`}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  tabsContainer: {
    backgroundColor: '#f0f2f5',
    paddingTop: 55,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
    marginBottom: 16,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#2E7D32',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  // Podium Styles
  podiumSection: {
    backgroundColor: '#1a472a',
    paddingTop: 20,
    paddingBottom: 30,
    borderRadius: 24,
    marginHorizontal: 16,
  },
  podiumContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
  },
  podiumPlaceholder: {
    width: 100,
  },
  podiumItem: {
    alignItems: 'center',
    width: 100,
    marginHorizontal: 8,
  },
  podiumCenter: {
    marginBottom: 20,
  },
  podiumAvatar: {
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  podiumAvatarHighlighted: {
    backgroundColor: '#E8F5E9',
  },
  podiumAvatarText: {
    fontWeight: '700',
    color: '#1a472a',
  },
  podiumRankBadge: {
    position: 'absolute',
    top: 45,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  podiumName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
    maxWidth: 90,
  },
  podiumNameHighlighted: {
    color: '#90EE90',
  },
  podiumScore: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFD700',
    marginTop: 2,
  },
  podiumScoreLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
  },
  podiumBar: {
    width: 60,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRankText: {
    fontSize: 24,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.3)',
  },
  // List styles
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  itemMe: {
    backgroundColor: '#E8F5E9',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankTop: {
    backgroundColor: '#FFD700',
  },
  rankText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#666',
  },
  rankTopText: {
    color: '#fff',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarTeam: {
    backgroundColor: '#FFF3E0',
  },
  avatarMe: {
    backgroundColor: '#2E7D32',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
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
  nameMe: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
  },
  itemRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  points: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  pointsMe: {
    color: '#2E7D32',
  },
  pointsLabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  empty: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#888',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
