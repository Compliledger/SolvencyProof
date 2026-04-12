# SolvencyProof Backend - Railway Deployment
# This Dockerfile builds the backend API server with Algorand integration

FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy root package files
COPY package.json package-lock.json* ./

# Copy backend package.json
COPY backend/backend/package.json ./backend/backend/

# Copy algorand package.json (needed for dependencies)
COPY algorand/package.json ./algorand/

# Install backend dependencies
WORKDIR /app/backend/backend
RUN npm install --production

# Install algorand dependencies
WORKDIR /app/algorand
RUN npm install --production

# Go back to app root
WORKDIR /app

# Copy backend source code
COPY backend/backend ./backend/backend/

# Copy algorand client code (required by backend)
COPY algorand/client ./algorand/client/
COPY algorand/types ./algorand/types/

# Create data directories
RUN mkdir -p data/yellow_sessions data/output data/inclusion_proofs circuits/build

# Set working directory to backend
WORKDIR /app/backend/backend

# Expose port
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://0.0.0.0:${PORT}/health || exit 1

# Start the backend API server
CMD ["npm", "start"]
