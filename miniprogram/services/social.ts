import type { ApiDataResponse, ApiListResponse } from '../types/api';
import { requestApi } from './api';

export type PublicRecordCard = {
  id: string;
  titleSnapshot: string;
  reflectionText: string | null;
  photoRefs: string[];
  completedAt: string;
  createdAt: string;
  updatedAt: string;
  taskId: string | null;
  author: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  likeCount: number;
  favoriteCount: number;
  likedByMe: boolean;
  favoritedByMe: boolean;
};

export function listPublicRecords(page = 1, pageSize = 20) {
  return requestApi<ApiListResponse<PublicRecordCard>>({
    path: '/public/records',
    data: { page, pageSize },
    // Public endpoint: attach Bearer when present (likedByMe), else anonymous.
  });
}

export function likePublicRecord(recordId: string, liked: boolean) {
  return requestApi<ApiDataResponse<{ recordId: string; liked: boolean }>>({
    path: `/records/${recordId}/like`,
    method: liked ? 'PUT' : 'DELETE',
  });
}

export function favoritePublicRecord(recordId: string, favorited: boolean) {
  return requestApi<
    ApiDataResponse<{ recordId: string; favorited: boolean }>
  >({
    path: `/records/${recordId}/favorite`,
    method: favorited ? 'PUT' : 'DELETE',
  });
}

export function createReport(payload: {
  recordId?: string;
  taskId?: string;
  reason: string;
  details?: string;
}) {
  return requestApi<ApiDataResponse<{ id: string }>>({
    path: '/reports',
    method: 'POST',
    data: payload,
  });
}
