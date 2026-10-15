# REST API 契约（第一版）

## 1. 通用约定

Base path：`/api/v1`

成功响应统一采用清晰结构，例如包含 `data`；列表响应还应包含
`pagination`。错误响应应包含稳定的业务错误码、可展示的消息和可选字段错误，不返回堆栈或数据库错误。

所有分页接口应校验
`page >= 1`、`1 <= pageSize <= 50`（上限可在实现时调整并保持一致）。

## 2. 健康检查

-   `GET /health`
-   不需要认证。
-   返回服务状态；生产环境不得暴露密钥、完整配置或数据库凭证。

## 3. 认证

-   `POST /auth/wechat`：使用微信临时 code
    换取或创建用户，并签发应用会话凭证。
-   `POST /auth/logout`：按选定的会话策略使当前会话失效；若采用短期无状态令牌，必须说明退出策略的真实限制。
-   `GET /auth/me`：返回当前登录用户的公开资料。

微信认证必须在服务端调用微信服务。开发环境可提供仅限开发配置启用的测试认证方式；生产环境必须彻底禁用测试认证入口。

## 4. 用户

-   `GET /users/me`：当前用户资料。
-   `PATCH /users/me`：更新允许修改的资料字段。
-   `DELETE /users/me`：注销账号——吊销会话并硬删除用户及级联个人数据（详见
    `docs/legal/ACCOUNT_DELETION.md`）。

客户端不能修改 `role`、微信身份标识或其他管理字段。

## 5. 分类与官方任务

-   `GET /categories`：返回启用分类。
-   `GET /tasks`：支持
    `categoryId`、`tag`、`difficulty`、`page`、`pageSize`。
-   `GET /tasks/:taskId`：返回已发布任务详情。
-   `GET /tasks/recommended`：第一版使用可解释的规则推荐，可基于排序、随机抽样或用户未完成任务；不得每次请求实时调用
    AI。
-   `POST /admin/tasks`：创建任务，仅管理员。
-   `PATCH /admin/tasks/:taskId`：更新任务，仅管理员。
-   `POST /admin/tasks/:taskId/publish`：发布任务，仅管理员。
-   `POST /admin/tasks/:taskId/archive`：下架任务，仅管理员。

公开任务接口不应返回草稿或下架任务。管理 API
必须同时校验认证身份和管理员角色。

## 6. 用户与官方任务关系

-   `GET /me/tasks`：当前用户的收藏、愿望或探索状态，可按状态过滤。
-   `PUT /me/tasks/:taskId/favorite`：收藏任务，重复调用幂等。
-   `DELETE /me/tasks/:taskId/favorite`：取消收藏。
-   `PUT /me/tasks/:taskId/wish`：加入愿望清单，重复调用幂等。
-   `DELETE /me/tasks/:taskId/wish`：从愿望清单移除。
-   `POST /me/tasks/:taskId/start`：开始探索，可重复调用而不覆盖首次开始时间，除非产品明确规定。
-   `POST /me/tasks/:taskId/complete`：完成任务，幂等；不要求回忆、照片或定位。

对不存在或不可见的任务，返回统一的 404 语义，避免泄露隐藏资源信息。

## 7. 探索记录

-   `POST /records`：创建可选回忆，可关联已完成任务；记录归属由认证用户确定。
-   `GET /records/me`：查询当前用户的记录。
-   `GET /records/:recordId`：仅所有者或符合公开规则的访问者可读。
-   `PATCH /records/:recordId`：所有者可修改允许字段，包括文字、照片引用与可见性。
-   `DELETE /records/:recordId`：所有者删除自己的记录。
-   `GET /atlas/me`：返回个人图鉴统计与已点亮任务列表。

不要允许客户端通过请求体提交 `userId`
来决定记录所有者。公开记录列表在社交阶段另行开放。

## 8. 用户自定义愿望

-   `POST /me/wishes`：创建自定义愿望。
-   `GET /me/wishes`：列表。
-   `PATCH /me/wishes/:wishId`：更新自己的愿望。
-   `DELETE /me/wishes/:wishId`：删除自己的愿望。
-   `POST /me/wishes/:wishId/complete`：标记完成；重复调用幂等。

## 9. 轻社交（Phase 6）

-   `GET /public/records`：分页查询公开记录（仅 `PUBLIC` + 未隐藏 + 作者 ACTIVE）。
-   `GET /public/records/:recordId`：读取公开记录；私密/隐藏统一 404。
-   `PUT /records/:recordId/like`：点赞公开记录，幂等。
-   `DELETE /records/:recordId/like`：取消点赞。
-   `PUT /records/:recordId/favorite`：收藏公开记录，幂等。
-   `DELETE /records/:recordId/favorite`：取消收藏。
-   `POST /reports`：举报公开记录或已发布任务（`recordId` / `taskId` 二选一）。
-   `GET /admin/reports`：管理员查询举报（可按 status 过滤）。
-   `PATCH /admin/reports/:reportId`：管理员处理举报；可选 `hideContent` 隐藏记录。

公开内容 API
必须在服务端过滤私密与隐藏内容。记录改为私密或被隐藏后，后续公开查询立即不可见。点赞/举报写接口带应用层限流。

## 10. API 验收

-   每个端点在 Swagger/OpenAPI 中有说明。
-   所有输入都经过 DTO 校验。
-   所有受保护端点有认证测试。
-   所有资源操作有越权测试。
-   写操作有重复请求、无效输入和资源不存在的测试。
-   返回状态码和错误码稳定、统一。
