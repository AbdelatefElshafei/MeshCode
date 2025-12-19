FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY worker/package*.json ./worker/
COPY shared/ ./shared/

WORKDIR /app/worker
RUN npm install

# Copy source code
COPY worker/ ./

# Expose port (default 4001, but can be overridden)
EXPOSE 4001

# Start command (Port will be passed via CMD or entrypoint)
# We use a shell form to allow expansion if needed, but array form is better.
# We'll expect the container orchestrator to pass the port or use an ENV var wrapper.
# The current index.js expects `node index.js <PORT>`.
# Let's make a small wrapper script or just use CMD.
CMD ["node", "index.js", "4001"]
