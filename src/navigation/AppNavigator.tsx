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
  ValidatedJourneys: undefined;
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

// Screen options
const screenOptions = {
  headerStyle: {
    backgroundColor: '#2E7D32',
  },
  headerTintColor: '#fff',
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
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
        headerStyle: {
          backgroundColor: '#2E7D32',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600' as const,
        },
        tabBarActiveTintColor: '#2E7D32',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
        },
      }}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: DashboardIcon,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          title: 'Leaderboard',
          tabBarIcon: LeaderboardIcon,
        }}
      />
      <Tab.Screen
        name="Trips"
        component={TripsScreen}
        options={{
          title: 'Trips',
          tabBarIcon: TripsIcon,
        }}
      />
      <Tab.Screen
        name="Shop"
        component={ShopScreen}
        options={{
          title: 'Shop',
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
        options={{title: 'Trajets valides'}}
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
