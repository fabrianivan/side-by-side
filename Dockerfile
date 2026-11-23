# Dockerfile — Side by Side ("Better together.")
FROM node:22-alpine AS base
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma Client & Build Frontend Production Bundle
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0
EXPOSE 3001

# Initialize database, ensure reference clinical catalog is seeded, and run unified production server
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npm start"]
