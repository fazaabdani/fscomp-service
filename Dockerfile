FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate && pnpm install --frozen-lockfile
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable && corepack prepare pnpm@11.7.0 --activate && pnpm prisma generate && pnpm build
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 TZ=Asia/Jakarta
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
EXPOSE 3000
CMD ["sh","-c","./node_modules/.bin/prisma db push --skip-generate && npm run start -- -H 0.0.0.0"]
