export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export type RecordVisibility = 'PRIVATE' | 'PUBLIC';

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiListResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type ApiDataResponse<T> = {
  data: T;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type TaskSummary = {
  id: string;
  categoryId: string;
  title: string;
  summary: string;
  coverImageUrl: string | null;
  estimatedMinutes: number | null;
  difficulty: Difficulty;
  tags: string[];
  status: string;
  category?: Category;
};

export type TaskDetail = TaskSummary & {
  instructions: string;
  budgetNote: string | null;
  requirements: string | null;
  alternatives: string | null;
  reflectionPrompt: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicUser = {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type LoginResult = {
  accessToken: string;
  tokenType: string;
  expiresAt: string;
  user: PublicUser;
};

export type UserTask = {
  id: string;
  userId: string;
  taskId: string;
  isFavorite: boolean;
  isWished: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  task?: {
    id: string;
    title: string;
    summary: string;
    status: string;
    difficulty: Difficulty;
    categoryId: string;
    coverImageUrl: string | null;
    tags: string[];
  };
};

export type Wish = {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExplorationRecord = {
  id: string;
  userId: string;
  taskId: string | null;
  customWishId: string | null;
  titleSnapshot: string;
  reflectionText: string | null;
  photoRefs: string[];
  visibility: RecordVisibility;
  createdAt: string;
  updatedAt: string;
};

export type AtlasData = {
  stats: {
    litCount: number;
    publishedTaskCount: number;
    progressRatio: number;
  };
  categories: Array<{
    categoryId: string;
    name: string;
    slug: string;
    litCount: number;
  }>;
  litTasks: Array<{
    taskId: string;
    completedAt: string | null;
    task: TaskSummary;
  }>;
};
