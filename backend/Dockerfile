FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace files
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy backend package
COPY backend/package.json ./backend/

# Copy circuits package for snarkjs dependency
COPY circuits/package.json ./circuits/

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy backend source code
COPY backend ./backend

# Create data directories
RUN mkdir -p data/yellow_sessions data/output

# Copy data files if they exist
COPY data ./data

# Copy pre-compiled ZK circuits (wasm, zkey, verification_key)
# These MUST be compiled locally before Docker build
COPY circuits ./circuits

# Verify circuit artifacts exist (fail fast if missing)
RUN test -f circuits/build/solvency_final.zkey && \
    test -f circuits/build/solvency_js/solvency.wasm && \
    test -f circuits/build/verification_key.json || \
    (echo "ERROR: Pre-compiled ZK circuits not found. Run 'cd circuits && bash scripts/setup.sh' first." && exit 1)

# Set working directory to backend
WORKDIR /app/backend

# Expose port (Railway will override with its own PORT)
EXPOSE 3001

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Health check using 0.0.0.0 and PORT variable with longer start period
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://0.0.0.0:${PORT}/health || exit 1

# Start the backend
CMD ["pnpm", "start"]
