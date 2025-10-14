# Build stage
FROM node:20.11.0-alpine AS builder

# Install build tools needed for native dependencies
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package manifests first for better layer caching
COPY package.json ./
COPY packages/ ./packages/

# Install all dependencies (including dev dependencies needed for build)
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set audit false && \
    npm config set fund false && \
    npm install --verbose

# Copy source code
COPY . .

# Build the project
RUN npm run build --workspaces --if-present

# Production stage - much smaller final image
FROM node:20.11.0-alpine AS production

WORKDIR /app

# Copy package files
COPY package.json ./
COPY packages/*/package.json ./packages/

# Install only production dependencies
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set audit false && \
    npm config set fund false && \
    npm install --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/packages/web/dist ./packages/web/dist
COPY --from=builder /app/packages/common/dist ./packages/common/dist
COPY --from=builder /app/packages/web/src/server ./packages/web/src/server

# Expose the application port
EXPOSE 8090

# Command to run the web application
CMD ["npm", "run", "web:dev"]
