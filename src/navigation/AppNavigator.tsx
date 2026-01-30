import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useAuth} from '../context/AuthContext';
import {
  AuthScreen,
  DashboardScreen,
  LeaderboardScreen,
  TripsScreen,
  ShopScreen,
  ProfilScreen,
  PendingJourneysScreen,
  PendingJourneyDetailScreen,
  ValidatedJourneysScreen,
  ValidatedJourneyDetailScreen,
  CO2HistoryScreen,
  DistanceHistoryScreen,
  PurchasedItemsScreen,
  BadgeDetailScreen,
  UserStatsScreen,
  TeamMembersScreen,
} from '../screens';
import {ActivityIndicator, View, StyleSheet} from 'react-native';
import {
  LayoutDashboard,
  Trophy,
  MapPin,
  ShoppingBag,
  User,
} from 'lucide-react-native';

// Define navigation types
export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  PendingJourneys: undefined;
  PendingJourneyDetail: {journeyId: number};
  ValidatedJourneys: {transportFilter?: string} | undefined;
  ValidatedJourneyDetail: {journey: any};
  CO2History: undefined;
  DistanceHistory: undefined;
  PurchasedItems: undefined;
  BadgeDetail: {badge: any};
  UserStats: {
    userId: number;
    username: string;
    firstname: string;
    lastname: string;
    rank: number;
    score: number;
  };
  TeamMembers: {
    teamId: number;
    teamName: string;
    teamScore: number;
    teamRank: number;
  };
};

export type TabParamList = {
  Dashboard: undefined;
  Leaderboard: undefined;
  Trips: undefined;
  Shop: undefined;
  Profil: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Screen options for sub-screens
const screenOptions = {
  headerStyle: {
    backgroundColor: '#fff',
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTintColor: '#1a1a1a',
  headerTitleStyle: {
    fontWeight: '600' as const,
    fontSize: 17,
  },
  headerBackTitleVisible: false,
};

// Tab Bar Icon Components
const DashboardIcon = ({color, size}: {color: string; size: number}) => (
  <LayoutDashboard color={color} size={size} />
);

const LeaderboardIcon = ({color, size}: {color: string; size: number}) => (
  <Trophy color={color} size={size} />
);

const TripsIcon = ({color, size}: {color: string; size: number}) => (
  <MapPin color={color} size={size} />
);

const ShopIcon = ({color, size}: {color: string; size: number}) => (
  <ShoppingBag color={color} size={size} />
);

const ProfilIcon = ({color, size}: {color: string; size: number}) => (
  <User color={color} size={size} />
);

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="Auth" component={AuthScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: -4},
          shadowOpacity: 0.08,
          shadowRadius: 12,
          height: 85,
          paddingTop: 10,
          paddingBottom: 25,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 4,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Accueil',
          tabBarIcon: DashboardIcon,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Classement',
          tabBarIcon: LeaderboardIcon,
        }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{
          title: 'Trajets',
          tabBarIcon: TripsIcon,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          title: 'Boutique',
          tabBarIcon: ShopIcon,
        }}
      />
      <Tab.Screen
        name="Profil"
        component={ProfilScreen}
        options={{
          title: 'Profil',
          tabBarIcon: ProfilIcon,
        }}
      />
    </Tab.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MainTabs"
        component={TabNavigator}
        options={{headerShown: false}}
      />
      <Stack.Screen
        name="PendingJourneys"
        component={PendingJourneysScreen}
        options={{title: 'Trajets en attente'}}
      />
      <Stack.Screen
        name="PendingJourneyDetail"
        component={PendingJourneyDetailScreen}
        options={{title: 'Details du trajet'}}
      />
      <Stack.Screen
        name="ValidatedJourneys"
        component={ValidatedJourneysScreen}
        options={{title: 'Trajets validés'}}
      />
      <Stack.Screen
        name="ValidatedJourneyDetail"
        component={ValidatedJourneyDetailScreen}
        options={{title: 'Détails du trajet'}}
      />
      <Stack.Screen
        name="PurchasedItems"
        component={PurchasedItemsScreen}
        options={{title: 'Mes achats'}}
      />
      <Stack.Screen
        name="CO2History"
        component={CO2HistoryScreen}
        options={{title: 'Émissions CO₂'}}
      />
      <Stack.Screen
        name="DistanceHistory"
        component={DistanceHistoryScreen}
        options={{title: 'Distance parcourue'}}
      />
      <Stack.Screen
        name="BadgeDetail"
        component={BadgeDetailScreen}
        options={{title: 'Détails du badge'}}
      />
      <Stack.Screen
        name="UserStats"
        component={UserStatsScreen}
        options={{title: 'Statistiques'}}
      />
      <Stack.Screen
        name="TeamMembers"
        component={TeamMembersScreen}
        options={{title: 'Équipe'}}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator(): JSX.Element {
  const {isAuthenticated, isLoading} = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
