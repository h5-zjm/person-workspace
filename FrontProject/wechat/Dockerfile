FROM node:22-alpine AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY FrontProject/wechat/package.json ./FrontProject/wechat/package.json

ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com
RUN pnpm config set registry https://registry.npmmirror.com \
      && pnpm install --frozen-lockfile --filter equity-trading-wechat...
COPY FrontProject/wechat ./FrontProject/wechat

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN pnpm --filter equity-trading-wechat build:h5

FROM nginx:alpine

COPY --from=build /app/FrontProject/wechat/dist/build/h5/ /usr/share/nginx/html/
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
