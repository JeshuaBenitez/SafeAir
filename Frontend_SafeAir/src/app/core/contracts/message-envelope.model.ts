export interface MessageEnvelope<TPayload> {
  readonly eventId: string;
  readonly eventType: string;
  readonly occurredAt: string;
  readonly correlationId: string;
  readonly payload: TPayload;
}
