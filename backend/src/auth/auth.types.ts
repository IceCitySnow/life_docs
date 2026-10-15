import { UserRole, UserStatus } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  status: UserStatus;
  displayName: string | null;
  avatarUrl: string | null;
  sessionId: string;
}

export interface PublicUserProfile {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}
