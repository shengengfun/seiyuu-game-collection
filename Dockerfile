# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build

ARG RESOURCE_VERSION=""

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV RESOURCE_VERSION=$RESOURCE_VERSION
WORKDIR /workspace

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/host/package.json apps/host/package.json
COPY apps/server/package.json apps/server/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/game-sdk/package.json packages/game-sdk/package.json
# 12 个小游戏模块都是 pnpm workspace 成员，各自带 package.json。
# 模块是 git submodule，构建上下文必须带 --recurse-submodules 检出（见 .github/workflows/docker.yml）。
# 整目录拷进来会让模块代码变更时重跑 install，但用 cache mount 后代价可以接受，
# 好处是新增模块不用改 Dockerfile。
COPY modules ./modules

# Build-only dependencies stay in this disposable stage. Optional platform
# packages are required here by tools such as esbuild.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

COPY scripts scripts
COPY pow-wasm pow-wasm
COPY apps apps
COPY packages packages

# The deployed server tree contains production dependencies only and omits the
# optional SQLite driver. Only that tree is copied into the runtime image.
RUN pnpm build \
 && pnpm --filter server deploy --prod --no-optional --legacy /runtime/server

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runtime

ARG OCI_SOURCE=""
ARG OCI_REVISION=""
ARG OCI_VERSION=""

LABEL org.opencontainers.image.title="seiyuu-game-collection" \
      org.opencontainers.image.description="PostgreSQL-only seiyuu game collection server and web client" \
      org.opencontainers.image.source=$OCI_SOURCE \
      org.opencontainers.image.revision=$OCI_REVISION \
      org.opencontainers.image.version=$OCI_VERSION

ENV NODE_ENV=production \
    DB_CLIENT=pg \
    PORT=3000

WORKDIR /app

# 运行镜像里保持 server/ + client/ 的扁平布局，
# 与 apps/server 里 clientDist 的一个候选路径（../../client/dist）对应。
COPY --from=build --chown=nonroot:nonroot /runtime/server/node_modules ./server/node_modules
COPY --from=build --chown=nonroot:nonroot /workspace/apps/server/dist ./server/dist
COPY --from=build --chown=nonroot:nonroot /workspace/apps/host/dist ./client/dist

USER nonroot
EXPOSE 3000

CMD ["server/dist/index.js"]
