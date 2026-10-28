# =============================================================================
# 前端静态站点镜像（CI 与镜像发布用的唯一来源）
#
# 与 docker/latest/Dockerfile.* 的区别：
#   那套是「多镜像链」（assets / nginx / standalone(Go) / static(lipanski)），
#   并且 Dockerfile.base 会去 GitHub 下载 main 分支的 zip 再构建 ——
#   也就是说它构建出来的内容与当前提交无关，PR 里跑毫无意义。
#   这里改为「用当前工作区的源码构建」，构建结果 == 当前 commit，
#   CI 与 Build Images 都基于本文件。
#
# 用法：
#   docker build -t vue_tuiwen:dev .
#   docker run --rm -p 8080:80 vue_tuiwen:dev
# =============================================================================
# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1) 构建阶段：装依赖 -> 类型检查 + 打包
# ---------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# 只先拷贝依赖清单：依赖不变时这一层可命中缓存，改源码不会重装 node_modules
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 再拷贝源码（node_modules / dist 由 .dockerignore 排除）
COPY . .

# 构建号注入产物，便于线上排查「当前跑的是哪个提交」
ARG APP_BUILD=dev
ENV VITE_APP_BUILD=${APP_BUILD}

# npm run build = vue-tsc 类型检查 + vite build；
# 额外复制 404.html：SPA 深链（/pages/xxx）刷新时由它兜底，等价于 Cloudflare Pages 的行为
RUN npm run build && cp dist/index.html dist/404.html

# ---------------------------------------------------------------------------
# 2) 运行阶段：nginx 托管静态文件
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

LABEL org.opencontainers.image.title="vue_tuiwen"
LABEL org.opencontainers.image.description="推文 H5 静态站点"

# 复用仓库里已有的站点配置（try_files 回退到 index.html，SPA 刷新不 404）
COPY docker/latest/server/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 健康检查：探到首页即可（容器内没有 curl，用 busybox wget）
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q --spider http://127.0.0.1/ || exit 1
