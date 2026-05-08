FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/web/package.json apps/web/
COPY packages/ai/package.json packages/ai/
COPY packages/database/package.json packages/database/
COPY apps/api/package.json apps/api/
RUN npm install --no-audit --no-fund

FROM base AS build
ENV NEXT_PUBLIC_API_URL=http://localhost:4000
ENV NEXT_PUBLIC_WS_URL=ws://localhost:4000
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w @food/web

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/web ./apps/web
COPY --from=build /app/packages ./packages
COPY --from=build /app/package.json ./package.json
EXPOSE 3000
WORKDIR /app/apps/web
CMD ["npm", "run", "start"]
