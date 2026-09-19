FROM node:24-alpine AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/stock/package.json apps/stock/package.json
COPY packages/management/package.json packages/management/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --filter @stackbuild/stock...

FROM dependencies AS build
COPY packages ./packages
COPY apps/attendance/src ./apps/attendance/src
COPY apps/stock ./apps/stock
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @stackbuild/stock build

FROM nginx:alpine AS runtime
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/stock/dist /usr/share/nginx/html
EXPOSE 8080
