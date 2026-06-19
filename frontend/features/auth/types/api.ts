/** Shape of the request body sent to POST /auth/google. */
export interface GoogleLoginRequest {
  id_token: string;
}

/** Shape returned by all auth endpoints (login, register, google). */
export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

export interface UserResponse {
  id: string;
  email: string;
  full_name: string;
  role: string;
  terms_accepted: boolean;
  is_premium: boolean;
}

/** Normalised error shape extracted from API responses. */
export interface AuthError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
