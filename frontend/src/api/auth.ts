import type { ApiClient } from './client.js';
import type { RegisterDTO, LoginDTO, GoogleAuthDTO, AuthResponse } from './types.js';

export class AuthApi {
  private client: ApiClient;

  constructor(client: ApiClient) {
    this.client = client;
  }

  public register(data: RegisterDTO): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/register', data);
  }

  public login(data: LoginDTO): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/login', data);
  }

  public googleAuth(data: GoogleAuthDTO): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/google', data);
  }

  public forgotPassword(email: string): Promise<{ message: string }> {
    return this.client.post<{ message: string }>('/auth/forgot-password', { email });
  }

  public resetPassword(token: string, password: string): Promise<{ message: string }> {
    return this.client.post<{ message: string }>('/auth/reset-password', { token, password });
  }

  public logout(refreshToken: string | null): Promise<{ message: string }> {
    return this.client.post<{ message: string }>('/auth/logout', { refreshToken });
  }
}
