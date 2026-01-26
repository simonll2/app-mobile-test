/**
 * Authentication Service
 */

import {apiClient} from '@/api/client';

export interface ApiError {
  message: string;
  status?: number;
}

export interface SignUpData {
  username: string;
  email: string;
  password: string;
  firstname: string;
  lastname: string;
  company_code: string;
}

export interface LoginData {
  username: string;
  password: string;
}

/**
 * Sign up a new user
 */
export async function signUpUser(data: SignUpData): Promise<void> {
  try {
    await apiClient.register({
      username: data.username,
      email: data.email,
      password: data.password,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur lors de l'inscription";
    throw {message} as ApiError;
  }
}

/**
 * Login user
 */
export async function loginUser(data: LoginData): Promise<void> {
  try {
    await apiClient.login(data.username, data.password);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur de connexion';
    throw {message} as ApiError;
  }
}
