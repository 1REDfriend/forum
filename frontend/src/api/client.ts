export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
  getRefreshToken?: () => string | null;
  setTokens?: (token: string, refreshToken: string) => void;
  onUnauthorized?: () => void;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | null;
  private getRefreshToken?: () => string | null;
  private setTokens?: (token: string, refreshToken: string) => void;
  private onUnauthorized?: () => void;
  // Single-flight refresh: many requests failing 401 at once share one refresh call.
  private refreshing: Promise<boolean> | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash if any
    this.getToken = config.getToken;
    this.getRefreshToken = config.getRefreshToken;
    this.setTokens = config.setTokens;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: any,
    options: RequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    const headers = new Headers(options.headers || {});

    // Set content type to JSON by default if body data is provided
    if (data && !(data instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Set authorization header if token resolver is configured
    const hadToken = !!this.getToken?.();
    if (this.getToken) {
      const token = this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const config: RequestInit = {
      ...options,
      method,
      headers,
    };

    if (data) {
      config.body = data instanceof FormData ? data : JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);

      let responseData: any = null;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        // An authenticated request rejected with 401 → access token expired/invalid.
        // (A 401 with no token is just a failed login attempt — leave it alone.)
        if (response.status === 401 && hadToken) {
          // Try a one-time refresh + retry before giving up the session.
          if (!isRetry) {
            const refreshed = await this.tryRefresh();
            if (refreshed) {
              return this.request<T>(path, method, data, options, true);
            }
          }
          this.onUnauthorized?.();
        }
        const errorMessage = responseData && responseData.error
          ? responseData.error
          : responseData && responseData.message
            ? responseData.message
            : `HTTP error! Status: ${response.status}`;
        throw new ApiError(response.status, errorMessage, responseData);
      }

      return responseData as T;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      // Catch generic network failures
      throw new ApiError(500, error instanceof Error ? error.message : 'Network connection failure');
    }
  }

  /**
   * Exchange the stored refresh token for a fresh access + refresh pair.
   * Resolves true on success (new tokens persisted via setTokens), false otherwise.
   * Concurrent callers share the same in-flight refresh.
   */
  private tryRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken?.();
    if (!refreshToken || !this.setTokens) return Promise.resolve(false);

    if (!this.refreshing) {
      this.refreshing = fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      })
        .then(async (res) => {
          if (!res.ok) return false;
          const d = await res.json().catch(() => null);
          if (d && d.token && d.refreshToken) {
            this.setTokens!(d.token, d.refreshToken);
            return true;
          }
          return false;
        })
        .catch(() => false)
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  public get<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, 'GET', undefined, options);
  }

  public post<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, 'POST', data, options);
  }

  public put<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, 'PUT', data, options);
  }

  public patch<T>(path: string, data?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(path, 'PATCH', data, options);
  }

  public delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, 'DELETE', undefined, options);
  }
}
