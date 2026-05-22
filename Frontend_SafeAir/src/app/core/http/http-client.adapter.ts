/**
 * HTTP Client Adapter
 * 
 * Concrete implementation using Angular's HttpClient
 * Handles:
 * - Base URL configuration
 * - JWT token injection
 * - Request/response logging
 * - Error mapping to domain errors
 */

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import type { 
  ApiClientRequest, 
  ApiClientResponse, 
  ApiClientError
} from './api-client.port';
import { ApiClientPort } from './api-client.port';

@Injectable({
  providedIn: 'root'
})
export class HttpClientAdapter extends ApiClientPort {
  private baseUrl: string = '';
  private authToken: string | null = null;

  constructor(private readonly httpClient: HttpClient) {
    super();
  }

  /**
   * Perform a generic HTTP request
   */
  async request<TRequest, TResponse>(
    request: ApiClientRequest<TRequest>
  ): Promise<ApiClientResponse<TResponse>> {
    try {
      const url = this.buildUrl(request.url);
      const headers = this.buildHeaders(request.headers);

      console.debug(
        `[ApiClient] ${request.method} ${url}`,
        { body: request.body, headers }
      );

      let response$;

      switch (request.method) {
        case 'GET':
          response$ = this.httpClient.get<TResponse>(url, { 
            headers, 
            params: request.params,
            observe: 'response'
          });
          break;
        case 'POST':
          response$ = this.httpClient.post<TResponse>(url, request.body, { 
            headers, 
            observe: 'response'
          });
          break;
        case 'PUT':
          response$ = this.httpClient.put<TResponse>(url, request.body, { 
            headers, 
            observe: 'response'
          });
          break;
        case 'DELETE':
          response$ = this.httpClient.delete<TResponse>(url, { 
            headers, 
            observe: 'response'
          });
          break;
        case 'PATCH':
          response$ = this.httpClient.patch<TResponse>(url, request.body, { 
            headers, 
            observe: 'response'
          });
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${request.method}`);
      }

      const response = await firstValueFrom(response$);

      const apiResponse: ApiClientResponse<TResponse> = {
        status: response.status,
        statusText: response.statusText,
        data: response.body as TResponse,
        headers: this.extractHeaders(response.headers)
      };

      console.debug(`[ApiClient] ${request.method} ${url} -> ${response.status}`, apiResponse);

      return apiResponse;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * GET request
   */
  async get<TResponse = any>(
    url: string,
    options?: { headers?: Record<string, string>; params?: Record<string, any> }
  ): Promise<ApiClientResponse<TResponse>> {
    return this.request<undefined, TResponse>({
      url,
      method: 'GET',
      headers: options?.headers,
      params: options?.params
    });
  }

  /**
   * POST request
   */
  async post<TRequest, TResponse = any>(
    url: string,
    body: TRequest,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiClientResponse<TResponse>> {
    return this.request<TRequest, TResponse>({
      url,
      method: 'POST',
      body,
      headers: options?.headers
    });
  }

  /**
   * PUT request
   */
  async put<TRequest, TResponse = any>(
    url: string,
    body: TRequest,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiClientResponse<TResponse>> {
    return this.request<TRequest, TResponse>({
      url,
      method: 'PUT',
      body,
      headers: options?.headers
    });
  }

  /**
   * DELETE request
   */
  async delete<TResponse = any>(
    url: string,
    options?: { headers?: Record<string, string> }
  ): Promise<ApiClientResponse<TResponse>> {
    return this.request<undefined, TResponse>({
      url,
      method: 'DELETE',
      headers: options?.headers
    });
  }

  /**
   * Set base URL
   */
  setBaseUrl(baseUrl: string): void {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    console.debug(`[ApiClient] Base URL set to: ${this.baseUrl}`);
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      console.debug(`[ApiClient] Authorization token updated`);
    } else {
      console.debug(`[ApiClient] Authorization token cleared`);
    }
  }

  // ========== Private Helpers ==========

  /**
   * Build full URL from relative path and base URL
   */
  private buildUrl(path: string): string {
    if (path.startsWith('http')) {
      return path; // Already absolute
    }
    return `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
  }

  /**
   * Build HTTP headers with authorization and defaults
   */
  private buildHeaders(customHeaders?: Record<string, string>): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    // Add authorization header if token is set
    if (this.authToken) {
      headers = headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    // Add custom headers
    if (customHeaders) {
      for (const [key, value] of Object.entries(customHeaders)) {
        headers = headers.set(key, value);
      }
    }

    return headers;
  }

  /**
   * Extract headers from HttpResponse as plain object
   */
  private extractHeaders(httpHeaders: any): Record<string, string> {
    const headers: Record<string, string> = {};
    if (httpHeaders?.keys) {
      httpHeaders.keys().forEach((key: string) => {
        headers[key] = httpHeaders.get(key);
      });
    }
    return headers;
  }

  /**
   * Handle HTTP errors and convert to ApiClientError
   */
  private handleError(error: any): never {
    if (error instanceof HttpErrorResponse) {
      const apiError: ApiClientError = {
        status: error.status,
        statusText: error.statusText,
        error: {
          code: error.error?.code || 'HTTP_ERROR',
          message: error.error?.message || error.statusText || 'Unknown error',
          details: error.error?.details
        }
      };

      console.error(`[ApiClient] HTTP Error ${error.status}`, apiError);

      throw apiError;
    }

    // Network error or other
    const apiError: ApiClientError = {
      status: 0,
      statusText: 'Network Error',
      error: {
        code: 'NETWORK_ERROR',
        message: error?.message || 'Failed to connect to API',
        details: error
      }
    };

    console.error(`[ApiClient] Network Error`, apiError);
    throw apiError;
  }
}
