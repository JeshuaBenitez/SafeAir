import { MessageEnvelope } from './message-envelope.model';

export interface BrokerClientPort {
  publish<TPayload>(topic: string, message: MessageEnvelope<TPayload>): Promise<void>;
  subscribe<TPayload>(topic: string, handler: (message: MessageEnvelope<TPayload>) => void): () => void;
}
