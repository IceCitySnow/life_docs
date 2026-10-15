import type {
  ApiDataResponse,
  ApiListResponse,
  Category,
  TaskDetail,
  TaskSummary,
} from '../types/api';
import { requestApi } from './api';

export function listCategories() {
  return requestApi<ApiDataResponse<Category[]>>({
    path: '/categories',
    auth: false,
  });
}

export function listTasks(query: {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  difficulty?: string;
  tag?: string;
}) {
  return requestApi<ApiListResponse<TaskSummary>>({
    path: '/tasks',
    data: query,
    auth: false,
  });
}

export function getTask(taskId: string) {
  return requestApi<ApiDataResponse<TaskDetail>>({
    path: `/tasks/${taskId}`,
    auth: false,
  });
}

export function listRecommended(page = 1, pageSize = 20) {
  return requestApi<ApiListResponse<TaskSummary>>({
    path: '/tasks/recommended',
    data: { page, pageSize },
    auth: false,
  });
}
