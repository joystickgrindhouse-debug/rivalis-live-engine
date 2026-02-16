FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY live-server/package.json package.json
COPY live-server/package-lock.json* package-lock.json* ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY live-server/ ./

# Create config directory if needed
RUN mkdir -p config

# Copy exercise reference files
COPY *.json ./

# Expose port
EXPOSE 8080

# Start server
CMD ["node", "server.js"]
