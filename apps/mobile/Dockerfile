FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/mobile/package.json apps/mobile/package.json

RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=https://api.example.com
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build:mobile

FROM nginx:1.27-alpine

COPY deploy/nginx/mobile.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/mobile/dist /usr/share/nginx/html

EXPOSE 80
