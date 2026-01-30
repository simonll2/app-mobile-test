/**
 * API Types for Green Mobility Pass
 */

// Transport types accepted by the backend
export type TransportType = 'marche' | 'velo' | 'transport_commun' | 'voiture';

// Detection source
export type DetectionSource = 'auto' | 'manual';

// Journey creation request
export interface JourneyCreate {
  place_departure: string;
  place_arrival: string;
  time_departure: string; // ISO datetime
  time_arrival: string; // ISO datetime
  distance_km: number;
  transport_type: TransportType;
  detection_source: DetectionSource;
}

// Journey response from backend
export interface JourneyRead {
  id: number;
  user_id: number;
  place_departure: string;
  place_arrival: string;
  time_departure: string;
  time_arrival: string;
  duration_minutes: number;
  distance_km: number;
  transport_type: TransportType;
  detection_source: DetectionSource;
  score_journey: number;
  carbon_footprint: number;
  created_at: string;
}

// Token response
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: number;
}

// User registration request
export interface UserRegister {
  username: string;
  email: string;
  password: string;
}

// User info (basic from /me)
export interface UserInfo {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  team_id?: number;
}

// User profile (full from /users/:id)
export interface UserProfile {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'admin' | 'user' | 'manager';
  date_creation: string;
  company_id: number;
  team_id: number;
}

// Company info
export interface Company {
  id: number;
  company_code: string;
  company_name: string;
  company_locate: string;
}

// Team info
export interface Team {
  id: number;
  name: string;
  score_total: number;
  created_by_user_id: number;
  is_public: boolean;
  join_code?: string | null;
}

// Team list item (from GET /teams)
export interface TeamListItem {
  id: number;
  name: string;
  score_total: number;
  created_by_user_id: number;
  is_public: boolean;
  users: unknown[];
}

// Create team request
export interface TeamCreate {
  name: string;
  is_public: boolean;
}

// Create team response
export interface TeamCreateResponse {
  id: number;
  name: string;
  is_public: boolean;
  join_code: string | null;
}

// Join team request
export interface TeamJoinRequest {
  code: string;
}

// User badge (from API)
export interface UserBadge {
  id: number;
  code: string;
  name: string;
  icon_url: string;
  description: string;
  unlocked_at: string;
}

// User statistics (old)
export interface UserStatistics {
  total_journeys: number;
  total_distance_km: number;
  total_score: number;
  journeys_by_transport: {
    [key in TransportType]?: number;
  };
}

// User stats (from /users/{userId}/stats)
export interface UserStats {
  user_id: number;
  score_total: number;
  carbon_footprint_total: number;
  validated_journey_count: number;
  total_distance_km: number;
  bike_journey_count: number;
  bike_distance_km: number;
  walk_journey_count: number;
  walk_distance_km: number;
  car_journey_count: number;
  car_distance_km: number;
  updated_at: string;
}

// Journey status
export type JourneyStatus = 'validated' | 'pending' | 'rejected';

// Validated journey (from /journey/{userId}/validated)
export interface ValidatedJourney {
  id: number;
  id_user: number;
  status: JourneyStatus;
  detection_source: DetectionSource;
  place_departure: string;
  place_arrival: string;
  time_departure: string;
  time_arrival: string;
  distance_km: number;
  duration_minutes: number;
  transport_type: TransportType;
  score_journey: number;
  carbon_footprint: number;
  created_at: string;
  validated_at: string | null;
  rejected_at: string | null;
}

// Local journey from native module
export interface LocalJourney {
  id: number;
  timeDeparture: number; // epoch ms
  timeArrival: number; // epoch ms
  durationMinutes: number;
  distanceKm: number;
  detectedTransportType: string;
  confidenceAvg: number;
  placeDeparture: string;
  placeArrival: string;
  // GPS coordinates (from native module)
  startLatitude?: number;
  startLongitude?: number;
  endLatitude?: number;
  endLongitude?: number;
  isGpsBasedDistance?: boolean;
  gpsPointsCount?: number;
  status: 'PENDING' | 'SENT';
  createdAt: number;
  updatedAt: number;
}

// Permission status
export interface PermissionStatus {
  location: boolean;
  activityRecognition: boolean;
  notifications: boolean;
  allGranted: boolean;
}

// Leaderboard
export interface LeaderboardUser {
  rank: number;
  user_id: number;
  username: string;
  firstname: string;
  lastname: string;
  team_id: number;
  score_total: number;
  updated_at: string;
}

export interface LeaderboardTeam {
  rank: number;
  team_id: number;
  name: string;
  score_total: number;
}

// Shop
export interface ShopItem {
  id: number;
  code: string;
  name: string;
  description: string;
  type: string;
  cost_coins: number;
  company_id: number | null;
  is_unlocked: boolean;
  can_purchase: boolean;
  stock: number | null;
}

export interface PurchasedItem {
  purchase_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  item_type: string;
  cost_coins: number;
  purchased_at: string;
}

// Wallet
export interface Wallet {
  user_id: number;
  balance: number;
  updated_at: string;
}
