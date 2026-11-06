/**
 * SHOPKART AUTH EVENT CONTRACTS (MEMBER 1 <-> MEMBERS 2, 3, 4)
 *
 * Defines asynchronous domain events emitted upon authentication lifecycle milestones.
 */

export interface UserRegisteredEvent {
  eventId: string;
  eventType: 'user.registered';
  timestamp: string; // ISO 8601
  payload: {
    userId: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
  };
}

export interface PasswordChangedEvent {
  eventId: string;
  eventType: 'user.password_changed';
  timestamp: string;
  payload: {
    userId: string;
    email: string;
  };
}
