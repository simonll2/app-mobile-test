/**
 * Purchased Items Screen - History of user purchases
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {apiClient} from '../api/client';
import {PurchasedItem} from '../api/types';
import {Icon} from '../components/ui';
import {useAuth} from '../context/AuthContext';

export default function PurchasedItemsScreen(): JSX.Element {
  const {userId} = useAuth();
  const [purchases, setPurchases] = useState<PurchasedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        loadPurchases();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId]),
  );

  const loadPurchases = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const data = await apiClient.getPurchasedItems(userId);
      // Sort by date, most recent first
      const sorted = data.sort(
        (a, b) =>
          new Date(b.purchased_at).getTime() -
          new Date(a.purchased_at).getTime(),
      );
      setPurchases(sorted);
    } catch (error) {
      console.error('Failed to load purchases:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPurchases();
    setRefreshing(false);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getItemIcon = (type: string): string => {
    switch (type) {
      case 'MOBILITY':
        return 'bike';
      case 'WELLBEING':
        return 'leaf';
      case 'STATUS':
        return 'checkmark-circle';
      case 'DONATION':
        return 'gift';
      default:
        return 'gift';
    }
  };

  const renderItem = ({item}: {item: PurchasedItem}) => {
    return (
      <View style={styles.purchaseCard}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name={getItemIcon(item.item_type)} size={24} color="#fff" />
          </View>
          <View style={styles.info}>
            <Text style={styles.itemName}>{item.item_name}</Text>
            <Text style={styles.itemType}>{item.item_type}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Icon name="coins" size={16} color="#FFB300" />
            <Text style={styles.priceText}>{item.cost_coins}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateLabel}>Acheté le</Text>
            <Text style={styles.dateText}>{formatDate(item.purchased_at)}</Text>
          </View>
          <View style={styles.badge}>
            <Icon name="checkmark-circle" size={14} color="#2E7D32" />
            <Text style={styles.badgeText}>Acheté</Text>
          </View>
        </View>
      </View>
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
      <View style={styles.headerSection}>
        <Text style={styles.headerTitle}>Mes Achats</Text>
      </View>

      <FlatList
        data={purchases}
        renderItem={renderItem}
        keyExtractor={item => `purchase-${item.purchase_id}`}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="shopping-bag" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>Aucun achat</Text>
            <Text style={styles.emptyText}>
              Vous n'avez pas encore acheté d'items
            </Text>
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
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
  },
  list: {
    padding: 20,
    gap: 16,
  },
  purchaseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  itemType: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  dateContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  empty: {
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
