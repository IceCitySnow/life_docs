import { User } from '@prisma/client';
import { PublicUserProfile } from './auth.types';

export function toPublicUser(user: User): PublicUserProfile {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
