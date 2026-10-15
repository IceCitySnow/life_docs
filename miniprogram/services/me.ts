import type {
  ApiDataResponse,
  ApiListResponse,
  AtlasData,
  ExplorationRecord,
  UserTask,
  Wish,
} from '../types/api';
import { requestApi } from './api';

export function listMyTasks(query: {
  page?: number;
  pageSize?: number;
  favorite?: boolean;
  wished?: boolean;
  started?: boolean;
  completed?: boolean;
}) {
  return requestApi<ApiListResponse<UserTask>>({
    path: '/me/tasks',
    data: {
      page: query.page,
      pageSize: query.pageSize,
      ...(query.favorite !== undefined ? { favorite: String(query.favorite) } : {}),
      ...(query.wished !== undefined ? { wished: String(query.wished) } : {}),
      ...(query.started !== undefined ? { started: String(query.started) } : {}),
      ...(query.completed !== undefined
        ? { completed: String(query.completed) }
        : {}),
    },
  });
}

export function setFavorite(taskId: string, favorite: boolean) {
  return requestApi<ApiDataResponse<UserTask>>({
    path: `/me/tasks/${taskId}/favorite`,
    method: favorite ? 'PUT' : 'DELETE',
  });
}

export function setWish(taskId: string, wished: boolean) {
  return requestApi<ApiDataResponse<UserTask>>({
    path: `/me/tasks/${taskId}/wish`,
    method: wished ? 'PUT' : 'DELETE',
  });
}

export function startTask(taskId: string) {
  return requestApi<ApiDataResponse<UserTask>>({
    path: `/me/tasks/${taskId}/start`,
    method: 'POST',
  });
}

export function completeTask(taskId: string) {
  return requestApi<ApiDataResponse<UserTask>>({
    path: `/me/tasks/${taskId}/complete`,
    method: 'POST',
  });
}

export function listWishes(page = 1, pageSize = 20) {
  return requestApi<ApiListResponse<Wish>>({
    path: '/me/wishes',
    data: { page, pageSize },
  });
}

export function createWish(payload: {
  title: string;
  description?: string;
  categoryId?: string;
}) {
  return requestApi<ApiDataResponse<Wish>>({
    path: '/me/wishes',
    method: 'POST',
    data: payload,
  });
}

export function completeWish(wishId: string) {
  return requestApi<ApiDataResponse<Wish>>({
    path: `/me/wishes/${wishId}/complete`,
    method: 'POST',
  });
}

export function deleteWish(wishId: string) {
  return requestApi<ApiDataResponse<{ success: boolean }>>({
    path: `/me/wishes/${wishId}`,
    method: 'DELETE',
  });
}

export function listMyRecords(page = 1, pageSize = 20) {
  return requestApi<ApiListResponse<ExplorationRecord>>({
    path: '/records/me',
    data: { page, pageSize },
  });
}

export function createRecord(payload: {
  taskId?: string;
  customWishId?: string;
  titleSnapshot?: string;
  reflectionText?: string;
  photoRefs?: string[];
  visibility?: 'PRIVATE' | 'PUBLIC';
}) {
  return requestApi<ApiDataResponse<ExplorationRecord>>({
    path: '/records',
    method: 'POST',
    data: payload,
  });
}

export function deleteRecord(recordId: string) {
  return requestApi<ApiDataResponse<{ success: boolean }>>({
    path: `/records/${recordId}`,
    method: 'DELETE',
  });
}

export function getMyAtlas() {
  return requestApi<ApiDataResponse<AtlasData>>({
    path: '/atlas/me',
  });
}

export function deleteAccount() {
  return requestApi<ApiDataResponse<{ success: boolean; note?: string }>>({
    path: '/users/me',
    method: 'DELETE',
  });
}
