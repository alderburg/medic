import { Session } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    selectedPatientId?: number;
    caregiverId?: number;
    userProfile?: string;
  }
}

export interface AuthenticatedRequest extends Express.Request {
  user?: any;
  selectedPatientId?: number;
  caregiverId?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: any;
      selectedPatientId?: number;
      caregiverId?: number;
    }
  }

  var authenticatedConnections: Map<number, Set<import('ws').WebSocket>>;
}