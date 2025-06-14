import { Timestamps, OrganizationId, UserId } from '../utils/common';
import { MemberRole } from './user';

export interface Organization extends Timestamps {
  id: OrganizationId;
  name: string;
  description?: string;
  slug?: string;
  logo?: string;
  website?: string;
  memberCount?: number;
  projectCount?: number;
  settings?: OrganizationSettings;
}

export interface OrganizationSettings {
  allowMemberInvites?: boolean;
  defaultProjectVisibility?: 'organization' | 'private';
  requireTwoFactor?: boolean;
  allowedDomains?: string[];
}

export interface OrganizationMember {
  id: string;
  userId: UserId;
  organizationId: OrganizationId;
  role: MemberRole;
  joinedAt: string;
  invitedBy?: UserId;
  user?: {
    id: UserId;
    email: string;
    fullName: string;
    avatar?: string;
  };
}

export interface Invitation {
  id: string;
  organizationId: OrganizationId;
  email: string;
  role: MemberRole;
  invitedBy: UserId;
  inviteUrl?: string;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
}