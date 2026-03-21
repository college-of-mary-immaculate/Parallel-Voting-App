FROM node:20-alpine

# ----------------------------
# 1. Build frontend
# ----------------------------
WORKDIR /app/frontend

# Copy frontend package.json first (for caching)
COPY frontend/package*.json ./

# Install frontend dependencies
RUN npm ci --include=dev
RUN npm install terser

# Copy the rest of the frontend source code
COPY frontend/ ./

# Build frontend
RUN npx vite build

# ----------------------------
# 2. Setup backend
# ----------------------------
WORKDIR /app

# Copy backend source and root package.json
COPY backend/ ./backend
COPY package*.json ./

# Install backend dependencies
RUN npm ci --omit=dev

# Create logs directory
RUN mkdir -p logs

# Expose ports
EXPOSE 3000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start backend
CMD ["npm", "run", "dev"]