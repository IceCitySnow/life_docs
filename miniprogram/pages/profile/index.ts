import { getErrorMessage } from '../../services/api';
import {
  clearCachedUser,
  clearToken,
  ensureLogin,
  logout,
} from '../../services/auth';
import {
  completeWish,
  createWish,
  deleteAccount,
  deleteRecord,
  deleteWish,
  listMyRecords,
  listMyTasks,
  listWishes,
} from '../../services/me';
import type { ExplorationRecord, UserTask, Wish } from '../../types/api';
import { formatDateTime } from '../../utils/format';

type FavoriteView = {
  taskId: string;
  title: string;
  summary: string;
};

type WishView = Wish & {
  completedText: string;
  statusText: string;
};

type RecordView = ExplorationRecord & {
  createdText: string;
  visibilityText: string;
};

Page({
  data: {
    loading: true,
    error: '',
    busy: false,
    displayName: '未登录',
    role: '',
    favorites: [] as FavoriteView[],
    wishes: [] as WishView[],
    records: [] as RecordView[],
    wishDraft: '',
  },

  onShow() {
    void this.loadProfile();
  },

  async loadProfile() {
    this.setData({ loading: true, error: '' });
    try {
      const app = getApp<IAppOption>();
      await app.ensureSession();
      const user = app.globalData.user;

      const [favRes, wishRes, recordRes] = await Promise.all([
        listMyTasks({ favorite: true, page: 1, pageSize: 20 }),
        listWishes(1, 20),
        listMyRecords(1, 20),
      ]);

      this.setData({
        loading: false,
        displayName: user?.displayName || '探索者',
        role: user?.role || 'USER',
        favorites: favRes.data.map((item: UserTask) => ({
          taskId: item.taskId,
          title: item.task?.title || '任务',
          summary: item.task?.summary || '',
        })),
        wishes: wishRes.data.map((item) => ({
          ...item,
          completedText: item.completedAt
            ? formatDateTime(item.completedAt)
            : '',
          statusText: item.completedAt ? '已完成' : '进行中',
        })),
        records: recordRes.data.map((item) => ({
          ...item,
          createdText: formatDateTime(item.createdAt),
          visibilityText: item.visibility === 'PUBLIC' ? '公开' : '私密',
        })),
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: getErrorMessage(error, '加载个人页失败'),
      });
    }
  },

  onRetry() {
    void this.loadProfile();
  },

  onOpenTask(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id) {
      return;
    }
    wx.navigateTo({ url: `/pages/task-detail/index?id=${id}` });
  },

  onWishInput(event: WechatMiniprogram.Input) {
    this.setData({ wishDraft: event.detail.value });
  },

  async onCreateWish() {
    const title = this.data.wishDraft.trim();
    if (!title || this.data.busy) {
      return;
    }
    this.setData({ busy: true });
    try {
      await createWish({ title });
      this.setData({ wishDraft: '' });
      wx.showToast({ title: '已添加愿望', icon: 'success' });
      await this.loadProfile();
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '添加失败'),
        icon: 'none',
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  async onCompleteWish(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id || this.data.busy) {
      return;
    }
    this.setData({ busy: true });
    try {
      await completeWish(id);
      wx.showToast({ title: '愿望已完成', icon: 'success' });
      await this.loadProfile();
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '操作失败'),
        icon: 'none',
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  async onDeleteWish(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id || this.data.busy) {
      return;
    }
    this.setData({ busy: true });
    try {
      await deleteWish(id);
      wx.showToast({ title: '已删除', icon: 'success' });
      await this.loadProfile();
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '删除失败'),
        icon: 'none',
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  async onDeleteRecord(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    if (!id || this.data.busy) {
      return;
    }
    this.setData({ busy: true });
    try {
      await deleteRecord(id);
      wx.showToast({ title: '回忆已删除', icon: 'success' });
      await this.loadProfile();
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '删除失败'),
        icon: 'none',
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  async onRelogin() {
    this.setData({ busy: true });
    try {
      await ensureLogin(true);
      wx.showToast({ title: '已重新登录', icon: 'success' });
      await this.loadProfile();
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '登录失败'),
        icon: 'none',
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  async onLogout() {
    this.setData({ busy: true });
    try {
      await logout();
      wx.showToast({ title: '已退出', icon: 'none' });
      this.setData({
        displayName: '未登录',
        favorites: [],
        wishes: [],
        records: [],
      });
    } finally {
      this.setData({ busy: false });
    }
  },

  onDeleteAccount() {
    if (this.data.busy) {
      return;
    }
    wx.showModal({
      title: '注销账号',
      content:
        '将永久删除你的探索记录、愿望与登录态，且不可恢复。确定继续吗？',
      confirmText: '确认注销',
      confirmColor: '#c0392b',
      success: (res) => {
        if (res.confirm) {
          void this.deleteAccountConfirmed();
        }
      },
    });
  },

  async deleteAccountConfirmed() {
    this.setData({ busy: true });
    try {
      await deleteAccount();
      clearToken();
      clearCachedUser();
      const app = getApp<IAppOption>();
      app.globalData.user = null;
      app.globalData.loginReady = null;
      this.setData({
        displayName: '未登录',
        role: '',
        favorites: [],
        wishes: [],
        records: [],
      });
      wx.showToast({ title: '账号已注销', icon: 'none' });
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '注销失败'),
        icon: 'none',
      });
    } finally {
      this.setData({ busy: false });
    }
  },
});
