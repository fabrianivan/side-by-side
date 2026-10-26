# Dockerfile — Side by Side ("Better together.")
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client & Build Frontend
RUN npx prisma generate && npm run build

EXPOSE 3001 5173

# Jalankan setup database (SQLite/PostgreSQL) dan server
CMD ["npm", "run", "dev"]
