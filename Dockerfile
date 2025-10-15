# Use Node.js Alpine image for smaller size and faster downloads
FROM node:20.11.0-alpine

# Install basic build tools needed for native dependencies
RUN apk add --no-cache python3 make g++

# Set the working directory
WORKDIR /app

# Copy package manifests for layer caching
COPY package.json ./
COPY packages/ ./packages/

# Debug: Show what we're working with
RUN echo "=== DEBUG INFO ===" && \
    echo "Node version: $(node --version)" && \
    echo "NPM version: $(npm --version)" && \
    echo "Current directory: $(pwd)" && \
    echo "Files in current directory:" && \
    ls -la && \
    echo "Package.json exists: $(test -f package.json && echo 'YES' || echo 'NO')" && \
    echo "Package-lock.json exists: $(test -f package-lock.json && echo 'YES' || echo 'NO')" && \
    echo "Packages directory contents:" && \
    ls -la packages/ && \
    echo "=== END DEBUG INFO ==="

# Configure npm for more reliable installs - include optional deps for Rollup
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set audit false && \
    npm config set fund false && \
    echo "Starting npm install (including optional dependencies for Rollup)..." && \
    npm install --verbose

# Copy the rest of the application source code
COPY . .

# Build the entire project
RUN npm run build --workspaces --if-present

# Expose the application port
EXPOSE 8090

# Command to run the web application
CMD ["npm", "run", "web:dev"]
