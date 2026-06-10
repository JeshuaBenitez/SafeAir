FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (npm install para evitar conflictos de lock)
RUN npm install

# Copy TypeScript config and source
COPY tsconfig.json ./
COPY src ./src

# Also copy public folder (for debug assets)
COPY src/public ./src/public

COPY scripts ./scripts

# Build TypeScript to JavaScript
RUN npm run build

# Production stage: minimal footprint
FROM node:20-alpine

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Copy compiled JavaScript from build stage
COPY --from=build /app/dist ./dist

# Copy static debug assets (public folder)
COPY --from=build /app/src/public ./public

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const req=require('http').get('http://127.0.0.1:3000/health', r=>{r.resume(); process.exit(r.statusCode===200?0:1)}); req.on('error',()=>process.exit(1)); req.setTimeout(2000,()=>{req.destroy(); process.exit(1);});"

EXPOSE 3000

CMD ["node", "dist/index.js"]
