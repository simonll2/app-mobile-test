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

export interface ResetPasswordData {
  email: string;
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

/**
 * Reset password by email
 */
export async function resetPassword(data: ResetPasswordData): Promise<string> {
  try {
    const baseUrl = apiClient['baseUrl'] || 'https://capitulatory-insinuatingly-dayna.ngrok-free.dev';
    const response = await fetch(`${baseUrl}/resetpassword`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la réinitialisation');
    }

    const responseData = await response.json() as {message?: string};
    return responseData.message || 'Code envoyé avec succès';
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur lors de la réinitialisation';
    throw {message} as ApiError;
  }
}

export interface ChangePasswordData {
  email: string;
  temporary_password: string;
  new_password: string;
}

/**
 * Change password using temporary code (for password reset flow)
 */
export async function changePasswordWithCode(data: ChangePasswordData): Promise<string> {
  try {
    const baseUrl = apiClient['baseUrl'] || 'https://capitulatory-insinuatingly-dayna.ngrok-free.dev';
    const response = await fetch(`${baseUrl}/resetpassword/confirm`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Code invalide ou expiré');
    }

    const responseData = await response.json() as {message?: string};
    return responseData.message || 'Mot de passe modifié avec succès';
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Erreur lors du changement de mot de passe';
    throw {message} as ApiError;
  }
}
