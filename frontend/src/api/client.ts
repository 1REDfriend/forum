export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null;
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

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, ''); // Remove trailing slash if any
    this.getToken = config.getToken;
  }

  private async request<T>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    data?: any,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    
    const headers = new Headers(options.headers || {});
    
    // Set content type to JSON by default if body data is provided
    if (data && !(data instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    // Set authorization header if token resolver is configured
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
