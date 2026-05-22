import { AuthDataSourceMode } from '@core/config/auth-data-source.token';
import { AuthRepositoryPort } from '@features/auth/domain/ports/auth-repository.port';
import { ApiClientPort } from '@core/http/api-client.port';

import { AuthApiRepositoryAdapter } from './auth-api-repository.adapter';
import { AuthMockRepositoryAdapter } from './auth-mock-repository.adapter';

/**
 * Create auth repository based on configuration
 * 
 * @param mode - Authentication data source: 'api' or 'mock'
 * @param apiClient - HTTP API client for API mode
 * @returns AuthRepositoryPort instance
 * 
 * The factory provides the appropriate adapter:
 * - 'api' mode: Uses real HTTP calls via ApiClientPort
 * - 'mock' mode: Uses hardcoded mock data for testing UI in isolation
 */
export const createAuthRepository = (
  mode: AuthDataSourceMode,
  apiClient: ApiClientPort
): AuthRepositoryPort => {
  if (mode === 'api') {
    return new AuthApiRepositoryAdapter(apiClient);
  }
  return new AuthMockRepositoryAdapter();
};
