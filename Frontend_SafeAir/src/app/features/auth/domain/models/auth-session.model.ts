export interface AuthSession {
  readonly authenticated: true;
  readonly userId: string;
  readonly displayName: string;
  readonly tokenType: 'Bearer';
  readonly accessToken: string;
  readonly expiresAt: string;
  readonly email?: string;
}
