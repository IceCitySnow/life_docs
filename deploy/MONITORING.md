# 日志与错误监控（Phase 7）

第一版不引入独立 APM；依赖结构化应用日志 + 健康检查。

## 1. 已有信号

| 信号 | 来源 | 用途 |
| --- | --- | --- |
| `GET /api/v1/health` | HealthModule | 存活与数据库连通 |
| `X-Request-Id` / `error.requestId` | 请求中间件 / 异常过滤器 | 串联单次请求 |
| HTTP 访问日志 | `RequestLoggingMiddleware` | 方法、脱敏路径、状态码、耗时 |
| 错误日志 | `AllExceptionsFilter` | 服务端堆栈（不对客户端暴露） |

## 2. 告警建议（云主机 / 容器）

- health 连续失败 ≥ 3 次 → 通知
- 5xx 比例超过阈值（如 5 分钟内 > 2%）→ 通知
- 数据库连接错误关键词（`P1001`、`ECONNREFUSED`）→ 通知
- 磁盘 / 备份失败 → 通知

可用任意进程监控（systemd、Docker health、UptimeRobot、云监控）轮询 health。

## 3. 禁止写入日志的内容

- Bearer 完整令牌、微信 `code`、`AppSecret`、数据库密码
- 用户回忆全文（普通 info 日志）
- 连接串与内部文件路径（错误响应已屏蔽）

## 4. 排障顺序

1. `curl https://api.example.com/api/v1/health`
2. 用 `requestId` 在应用日志中定位
3. 检查最近迁移 / 备份 / 证书过期
4. 必要时按 `09-deployment-operations.md` 回滚
