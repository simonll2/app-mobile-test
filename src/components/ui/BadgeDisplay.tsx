/**
 * BadgeDisplay Component
 * Displays user badges/achievements from API
 */

import React from 'react';
import {View, Text, StyleSheet, ScrollView, Image, TouchableOpacity} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Award} from 'lucide-react-native';
import {UserBadge} from '@/api/types';

interface BadgeDisplayProps {
  badges: UserBadge[];
  title?: string;
}

interface BadgeItemProps {
  badge: UserBadge;
  onPress: () => void;
}

function BadgeItem({badge, onPress}: BadgeItemProps): JSX.Element {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <TouchableOpacity style={styles.badgeItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.badgeIcon}>
        {badge.icon_url ? (
          <Image
            source={{uri: badge.icon_url}}
            style={styles.badgeImage}
            resizeMode="contain"
          />
        ) : (
          <Award size={28} color="#FFB300" />
        )}
      </View>
      <Text style={styles.badgeName} numberOfLines={2}>
        {badge.name}
      </Text>
      <Text style={styles.badgeDate}>{formatDate(badge.unlocked_at)}</Text>
    </TouchableOpacity>
  );
}

function EmptyBadges(): JSX.Element {
  return (
    <View style={styles.emptyContainer}>
      <Award size={32} color="#ccc" />
      <Text style={styles.emptyText}>Aucun badge pour l'instant</Text>
      <Text style={styles.emptySubtext}>
        Continuez vos trajets pour debloquer des badges !
      </Text>
    </View>
  );
}

export default function BadgeDisplay({
  badges,
  title = 'Mes Badges',
}: BadgeDisplayProps): JSX.Element {
  const navigation = useNavigation<any>();

  const handleBadgePress = (badge: UserBadge) => {
    navigation.navigate('BadgeDetail', {badge});
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{badges.length}</Text>
        </View>
      </View>

      {badges.length === 0 ? (
        <EmptyBadges />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.badgeList}>
          {badges.map(badge => (
            <BadgeItem 
              key={badge.id} 
              badge={badge} 
              onPress={() => handleBadgePress(badge)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  countBadge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  badgeList: {
    paddingHorizontal: 12,
    gap: 12,
  },
  badgeItem: {
    width: 100,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  badgeImage: {
    width: 40,
    height: 40,
  },
  badgeName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
    minHeight: 32,
  },
  badgeDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
  },
});
