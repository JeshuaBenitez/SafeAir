export interface ApiRequest {
  readonly path: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

export interface ApiClientPort {
  request<TResponse>(request: ApiRequest): Promise<TResponse>;
}
