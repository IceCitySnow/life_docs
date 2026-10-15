import { getErrorMessage } from '../../services/api';
import { getMyAtlas } from '../../services/me';
import type { AtlasData } from '../../types/api';
import { formatDateTime } from '../../utils/format';
import { difficultyLabel, progressPercent } from '../../utils/labels';

type LitView = {
  taskId: string;
  title: string;
  summary: string;
  categoryName: string;
  difficultyLabel: string;
  completedAtText: string;
};

Page({
  data: {
    loading: true,
    error: '',
    empty: false,
    stats: {
      litCount: 0,
      publishedTaskCount: 0,
      progressText: '0%',
    },
    categories: [] as AtlasData['categories'],
    litTasks: [] as LitView[],
  },

  onShow() {
    void this.loadAtlas();
  },

  async loadAtlas() {
    this.setData({ loading: true, error: '' });
    try {
      const app = getApp<IAppOption>();
      await app.ensureSession();
      const res = await getMyAtlas();
      const litTasks: LitView[] = res.data.litTasks.map((item) => ({
        taskId: item.taskId,
        title: item.task.title,
        summary: item.task.summary,
        categoryName: item.task.category?.name || '',
        difficultyLabel: difficultyLabel(item.task.difficulty),
        completedAtText: item.completedAt
          ? formatDateTime(item.completedAt)
          : '',
      }));

      this.setData({
        loading: false,
        empty: litTasks.length === 0,
        stats: {
          litCount: res.data.stats.litCount,
          publishedTaskCount: res.data.stats.publishedTaskCount,
          progressText: progressPercent(res.data.stats.progressRatio),
        },
        categories: res.data.categories,
        litTasks,
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: getErrorMessage(error, '加载图鉴失败'),
        litTasks: [],
        empty: false,
      });
    }
  },

  onRetry() {
    void this.loadAtlas();
  },

  onOpenTask(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id) {
      return;
    }
    wx.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
  },
});
