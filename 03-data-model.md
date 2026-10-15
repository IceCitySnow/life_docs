# 数据模型与数据库约束

## 1. 通用规范

-   主键使用 UUID。
-   业务表包含 `createdAt`；需要追踪修改的表包含 `updatedAt`。
-   数据库使用外键、唯一约束、必要的检查约束保护数据一致性。
-   时间戳统一存 UTC。
-   软删除只在有明确恢复或审计需求时使用；否则优先明确的删除行为。
-   Prisma schema 和迁移文件必须纳入版本管理。
-   任何生产数据库结构变更都通过迁移执行，禁止手工改库后不更新迁移。

## 2. 建议实体

### SchemaMeta（Phase 0 基线）

工程基线表，用于验证 Prisma 迁移链路；不承载产品业务数据。

- `id`：UUID
- `key`：唯一键
- `value`
- `createdAt`
- `updatedAt`

### User（Phase 1 起落地；微信登录在 Phase 2）

字段建议：

-   `id`
-   `wxOpenId`：微信用户标识，唯一；不得向客户端返回。
-   `displayName`：可选昵称
-   `avatarUrl`：可选头像
-   `role`：普通用户 / 管理员
-   `status`：正常 / 已停用 / 注销处理中等必要状态
-   `createdAt`
-   `updatedAt`

仅在业务确有需要时保存 unionId 等额外身份信息；避免收集无关个人资料。

### Category

-   `id`
-   `name`
-   `slug`：唯一、稳定的程序标识
-   `description`：可选
-   `coverImageUrl`：可选
-   `sortOrder`
-   `isActive`
-   `createdAt`
-   `updatedAt`

### Task

-   `id`
-   `categoryId`
-   `title`
-   `summary`
-   `instructions`
-   `coverImageUrl`：可选
-   `estimatedMinutes`：可选
-   `difficulty`：受控枚举
-   `budgetNote`：可选
-   `requirements`：可选
-   `alternatives`：可选
-   `reflectionPrompt`：可选
-   `tags`：第一版可使用 PostgreSQL
    字符串数组或独立标签表，择一并保持一致
-   `status`：DRAFT / PUBLISHED / ARCHIVED
-   `sortOrder`
-   `createdAt`
-   `updatedAt`

公开查询只返回 PUBLISHED
任务。已被用户完成的任务即使下架，历史记录仍需保留可读的任务快照或足够的引用信息。

### UserTask

表示用户与官方任务的关系，建议字段：

-   `id`
-   `userId`
-   `taskId`
-   `isFavorite`
-   `isWished`
-   `startedAt`：可选
-   `completedAt`：可选
-   `createdAt`
-   `updatedAt`

约束：`userId + taskId`
唯一。收藏、愿望和完成状态语义清晰；重复写操作幂等。若未来需要同一任务多次完成，需另建完成事件/记录表，不要直接复用单条状态关系。

### ExplorationRecord

-   `id`
-   `userId`
-   `taskId`：可选，支持关联官方任务
-   `customWishId`：可选，支持关联用户自定义愿望
-   `titleSnapshot`：用于保留完成时的标题或自定义体验标题
-   `reflectionText`：可选
-   `photoRefs`：可选；保存对象存储引用，不保存二进制
-   `visibility`：PRIVATE / PUBLIC
-   `moderationStatus`：VISIBLE / HIDDEN（管理员可隐藏公开内容）
-   `hiddenAt`：可选
-   `completedAt`
-   `createdAt`
-   `updatedAt`

约束：记录必须属于一个用户。`taskId` 与 `customWishId`
的关联规则需要明确：如果记录来自任务或愿望，二者最多只能有一个非空；也可在第一版将记录只关联官方任务，并在后续扩展自定义愿望。不得让客户端指定任意
`userId` 来归属记录。

### CustomWish

-   `id`
-   `userId`
-   `title`
-   `description`：可选
-   `categoryId`：可选
-   `status`：PENDING / COMPLETED / ARCHIVED
-   `completedAt`：可选
-   `createdAt`
-   `updatedAt`

### Like

-   `id`
-   `userId`
-   `recordId`
-   `createdAt`

约束：`userId + recordId`
唯一。禁止点赞自己的公开记录是否采用限制，可在业务规则中明确；建议第一版允许与否保持一致。

### RecordFavorite（仅当确实需要收藏他人的记录时启用）

-   `id`
-   `userId`
-   `recordId`
-   `createdAt`

约束：`userId + recordId` 唯一。与收藏官方任务的 `UserTask.isFavorite`
分开。

### Report

-   `id`
-   `reporterUserId`
-   `recordId` 或
    `taskId`（根据举报对象，明确只允许一种或设计统一举报目标）
-   `reason`：受控枚举
-   `details`：可选
-   `status`：PENDING / REVIEWED / RESOLVED / REJECTED
-   `createdAt`
-   `handledAt`：可选
-   `handledByUserId`：可选

## 3. 关键一致性要求

-   一个用户不能对同一任务产生重复 `UserTask`。
-   一个用户不能对同一记录重复点赞或重复收藏。
-   任务完成状态和回忆内容分离。
-   用户只能读取或修改自己有权访问的数据。
-   公开记录查询必须同时过滤 `visibility = PUBLIC` 和记录/用户可用状态。
-   删除用户时必须定义关联记录、点赞、收藏和上传文件的清理策略。
-   任务下架不级联删除用户历史记录。
-   写入完成状态和对应记录如需要原子一致，应使用数据库事务。
-   列表查询常用索引至少覆盖：任务发布状态与分类、用户 ID
    与创建时间、记录可见性与完成时间、点赞/收藏唯一关系。
