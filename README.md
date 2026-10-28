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
| `build-images.yml` | push main、develop、tag `v*` | 用仓库根目录的 `Dockerfile`（node 构建 → nginx 托管）打镜像，推送到 Docker Hub / 阿里云 ACR |
| `deploy-cloudflare-pages.yml` | push main | 构建 H5 并发布到 Cloudflare Pages（Direct Upload） |

镜像与静态托管都从**当前提交的源码**构建；`docker/latest/Dockerfile.*` 那套多镜像链会去
GitHub 下载 main 分支的 zip，构建产物与提交无关，因此不再被工作流使用。

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

Docker Hub 的 access token 只有读权限。`docker login` 只验证身份，所以这一步会成功，
到 `docker push` 才报这个错。去 Docker Hub → Account settings → Personal access tokens
重建一个 **Read & Write** 的 token，更新 `DOCKERHUB_TOKEN`（或 `DOCKER_PASSWORD`）。

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
