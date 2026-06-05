/**
 * API Client Port (Interface)
 * 
 * Defines the contract for HTTP communication with the backend API
 * Abstraction allows switching between real HTTP and mock implementations
 */

export interface ApiClientRequest<TRequest = any> {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: TRequest;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
}

export interface ApiClientResponse<TResponse = any> {
  status: number;
  statusText: string;
  data: TResponse;
  headers: Record<string, string>;
}

export interface ApiClientError {
  status: number;
  statusText: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Port interface for HTTP API communication
 * 
 * Implementations should handle:
 * - Request serialization and response deserialization
 * - Header injection (Authorization, Content-Type, etc.)
 * - Base URL configuration
 * - Error handling and mapping
 * - Request/response logging (debug)
 * 
 * Implementations must NOT directly expose underlying HTTP library
 * (e.g., HttpClient, fetch, axios, etc.)
 */
export abstract class ApiClientPort {
  /**
   * Perform an HTTP request to the API
   * 
   * @template TRequest - Request body type
   * @template TResponse - Response body type
   * @param request - Request configuration
   * @returns Promise resolving to response or rejecting with ApiClientError
   */
  abstract request<TRequest, TResponse>(
    request: ApiClientRequest<TRequest>
  ): Promise<ApiClientResponse<TResponse>>;

  /**
   * Perform a GET request
   */
  abstract get<TResponse = any>(
    url: string,
    options?: { headers?: Record<string, string>; params?: Record<string, any> }
  ): Promise<ApiClientResponse<TResponse>>;

  /**
   * Perform a POST request
   */
  abstract post<TRequest, TResponse = any>(
    url: string,
    body: TRequest,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiClientResponse<TResponse>>;

  /**
   * Perform a PUT request
   */
  abstract put<TRequest, TResponse = any>(
    url: string,
    body: TRequest,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiClientResponse<TResponse>>;

  /**
   * Perform a DELETE request
   */
  abstract delete<TResponse = any>(
    url: string,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiClientResponse<TResponse>>;

  /**
   * Set or update the base URL for API calls
   * Used to switch between dev/staging/prod or localhost/network
   */
  abstract setBaseUrl(baseUrl: string): void;

  /**
   * Get current base URL
   */
  abstract getBaseUrl(): string;

  /**
   * Set authorization token (JWT)
   * Implementations should inject this token into Authorization header
   */
  abstract setAuthToken(token: string | null): void;
}
