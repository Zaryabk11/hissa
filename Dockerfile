FROM node:24-slim
WORKDIR /app
# Only the backend workspace is installed; frontend/package.json is needed so the lockfile resolves.
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci -w backend
COPY backend backend
RUN npm run build -w backend
ENV NODE_ENV=production
EXPOSE 3000
CMD ["npm", "start", "-w", "backend"]
