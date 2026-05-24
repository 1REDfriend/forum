import type { ApiClient } from './client.js';
import type { RegisterDTO, LoginDTO, GoogleAuthDTO, AuthResponse } from './types.js';

export class AuthApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  /**
   * Register a new user locally.
   */
  public register(data: RegisterDTO): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/register', data);
  }

  /**
   * Log in user locally.
   */
  public login(data: LoginDTO): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/login', data);
  }

  /**
   * Log in or register user using Google ID token.
   */
  public googleAuth(data: GoogleAuthDTO): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/google', data);
  }
}
