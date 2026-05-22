/**
 * API Client Injection Token
 * 
 * Provides centralized access to the API client singleton
 * Allows switching implementations without changing dependent code
 */

import { InjectionToken } from '@angular/core';
import { ApiClientPort } from '../http/api-client.port';
import { HttpClientAdapter } from '../http/http-client.adapter';
import { environment } from '../../../environments/environment';

export const API_CLIENT = new InjectionToken<ApiClientPort>('API_CLIENT');

/**
 * Factory using Angular DI to get HttpClient
 * 
 * Usage in app.config.ts:
 * {
 *   provide: API_CLIENT,
 *   useFactory: createApiClientFactory,
 *   deps: [HttpClient]
 * }
 */
export function createApiClientFactory(httpClient: any): ApiClientPort {
  // This will be called by Angular with HttpClient already injected
  const client = new HttpClientAdapter(httpClient);
  const baseUrl = environment.API_BASE_URL || 'http://localhost:3000';
  client.setBaseUrl(baseUrl);
  return client;
}
