import { APP_INITIALIZER, ApplicationConfig } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { APP_ROUTES } from './app.routes';
import { AUTH_DATA_SOURCE, authDataSourceFactory } from './core/config/auth-data-source.token';
import { API_CLIENT, createApiClientFactory } from './core/config/api-client.token';
import { createAuthRepository } from './features/auth/data/adapters/auth-repository.factory';
import { AUTH_REPOSITORY } from './features/auth/domain/ports/auth-repository.port';
import { HttpClient } from '@angular/common/http';
import { AuthFacade } from './features/auth/application/facades/auth.facade';

export const appConfig: ApplicationConfig = {
  providers: [
    // HTTP client provider (required for HttpClientAdapter)
    provideHttpClient(),
    
    // Router configuration
    provideRouter(
      APP_ROUTES,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
      }),
    ),
    
    // API Client - centralized HTTP communication
    {
      provide: API_CLIENT,
      useFactory: createApiClientFactory,
      deps: [HttpClient],
    },
    
    // Authentication data source (can be 'api' or 'mock' based on environment)
    {
      provide: AUTH_DATA_SOURCE,
      useFactory: authDataSourceFactory,
    },
    
    // Authentication repository factory - wires API client to auth adapter
    {
      provide: AUTH_REPOSITORY,
      deps: [AUTH_DATA_SOURCE, API_CLIENT],
      useFactory: createAuthRepository,
    },
    {
      provide: APP_INITIALIZER,
      multi: true,
      deps: [AuthFacade],
      useFactory: (authFacade: AuthFacade) => () => authFacade.restoreSession(),
    },
  ],
};
