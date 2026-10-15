import { getErrorMessage } from '../../services/api';
import { getTask } from '../../services/catalog';
import {
  completeTask,
  getMyTask,
  setFavorite,
  setWish,
  startTask,
} from '../../services/me';
import { getSessionEpoch } from '../../services/session';
import type { TaskDetail, UserTask } from '../../types/api';
import { difficultyLabel } from '../../utils/labels';

type ViewTask = TaskDetail & {
  difficultyLabel: string;
  categoryName: string;
};

type Flags = {
  isFavorite: boolean;
  isWished: boolean;
  startedAt: string | null;
  completedAt: string | null;
};

Page({
  data: {
    taskId: '',
    loading: true,
    error: '',
    busy: false,
    task: null as ViewTask | null,
    flags: {
      isFavorite: false,
      isWished: false,
      startedAt: null,
      completedAt: null,
    } as Flags,
    needsLogin: false,
  },

  _sessionEpoch: 0,

  onLoad(query: Record<string, string | undefined>) {
    const taskId = query.id || '';
    this.setData({ taskId });
    void this.loadDetail();
  },

  onShow() {
    if (this._sessionEpoch !== getSessionEpoch() && this.data.taskId) {
      void this.loadDetail();
    }
  },

  async loadDetail() {
    if (!this.data.taskId) {
      this.setData({ loading: false, error: '缺少任务 ID' });
      return;
    }

    this.setData({ loading: true, error: '', needsLogin: false });
    try {
      const app = getApp<IAppOption>();
      // Task catalog is public; personal flags require login.
      let mine: UserTask | undefined;
      try {
        await app.ensureSession({ optional: false });
        const mineRes = await getMyTask(this.data.taskId);
        mine = mineRes.data;
      } catch {
        this.setData({ needsLogin: true });
      }

      const taskRes = await getTask(this.data.taskId);
      const task: ViewTask = {
        ...taskRes.data,
        difficultyLabel: difficultyLabel(taskRes.data.difficulty),
        categoryName: taskRes.data.category?.name || '',
      };

      this._sessionEpoch = getSessionEpoch();
      this.setData({
        task,
        flags: this.toFlags(mine),
        loading: false,
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: getErrorMessage(error, '加载详情失败'),
        task: null,
      });
    }
  },

  toFlags(mine?: UserTask): Flags {
    return {
      isFavorite: Boolean(mine?.isFavorite),
      isWished: Boolean(mine?.isWished),
      startedAt: mine?.startedAt ?? null,
      completedAt: mine?.completedAt ?? null,
    };
  },

  onRetry() {
    void this.loadDetail();
  },

  async onLoginForActions() {
    try {
      const app = getApp<IAppOption>();
      await app.ensureSession({ forceLogin: true });
      await this.loadDetail();
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '登录失败'),
        icon: 'none',
      });
    }
  },

  async runAction(action: () => Promise<UserTask>, successText: string) {
    if (this.data.busy) {
      return;
    }
    this.setData({ busy: true });
    try {
      const app = getApp<IAppOption>();
      await app.ensureSession({ forceLogin: true });
      const data = await action();
      this.setData({ flags: this.toFlags(data), needsLogin: false });
      wx.showToast({ title: successText, icon: 'success' });
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '操作失败'),
        icon: 'none',
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  onToggleFavorite() {
    const next = !this.data.flags.isFavorite;
    void this.runAction(
      async () => (await setFavorite(this.data.taskId, next)).data,
      next ? '已收藏' : '已取消收藏',
    );
  },

  onToggleWish() {
    const next = !this.data.flags.isWished;
    void this.runAction(
      async () => (await setWish(this.data.taskId, next)).data,
      next ? '已加入愿望' : '已移出愿望',
    );
  },

  onStart() {
    void this.runAction(
      async () => (await startTask(this.data.taskId)).data,
      '已开始',
    );
  },

  onComplete() {
    void this.runAction(
      async () => (await completeTask(this.data.taskId)).data,
      '已完成',
    );
  },

  onWriteRecord() {
    const title = encodeURIComponent(this.data.task?.title || '');
    wx.navigateTo({
      url: `/pages/record-edit/index?taskId=${this.data.taskId}&title=${title}`,
    });
  },
});
