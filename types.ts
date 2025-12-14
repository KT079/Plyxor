export interface UserProfile {
  userId?: string; // Firebase Auth UID
  username: string;
  country: string;
  state: string;
}

export interface Message {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
  isMe: boolean;
  replyTo?: {
    id: string;
    sender: string;
    text: string;
  };
  readBy: string[];
  translation?: string;
  roomId?: string; // Firestore grouping
}

export enum RoomType {
  WORLD = 'WORLD',
  COUNTRY = 'COUNTRY',
  STATE = 'STATE',
  ONE_ON_ONE = 'ONE_ON_ONE'
}

export interface ChatRoom {
  id: RoomType;
  name: string;
  description: string;
  messages: Message[];
  unreadCount: number;
  muted: boolean;
  // Specific for One-on-One
  connectedPartner?: UserProfile | null;
  isSearching?: boolean;
  sessionId?: string | null;
}

// Firestore Document Interfaces
export interface OnlineUserDoc {
  userId: string;
  username: string;
  country: string;
  state: string;
  lastActive: number;
}

export interface MatchQueueDoc {
  userId: string;
  username: string;
  country: string;
  state: string;
  timestamp: number;
}

export interface SessionDoc {
  users: string[]; // [uid1, uid2]
  createdAt: number;
  active: boolean;
  userProfiles: Record<string, UserProfile>;
}