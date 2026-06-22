FROM oven/bun:1.2.5 AS base
RUN curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared && \
    chmod +x /usr/local/bin/cloudflared
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production --ignore-scripts

FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun x tsc --noEmit

FROM oven/bun:1.2.5 AS web-build
WORKDIR /usr/src/app/web
COPY web/package.json web/bun.lock ./
RUN bun install --frozen-lockfile
COPY web/ .
RUN bun run build

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
RUN mkdir -p /usr/src/app/data /usr/src/app/drizzle
COPY --from=prerelease /usr/src/app/src ./src
COPY --from=prerelease /usr/src/app/package.json .
COPY --from=prerelease /usr/src/app/tsconfig.json .
COPY --from=prerelease /usr/src/app/drizzle ./drizzle
COPY --from=web-build /usr/src/app/web/build ./web/build

ENTRYPOINT [ "bun", "start" ]
