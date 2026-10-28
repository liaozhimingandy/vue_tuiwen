# vue_tuiwen

[![CI](https://github.com/liaozhimingandy/vue_tuiwen/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/liaozhimingandy/vue_tuiwen/actions/workflows/ci.yml)
[![Build Images](https://github.com/liaozhimingandy/vue_tuiwen/actions/workflows/build-images.yml/badge.svg?branch=main)](https://github.com/liaozhimingandy/vue_tuiwen/actions/workflows/build-images.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

# 部署方案
使用cloudeflare的免费服务

1. cloudeflare设置

菜单: 构建 -> 计算 -> Workers和Pages -> 创建应用(选择旧方式) -> 选择 upload you static file

2. 获取生成cloudflare token

菜单:管理账户 -> 账户api令牌 -> 创建令牌 -> 范围选择pages -> 得到token

https://dash.cloudflare.com/【这里一串uuid就是Account‑ID】/home

3. github设置
在 仓库 → Settings → Secrets and variables → Actions → 新建 2 个存储库密钥

CLOUDFLARE_API_TOKEN

CLOUDFLARE_ACCOUNT_ID


## ticker文档链接
https://tombcato.github.io/smart-ticker/?lang=en

## 自动化（GitHub Actions）

| 工作流 | 触发 | 做什么 |
| --- | --- | --- |
| `ci.yml` | PR / push main、develop | 类型检查 + prettier 格式检查 + 构建产物校验，再构建一次镜像并真的启动容器，验证首页、静态资源与 SPA 深链刷新。**只验证，不推送** |
| `build-images.yml` | push main、develop、tag `v*` | 用仓库根目录的 `Dockerfile`（node 构建 → nginx 托管）打镜像，推送到 Docker Hub / 阿里云 ACR。分支构建**只推一个分支名标签** |
| `deploy-cloudflare-pages.yml` | push main | 构建 H5 并发布到 Cloudflare Pages（Direct Upload） |

镜像与静态托管都从**当前提交的源码**构建；`docker/latest/Dockerfile.*` 那套多镜像链会去
GitHub 下载 main 分支的 zip，构建产物与提交无关，因此不再被工作流使用。

镜像标签：一个分支恒定一个标签，不随提交数量累积（`<分支>-<sha>` 那种标签永不覆盖、也没人会拉，
只会把仓库堆满）：

| 触发 | 推哪些标签 |
| --- | --- |
| push `develop` | `develop` |
| push `main` | `main` |
| push tag `v1.2.3` | `1.2.3` + `1.2` + `latest` |
| 手动触发、未填版本号 | 当前分支名 |
| 手动触发、填了 `1.2.3` | `1.2.3` + `1.2` + `latest` |

其中 `1.2` / `latest` 是**浮动标签**，只是指向移动，数量恒定；其余都是一个标签对应一个来源。

可选密钥（没配就自动跳过对应步骤，不会让流水线变红）：

| 名称 | 用途 |
| --- | --- |
| `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` | 推送 Docker Hub（兼容旧名 `DOCKER_USERNAME` / `DOCKER_PASSWORD`） |
| `ALIYUN_REGISTRY` + `ALIYUN_NAMESPACE`(变量) + `ALIYUN_USERNAME` / `ALIYUN_PASSWORD` | 推送阿里云 ACR |
| `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | 发布到 Cloudflare Pages |

本地等价命令：

```bash
npm ci && npm run type-check && npm run format:check && npm run build
docker build -t vue_tuiwen:dev . && docker run --rm -p 8080:80 vue_tuiwen:dev
```

## 时间与时区

后端接口返回的时间一律是 **UTC**，形如 `2026-10-29T06:32:10.123456Z`；页面按**浏览器本地时区**渲染。
所有时间展示都走 `src/common/datetime.ts`，不要直接 `new Date(str)` 拼字符串：

| 函数 | 用途 |
| --- | --- |
| `formatSmartTime(v)` | 站内相对时间：刚刚 / N分钟前 / 今天14:32 / 昨天14:32 / 10月29日 14:32 |
| `formatDateTime(v, preset)` | 绝对时间，`preset`：`datetime` / `date` / `time` / `full` |
| `formatDateTimeWithZone(v)` | 带偏移，如 `2026-10-29 14:32 (UTC+08:00)`，用于需要明确口径的地方 |
| `parseServerTime(v)` | 只解析不格式化（排序、比较、二次计算用） |
| `getLocalTimeZone()` / `getLocalTimeZoneOffset()` | 当前展示时区名 / 偏移 |

几个必须知道的坑：

- **不带偏移的字符串按 UTC 解释**。ES 规范会把 `2026-10-29T06:32:10` 当本地时间解析，
  后端万一漏了 `Z`，东八区用户看到的时间就早 8 小时，且不会报错 —— 这里统一兜底成 UTC。
- **纯日期（`2026-10-29`）不做时区换算**。生日这类字段是"日历上的一天"，换算会推前一天。
- **6 位小数秒会截成 3 位**。Safari 解析 `.123456Z` 会直接返回 `Invalid Date`。
- 旧代码里的 `timestampFormat()` 保留为 `formatSmartTime` 的别名，行为一致。

## 故障排查

**作业 3 秒结束、一个步骤都没有，提示 `The job was not started because recent account payments have failed or your spending limit needs to be increased`**

不是工作流写错了，是账号层面的 Actions 额度问题（私有仓库按分钟计费，额度耗尽或付款失败时 GitHub 会在派发阶段直接把作业拦下，
所以作业页面上看不到任何日志、`runner` 也是空的）。两种解法：把仓库设为**公开**（标准 runner 免费、分钟数不限），
或到 Settings → Billing & plans 处理额度。判断方法：`Actions` 里该作业耗时只有几秒、Annotations 里有上面这段英文原文。

**`npm ci` 报 `package.json and package-lock.json are not in sync`**

改了 `package.json` 但没更新锁文件。本地执行 `npm install` 后把 `package-lock.json` 一起提交。

**镜像冒烟里 SPA 深链返回 404**

`docker/latest/server/default.conf` 的 `try_files $uri $uri/ /index.html` 被改动了。刷新 `/u/xxx/` 这类前端路由必须回退到
`index.html`，否则用户刷新页面就是白屏。

**`Build Images` 报 `unauthorized: access token has insufficient scopes`**

这句有两个成因，别急着去重建 token：

1. **推送前没登录**（更常见）。每个作业都在一台全新的 runner 上跑，`meta` 作业里的 `docker login`
   不会跨作业保留，漏了就变成匿名推送，registry 同样回这一句。先看失败步骤前面有没有登录步骤。
2. **token 只有读权限**。`docker login` 只验证身份，所以这一步会成功，到 `docker push` 才炸。
   去 Docker Hub → Account settings → Personal access tokens 重建一个 **Read & Write** 的 token，
   更新 `DOCKERHUB_TOKEN`（或 `DOCKER_PASSWORD`）。

判断当前是哪种：`meta` 作业会向 `auth.docker.io` 换一次带 push scope 的 token 并解出 `access[].actions`，
读得到 `push` 就说明凭据本身没问题，问题在登录环节。

**`Build Images` 报 `Error parsing reference: ":dev"` / `镜像名为空`**

镜像名拼出来是 `<DOCKER_USERNAME>/vue_tuiwen`，这串值里含 secret，而 GitHub **会丢弃
「值里可能含 secret」的 job output**（日志里 grep `Skip output` 能看到）。
所以镜像名不能跨作业传，只能在各作业内用 secrets 现算 —— 工作流已按这个方式实现，
如果又出现这个错，说明有人把镜像名重新放回了 `outputs`。

**`docker login` 报 `invalid character " " in host name`**

`ALIYUN_REGISTRY` 之类的 secret 末尾带了空格（从网页复制最常带）。工作流已对
registry / namespace / 用户名统一 trim，若仍报错请检查是否还有未 trim 的新 secret。

## 许可证

[MIT](LICENSE)
