# Use Ubuntu as the base image
FROM ubuntu:22.04

# Avoid prompts from apt
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies for nvm
RUN apt-get update && apt-get install -y curl build-essential libssl-dev && rm -rf /var/lib/apt/lists/*

# Install nvm
ENV NVM_DIR /root/.nvm
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Install Node.js and npm using nvm
ENV NODE_VERSION 20.11.0
# Activate nvm and install node
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION} && nvm use --delete-prefix ${NODE_VERSION}

# Add node and npm to the PATH for subsequent commands
ENV PATH $NVM_DIR/versions/node/v${NODE_VERSION}/bin:$PATH

# Set the working directory
WORKDIR /app

# Copy package manifests for layer caching
COPY package.json package-lock.json ./
COPY packages/ ./packages/

# Install all dependencies
RUN npm install

# Copy the rest of the application source code
COPY . .

# Build the entire project
#RUN npm run build
RUN npm run build --workspaces --if-present

# Expose the application port
EXPOSE 8090

# Command to run the web application
CMD ["npm", "run", "web", "--workspaces", "--if-present"]
