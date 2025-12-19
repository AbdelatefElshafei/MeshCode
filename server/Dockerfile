# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Copy shared module
# Note: In Docker context, we need to handle the shared folder. 
# We will assume the build context is the root, or we handle this in docker-compose.
# For this specific Dockerfile, we'll assume it's built from the root context or shared is copied in.
# A common pattern for monorepos without workspaces in Docker is to copy the specific folder.
# However, since 'shared' is outside 'server', we need to be careful with context.
# BEST PRACTICE: Build from root.
# We will adjust the COPY paths assuming the context is the project root.

# Actually, to keep it simple and standard, let's assume this Dockerfile is inside /server
# and we will use the docker-compose 'context: .' (root) to allow accessing ../shared.

# Re-strategy: 
# The Dockerfile will be placed in server/Dockerfile.
# But the build context MUST be the project root.
# So COPY paths will be relative to root.

COPY server/package*.json ./server/
COPY shared/ ./shared/

WORKDIR /app/server
RUN npm install

COPY server/ ./

# Expose port
EXPOSE 3001

# Start command
CMD ["npm", "start"]
