FROM node:24-alpine AS dependencies
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/attendance/package.json apps/attendance/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile --filter @stackbuild/attendance...

FROM dependencies AS build
COPY packages ./packages
COPY apps/attendance ./apps/attendance
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm --filter @stackbuild/attendance build

FROM nginx:alpine AS runtime
COPY docker/nginx-spa.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/attendance/dist /usr/share/nginx/html
EXPOSE 8080
