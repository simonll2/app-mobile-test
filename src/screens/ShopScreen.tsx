/**
 * Shop Screen
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {apiClient} from '../api/client';
import {ShopItem, Wallet} from '../api/types';
import {Icon} from '../components/ui';
import {RootStackParamList} from '../navigation/AppNavigator';

type ItemCategory = 'ALL' | 'MOBILITY' | 'WELLBEING' | 'STATUS' | 'DONATION';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function ShopScreen(): JSX.Element {
  const {user} = useAuth();
  const navigation = useNavigation<NavigationProp>();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('ALL');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadShopData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const loadShopData = async () => {
    setIsLoading(true);
    try {
      const [itemsData, walletData] = await Promise.all([
        apiClient.getShopItems(),
        user?.id ? apiClient.getWallet(user.id) : Promise.resolve(null),
      ]);
      setItems(itemsData);
      setWallet(walletData);
    } catch (error) {
      console.error('Failed to load shop data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données du shop');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadShopData();
    setRefreshing(false);
  };

  const handlePurchasePress = (item: ShopItem) => {
    setSelectedItem(item);
    setConfirmModalVisible(true);
  };

  const confirmPurchase = async () => {
    if (!selectedItem || !wallet) {
      return;
    }

    setPurchasing(true);
    try {
      await apiClient.purchaseItem(selectedItem.id);
      Alert.alert('Succès', `${selectedItem.name} acheté avec succès!`);
      setConfirmModalVisible(false);
      setSelectedItem(null);
      // Reload data to update coins and item availability
      await loadShopData();
    } catch (error) {
      console.error('Purchase failed:', error);
      Alert.alert('Erreur', "Impossible d'acheter cet item");
    } finally {
      setPurchasing(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (selectedCategory === 'ALL') {
      return true;
    }
    return item.type === selectedCategory;
  });

  const canAfford = (item: ShopItem): boolean => {
    if (!wallet) {
      return false;
    }
    return wallet.balance >= item.cost_coins;
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

  const renderCategory = (category: ItemCategory, label: string) => {
    const isActive = selectedCategory === category;
    return (
      <TouchableOpacity
        style={[styles.categoryButton, isActive && styles.categoryButtonActive]}
        onPress={() => setSelectedCategory(category)}>
        <Text
          style={[styles.categoryText, isActive && styles.categoryTextActive]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({item}: {item: ShopItem}) => {
    const affordable = canAfford(item);
    const canBuy = item.can_purchase && affordable && item.is_unlocked;
    const outOfStock = item.stock !== null && item.stock <= 0;

    return (
      <TouchableOpacity
        style={[styles.itemCard, !canBuy && styles.itemCardDisabled]}
        onPress={() => canBuy && !outOfStock && handlePurchasePress(item)}
        disabled={!canBuy || outOfStock}
        activeOpacity={0.7}>
        <View style={styles.cardTop}>
          <View style={[styles.iconBadge, !canBuy && styles.iconBadgeDisabled]}>
            <Icon name={getItemIcon(item.type)} size={32} color="#fff" />
          </View>

          {item.stock !== null && item.stock > 0 && item.stock <= 10 && (
            <View style={styles.stockBadge}>
              <Text style={styles.stockBadgeText}>{item.stock} restants</Text>
            </View>
          )}

          {outOfStock && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockLabel}>Épuisé</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.itemDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardBottom}>
            <View style={styles.priceTag}>
              <Icon name="coins" size={20} color="#FFB300" />
              <Text style={styles.priceAmount}>{Math.round(item.cost_coins)}</Text>
            </View>

            {outOfStock ? (
              <View style={styles.statusPill}>
                <Text style={styles.statusTextError}>Rupture</Text>
              </View>
            ) : !item.is_unlocked ? (
              <View style={styles.statusPill}>
                <Icon name="lock" size={12} color="#999" />
              </View>
            ) : !affordable ? (
              <View style={styles.statusPillWarning}>
                <Text style={styles.statusTextWarning}>
                  -{Math.round(item.cost_coins - (wallet?.balance || 0))}
                </Text>
              </View>
            ) : canBuy ? (
              <View style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Acheter</Text>
              </View>
            ) : (
              <View style={styles.statusPill}>
                <Text style={styles.statusTextDisabled}>N/A</Text>
              </View>
            )}
          </View>
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
      {/* Header with Points */}
      <View style={styles.header}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.headerTitle}>Boutique</Text>
            <View style={styles.balanceContainer}>
              <Icon name="coins" size={18} color="#FFB300" />
              <Text style={styles.balanceText}>
                {Math.round(wallet?.balance || 0)} coins
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.historyIcon}
            onPress={() => navigation.navigate('PurchasedItems')}>
            <Icon name="shopping-bag" size={24} color="#2E7D32" />
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categories}>
          {renderCategory('ALL', 'Tout')}
          {renderCategory('MOBILITY', 'Mobilité')}
          {renderCategory('WELLBEING', 'Bien-être')}
          {renderCategory('STATUS', 'Statut')}
          {renderCategory('DONATION', 'Don')}
        </ScrollView>
      </View>

      {/* Items Grid */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => `item-${item.id}`}
        numColumns={2}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="shopping-bag" size={64} color="#ccc" />
            <Text style={styles.emptyText}>Aucun item disponible</Text>
          </View>
        }
      />

      {/* Confirmation Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconContainer}>
                <Icon
                  name={selectedItem ? getItemIcon(selectedItem.type) : 'gift'}
                  size={40}
                  color="#fff"
                />
              </View>
            </View>

            <Text style={styles.modalTitle}>Confirmer l'achat</Text>
            <Text style={styles.modalItemName}>{selectedItem?.name}</Text>
            <Text style={styles.modalDescription}>
              {selectedItem?.description}
            </Text>

            <View style={styles.modalPriceRow}>
              <Text style={styles.modalPriceLabel}>Prix :</Text>
              <View style={styles.modalPriceValue}>
                <Icon name="coins" size={20} color="#FFB300" />
                <Text style={styles.modalPriceText}>
                  {Math.round(selectedItem?.cost_coins || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.modalPriceRow}>
              <Text style={styles.modalPriceLabel}>Solde actuel :</Text>
              <Text style={styles.modalBalanceText}>
                {Math.round(wallet?.balance || 0)} coins
              </Text>
            </View>

            <View style={styles.modalPriceRow}>
              <Text style={styles.modalPriceLabel}>Après achat :</Text>
              <Text style={styles.modalRemainingText}>
                {Math.round((wallet?.balance || 0) -
                  (selectedItem?.cost_coins || 0))}{' '}
                coins
              </Text>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setConfirmModalVisible(false)}
                disabled={purchasing}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton]}
                onPress={confirmPurchase}
                disabled={purchasing}>
                {purchasing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Acheter</Text>
                )}
              </TouchableOpacity>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: '#f8f9fa',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a472a',
    marginBottom: 4,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balanceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E7D32',
  },
  historyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesScroll: {
    flexGrow: 0,
    paddingVertical: 12,
  },
  categories: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  categoryButtonActive: {
    backgroundColor: '#2E7D32',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
  },
  grid: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  itemCard: {
    flex: 1,
    maxWidth: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  itemCardDisabled: {
    opacity: 0.6,
  },
  cardTop: {
    height: 120,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  iconBadgeDisabled: {
    backgroundColor: '#bbb',
    shadowColor: '#999',
  },
  stockBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(245, 124, 0, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cardContent: {
    padding: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  itemDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
    minHeight: 36,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  buyButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  buyButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    gap: 4,
  },
  statusPillWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    gap: 4,
  },
  statusTextWarning: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
  },
  statusTextError: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C62828',
  },
  statusTextDisabled: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
  },
  empty: {
    flex: 1,
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2E7D32',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalItemName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalPriceLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  modalPriceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalPriceText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  modalBalanceText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  modalRemainingText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#f0f0f0',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666',
  },
  modalConfirmButton: {
    backgroundColor: '#2E7D32',
    shadowColor: '#2E7D32',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
