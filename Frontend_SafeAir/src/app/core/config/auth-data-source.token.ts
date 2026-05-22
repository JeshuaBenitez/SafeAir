import { InjectionToken } from '@angular/core';

export type AuthDataSourceMode = 'mock' | 'api';

export const AUTH_DATA_SOURCE = new InjectionToken<AuthDataSourceMode>('AUTH_DATA_SOURCE');

export const authDataSourceFactory = (): AuthDataSourceMode => {
  const configured = (globalThis as { __SAFEAIR_AUTH_MODE__?: string }).__SAFEAIR_AUTH_MODE__;
  return configured === 'api' ? 'api' : 'mock';
};
