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
RUN mkdir -p data/yellow_sessions data/output data/inclusion_proofs

# Copy data files if they exist
COPY backend/data ./data/ 2>/dev/null || true

# Copy circuits build artifacts (pre-compiled locally)
COPY backend/circuits/build ./circuits/build/ 2>/dev/null || true

# Verify circuit artifacts exist (warning only, don't fail build)
RUN test -f circuits/build/solvency_final.zkey && \
    test -f circuits/build/solvency_js/solvency.wasm && \
    test -f circuits/build/verification_key.json && \
    echo "✓ ZK circuit artifacts found" || \
    echo "⚠ WARNING: ZK circuit artifacts not found - proof generation will not work"

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
