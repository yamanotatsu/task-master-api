import { Timestamps, UserId, OrganizationId } from '../utils/common';

export interface User {
  id: UserId;
  email: string;
  fullName: string;
  avatar?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Profile extends User {
  phone?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  language?: string;
  notifications?: NotificationPreferences;
}

export interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  taskUpdates?: boolean;
  projectUpdates?: boolean;
  mentions?: boolean;
}

export interface Member extends Timestamps {
  id: UserId;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  avatar?: string;
  joinedAt?: string;
  lastActiveAt?: string;
  organizationId?: OrganizationId;
}

export type MemberRole = 'admin' | 'developer' | 'viewer' | 'member';
export type MemberStatus = 'active' | 'inactive' | 'pending';

// Authentication related types
export interface AuthUser {
  id: UserId;
  email: string;
  emailVerified: boolean;
  metadata?: {
    fullName?: string;
    avatar?: string;
  };
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}