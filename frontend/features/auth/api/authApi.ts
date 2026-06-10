import { apiClient } from '@/services/api/client';
import type { TokenResponse } from '../types/api';

/**
 * Exchange a Google ID token for a backend JWT.
 *
 * The backend verifies the token with Google, links or creates the user,
 * and returns the standard TokenResponse (same shape as email login).
 */
export const googleLogin = async (idToken: string): Promise<TokenResponse> => {
  const response = await apiClient.post<{ data: TokenResponse }>('/auth/google', {
    id_token: idToken,
  });
  return response.data.data;
};
