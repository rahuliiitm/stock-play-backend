# syntax=docker/dockerfile:1
FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm i --omit=dev
COPY . .
RUN npm run build || true
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
