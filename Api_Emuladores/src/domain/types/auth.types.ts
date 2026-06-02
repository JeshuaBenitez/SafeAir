export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface JwtPayload {
  sub: string;
  role: "admin" | "operator";
  email: string;
}

export interface LoginResponse {
  authenticated: true;
  userId: string;
  displayName: string;
  email: string;
  tokenType: "Bearer";
  accessToken: string;
  expiresAt: string;
}

export interface OtpRequiredResponse {
  requiresOtp: true;
  email: string;
}

export type LoginResult = LoginResponse | OtpRequiredResponse;
