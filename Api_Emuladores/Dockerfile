FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./

RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/public ./public

RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "const req=require('http').get('http://127.0.0.1:3000/health', r=>{r.resume(); process.exit(r.statusCode===200?0:1)}); req.on('error',()=>process.exit(1)); req.setTimeout(2000,()=>{req.destroy(); process.exit(1);});"

EXPOSE 3000

CMD ["node", "dist/index.js"]