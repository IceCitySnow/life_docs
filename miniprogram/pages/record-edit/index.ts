import { getErrorMessage } from '../../services/api';
import { createRecord } from '../../services/me';
import type { RecordVisibility } from '../../types/api';

Page({
  data: {
    taskId: '',
    title: '',
    reflectionText: '',
    visibility: 'PRIVATE' as RecordVisibility,
    busy: false,
  },

  onLoad(query: Record<string, string | undefined>) {
    this.setData({
      taskId: query.taskId || '',
      title: query.title ? decodeURIComponent(query.title) : '探索回忆',
    });
  },

  onInput(event: WechatMiniprogram.Input) {
    this.setData({ reflectionText: event.detail.value });
  },

  onVisibility(event: WechatMiniprogram.TouchEvent) {
    const value = String(event.currentTarget.dataset.value || 'PRIVATE') as RecordVisibility;
    this.setData({ visibility: value });
  },

  async onSubmit() {
    if (this.data.busy) {
      return;
    }
    if (!this.data.taskId) {
      wx.showToast({ title: '缺少任务', icon: 'none' });
      return;
    }

    this.setData({ busy: true });
    try {
      const app = getApp<IAppOption>();
      await app.ensureSession({ forceLogin: true });
      await createRecord({
        taskId: this.data.taskId,
        reflectionText: this.data.reflectionText || undefined,
        visibility: this.data.visibility,
      });
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 400);
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '保存失败'),
        icon: 'none',
      });
      this.setData({ busy: false });
    }
  },
});
