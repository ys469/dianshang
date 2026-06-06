FROM node:22-alpine AS builder

WORKDIR /app

COPY . .

RUN npm ci

ARG VITE_API_BASE_URL=https://api.example.com
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build:admin

FROM nginx:1.27-alpine

COPY deploy/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 80
