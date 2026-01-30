/**
 * API Client for Green Mobility Pass
 * Handles authentication and API calls to the FastAPI backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  TokenResponse,
  UserInfo,
  UserProfile,
  Company,
  Team,
  TeamListItem,
  TeamCreate,
  TeamCreateResponse,
  UserBadge,
  UserStats,
  ValidatedJourney,
  UserRegister,
  UserStatistics,
  JourneyCreate,
  JourneyRead,
  LeaderboardUser,
  LeaderboardTeam,
  ShopItem,
  PurchasedItem,
  Wallet,
} from './types';
import {
  API_BASE_URL as ENV_API_BASE_URL,
  ACCESS_TOKEN_KEY as ENV_ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY as ENV_REFRESH_TOKEN_KEY,
} from '@env';

// Storage keys - now loaded from .env
const ACCESS_TOKEN_KEY = ENV_ACCESS_TOKEN_KEY || '@GMP_access_token';
const REFRESH_TOKEN_KEY = ENV_REFRESH_TOKEN_KEY || '@GMP_refresh_token';
const USER_ID_KEY = '@GMP_user_id';

// API base URL - now loaded from .env
const API_BASE_URL = ENV_API_BASE_URL || 'https://capitulatory-insinuatingly-dayna.ngrok-free.dev';

class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private userId: number | null = null;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.loadTokens();
  }

  /**
   * Set the API base URL
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Load tokens from storage
   */
  async loadTokens(): Promise<void> {
    try {
      const [accessToken, refreshToken, userId] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(REFRESH_TOKEN_KEY),
        AsyncStorage.getItem(USER_ID_KEY),
      ]);
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
      this.userId = userId ? parseInt(userId, 10) : null;
    } catch (error) {
      console.error('Failed to load tokens:', error);
    }
  }

  /**
   * Save tokens to storage
   */
  private async saveTokens(tokens: TokenResponse): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token),
        AsyncStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token),
        AsyncStorage.setItem(USER_ID_KEY, tokens.user_id.toString()),
      ]);
      this.accessToken = tokens.access_token;
      this.refreshToken = tokens.refresh_token;
      this.userId = tokens.user_id;
    } catch (error) {
      console.error('Failed to save tokens:', error);
    }
  }

  /**
   * Clear tokens from storage
   */
  async clearTokens(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
        AsyncStorage.removeItem(REFRESH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_ID_KEY),
      ]);
      this.accessToken = null;
      this.refreshToken = null;
      this.userId = null;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }

  /**
   * Get the current user ID
   */
  getUserId(): number | null {
    return this.userId;
  }

  /**
   * Make an authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit_ = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (this.accessToken) {
      (
        headers as Record<string, string>
      ).Authorization = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 - try to refresh token
    if (response.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.doRefreshToken();
      if (refreshed) {
        return this.request<T>(endpoint, options, false);
      }
      throw new Error('Session expired. Please login again.');
    }

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error ${response.status}: ${errorBody}`);
    }

    return response.json();
  }

  /**
   * Refresh the access token
   */
  private async doRefreshToken(): Promise<boolean> {
    // Avoid multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(`${this.baseUrl}/token/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refresh_token: this.refreshToken,
          }),
        });

        if (!response.ok) {
          await this.clearTokens();
          return false;
        }

        const tokens: TokenResponse = await response.json();
        await this.saveTokens(tokens);
        return true;
      } catch (error) {
        console.error('Token refresh failed:', error);
        await this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Register a new user
   */
  async register(userData: UserRegister): Promise<TokenResponse> {
    // 1) create user
    const createResp = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(userData),
    });

    if (!createResp.ok) {
      const errorBody = await createResp.text();
      throw new Error(`Registration failed: ${errorBody}`);
    }

    // 2) login to get tokens
    return this.login(userData.username, userData.password);
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Login failed: ${errorBody}`);
    }

    const tokens: TokenResponse = await response.json();
    await this.saveTokens(tokens);
    return tokens;
  }

  /**
   * Logout - clear tokens
   */
  async logout(): Promise<void> {
    await this.clearTokens();
  }

  /**
   * Get current user info
   */
  async getMe(): Promise<UserInfo> {
    return this.request<UserInfo>('/me');
  }

  // ==================== USER ENDPOINTS ====================

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    return this.request<UserProfile>(`/users/${userId}`);
  }

  /**
   * Get company by ID
   */
  async getCompany(companyId: number): Promise<Company> {
    return this.request<Company>(`/company/${companyId}`);
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: number): Promise<Team> {
    return this.request<Team>(`/teams/${teamId}`);
  }

  /**
   * Get team members (uses leaderboard endpoint)
   */
  async getTeamMembers(teamId: number, limit: number = 50): Promise<any[]> {
    const url = `/leaderboard/team/users?team_id=${teamId}&limit=${limit}`;
    console.log('[API] getTeamMembers URL:', url);
    return this.request<any[]>(url);
  }

  /**
   * Get all teams
   */
  async getAllTeams(): Promise<TeamListItem[]> {
    return this.request<TeamListItem[]>('/teams');
  }

  /**
   * Create a new team
   */
  async createTeam(data: TeamCreate): Promise<TeamCreateResponse> {
    return this.request<TeamCreateResponse>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Join a team
   */
  async joinTeam(teamId: number, code?: string): Promise<void> {
    return this.request<void>(`/teams/${teamId}/join`, {
      method: 'POST',
      body: JSON.stringify({code: code || ''}),
    });
  }

  /**
   * Leave current team
   */
  async leaveTeam(userId: number): Promise<void> {
    return this.request<void>(`/teams/${userId}/leave`, {
      method: 'DELETE',
    });
  }

  /**
   * Get user badges
   */
  async getUserBadges(userId: number): Promise<UserBadge[]> {
    return this.request<UserBadge[]>(`/badges/user/${userId}`);
  }

  /**
   * Get user stats
   */
  async getUserStats(userId: number): Promise<UserStats> {
    return this.request<UserStats>(`/users/${userId}/stats`);
  }

  /**
   * Get user validated journeys
   */
  async getUserValidatedJourneys(userId: number): Promise<ValidatedJourney[]> {
    return this.request<ValidatedJourney[]>(`/journey/${userId}/validated`);
  }

  // ==================== JOURNEY ENDPOINTS ====================

  /**
   * Create a new journey
   */
  async createJourney(journey: JourneyCreate): Promise<JourneyRead> {
    return this.request<JourneyRead>('/journey/', {
      method: 'POST',
      body: JSON.stringify(journey),
    });
  }

  /**
   * Get validated journeys
   */
  async getValidatedJourneys(): Promise<JourneyRead[]> {
    return this.request<JourneyRead[]>('/journey/validated');
  }

  // ==================== LEADERBOARD ENDPOINTS ====================

  /**
   * Get global leaderboard (company users)
   */
  async getGlobalLeaderboard(
    limit: number = 50,
    offset: number = 0,
  ): Promise<LeaderboardUser[]> {
    return this.request<LeaderboardUser[]>(
      `/leaderboard/company/users?limit=${limit}&offset=${offset}`,
    );
  }

  /**
   * Get team leaderboard (company teams)
   */
  async getTeamLeaderboard(
    limit: number = 50,
    offset: number = 0,
  ): Promise<LeaderboardTeam[]> {
    return this.request<LeaderboardTeam[]>(
      `/leaderboard/company/teams?limit=${limit}&offset=${offset}`,
    );
  }

  /**
   * Get team members leaderboard (users in the current user's team)
   */
  async getTeamMembersLeaderboard(
    limit: number = 50,
    offset: number = 0,
  ): Promise<LeaderboardUser[]> {
    return this.request<LeaderboardUser[]>(
      `/leaderboard/team/users?limit=${limit}&offset=${offset}`,
    );
  }

  // ==================== SHOP ENDPOINTS ====================

  /**
   * Get all shop items
   */
  async getShopItems(): Promise<ShopItem[]> {
    return this.request<ShopItem[]>('/shop/items');
  }

  /**
   * Purchase a shop item
   */
  async purchaseItem(itemId: number): Promise<PurchasedItem> {
    return this.request<PurchasedItem>(`/shop/purchase/${itemId}`, {
      method: 'POST',
    });
  }

  /**
   * Get user's purchased items
   */
  async getPurchasedItems(userId: number): Promise<PurchasedItem[]> {
    return this.request<PurchasedItem[]>(`/shop/purchases/${userId}`);
  }

  // ==================== WALLET ENDPOINTS ====================

  /**
   * Get user's wallet (coins balance)
   */
  async getWallet(userId: number): Promise<Wallet> {
    return this.request<Wallet>(`/wallets/${userId}`);
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

export default apiClient;
