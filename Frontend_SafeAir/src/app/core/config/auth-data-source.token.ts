import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

export type AuthDataSourceMode = 'mock' | 'api';

export const AUTH_DATA_SOURCE = new InjectionToken<AuthDataSourceMode>('AUTH_DATA_SOURCE');

export const authDataSourceFactory = (): AuthDataSourceMode => {
  return environment.AUTH_MODE === 'api' ? 'api' : 'mock';
};
