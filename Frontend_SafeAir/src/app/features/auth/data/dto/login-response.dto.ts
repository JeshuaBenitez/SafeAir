export interface LoginResponseDto {
  readonly authenticated: boolean;
  readonly userId: string;
  readonly displayName: string;
  readonly tokenType: string;
  readonly accessToken: string;
  readonly expiresAt: string;
}
