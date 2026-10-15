import { getErrorMessage } from '../../services/api';
import {
  createReport,
  favoritePublicRecord,
  likePublicRecord,
  listPublicRecords,
  type PublicRecordCard,
} from '../../services/social';
import { formatDateTime } from '../../utils/format';

type ViewRecord = PublicRecordCard & {
  authorName: string;
  createdText: string;
  busy: boolean;
};

Page({
  data: {
    loading: true,
    error: '',
    empty: false,
    records: [] as ViewRecord[],
  },

  onShow() {
    void this.loadFeed();
  },

  async loadFeed() {
    this.setData({ loading: true, error: '' });
    try {
      const app = getApp<IAppOption>();
      await app.ensureSession();
      const res = await listPublicRecords(1, 30);
      const records: ViewRecord[] = res.data.map((item) => ({
        ...item,
        authorName: item.author.displayName || '探索者',
        createdText: formatDateTime(item.createdAt),
        busy: false,
      }));
      this.setData({
        loading: false,
        records,
        empty: records.length === 0,
      });
    } catch (error) {
      this.setData({
        loading: false,
        error: getErrorMessage(error, '加载公开动态失败'),
        records: [],
        empty: false,
      });
    }
  },

  onRetry() {
    void this.loadFeed();
  },

  updateRecord(recordId: string, patch: Partial<ViewRecord>) {
    const records = this.data.records.map((item) =>
      item.id === recordId ? { ...item, ...patch } : item,
    );
    this.setData({ records });
  },

  async onToggleLike(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    const current = this.data.records.find((item) => item.id === id);
    if (!id || !current || current.busy) {
      return;
    }
    const next = !current.likedByMe;
    this.updateRecord(id, {
      busy: true,
      likedByMe: next,
      likeCount: Math.max(0, current.likeCount + (next ? 1 : -1)),
    });
    try {
      await likePublicRecord(id, next);
    } catch (error) {
      this.updateRecord(id, {
        likedByMe: current.likedByMe,
        likeCount: current.likeCount,
      });
      wx.showToast({
        title: getErrorMessage(error, '操作失败'),
        icon: 'none',
      });
    } finally {
      this.updateRecord(id, { busy: false });
    }
  },

  async onToggleFavorite(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    const current = this.data.records.find((item) => item.id === id);
    if (!id || !current || current.busy) {
      return;
    }
    const next = !current.favoritedByMe;
    this.updateRecord(id, {
      busy: true,
      favoritedByMe: next,
      favoriteCount: Math.max(0, current.favoriteCount + (next ? 1 : -1)),
    });
    try {
      await favoritePublicRecord(id, next);
    } catch (error) {
      this.updateRecord(id, {
        favoritedByMe: current.favoritedByMe,
        favoriteCount: current.favoriteCount,
      });
      wx.showToast({
        title: getErrorMessage(error, '操作失败'),
        icon: 'none',
      });
    } finally {
      this.updateRecord(id, { busy: false });
    }
  },

  async onReport(event: WechatMiniprogram.TouchEvent) {
    const id = String(event.currentTarget.dataset.id || '');
    const current = this.data.records.find((item) => item.id === id);
    if (!id || !current || current.busy) {
      return;
    }
    this.updateRecord(id, { busy: true });
    try {
      await createReport({
        recordId: id,
        reason: 'OTHER',
        details: '用户从小程序发现页举报',
      });
      wx.showToast({ title: '已提交举报', icon: 'success' });
    } catch (error) {
      wx.showToast({
        title: getErrorMessage(error, '举报失败'),
        icon: 'none',
      });
    } finally {
      this.updateRecord(id, { busy: false });
    }
  },
});
