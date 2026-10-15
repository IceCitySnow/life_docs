import { getErrorMessage } from '../../services/api';
import { listCategories, listTasks } from '../../services/catalog';
import type { Category, TaskSummary } from '../../types/api';
import { difficultyLabel } from '../../utils/labels';

type ViewTask = TaskSummary & {
  difficultyLabel: string;
  categoryName: string;
};

Page({
  data: {
    loading: true,
    error: '',
    categories: [] as Array<Category & { active: boolean }>,
    selectedCategoryId: '',
    tasks: [] as ViewTask[],
    empty: false,
  },

  onShow() {
    void this.loadAll();
  },

  async loadAll() {
    this.setData({ loading: true, error: '' });
    try {
      const app = getApp<IAppOption>();
      await app.ensureSession();

      const [categoryRes, taskRes] = await Promise.all([
        listCategories(),
        listTasks({
          page: 1,
          pageSize: 50,
          categoryId: this.data.selectedCategoryId || undefined,
        }),
      ]);

      const categories = [
        { id: '', name: '全部', slug: 'all', active: !this.data.selectedCategoryId },
        ...categoryRes.data.map((item) => ({
          ...item,
          active: item.id === this.data.selectedCategoryId,
        })),
      ];

      const tasks: ViewTask[] = taskRes.data.map((item) => ({
        ...item,
        difficultyLabel: difficultyLabel(item.difficulty),
        categoryName: item.category?.name || '',
      }));

      this.setData({
        categories,
        tasks,
        empty: tasks.length === 0,
        loading: false,
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: getErrorMessage(error, '加载任务失败'),
        tasks: [],
        empty: false,
      });
    }
  },

  onSelectCategory(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    this.setData({ selectedCategoryId: id }, () => {
      void this.loadAll();
    });
  },

  onRetry() {
    void this.loadAll();
  },

  onOpenTask(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id) {
      return;
    }
    wx.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
  },
});
