# 热路径查询与索引对照（Phase 7）

本文件核对第一版关键查询是否被 Prisma schema 索引覆盖。变更 schema 后应同步更新。

| 热路径 | 典型过滤 / 排序 | 索引 |
| --- | --- | --- |
| 分类列表 | `isActive`, `sortOrder` | `Category(isActive, sortOrder)` |
| 任务列表 | `status + categoryId`, `status + sortOrder` | `Task(status, categoryId)`, `Task(status, sortOrder)` |
| 我的任务 | `userId + favorite/wish/completed` | `UserTask` 唯一与局部索引 |
| 我的回忆 | `userId + createdAt` | `ExplorationRecord(userId, createdAt)` |
| 公开动态 | `visibility + moderationStatus + completedAt` | `ExplorationRecord(visibility, moderationStatus, completedAt)` |
| 点赞/收藏 | `userId + recordId` 唯一 | `RecordLike` / `RecordFavorite` unique |
| 举报队列 | `status + createdAt` | `Report(status, createdAt)` |
| 会话鉴权 | `tokenHash` 唯一；过期清理 `expiresAt` | `AuthSession` |

## 手工抽查（可选）

在 PostgreSQL 上对公开列表执行：

```sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT id
FROM "ExplorationRecord"
WHERE visibility = 'PUBLIC'
  AND "moderationStatus" = 'VISIBLE'
ORDER BY "completedAt" DESC
LIMIT 20;
```

期望：走 `ExplorationRecord_visibility_moderationStatus_completedAt_idx` 或等价 Bitmap/Index Scan，避免全表 Seq Scan（数据量变大后）。
