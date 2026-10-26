FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* values are compiled into the browser bundle at build time, so
# they are build arguments rather than runtime environment.
ARG NEXT_PUBLIC_API_URL=/api/v1
ARG NEXT_PUBLIC_GOOGLE_CLIENT_ID=
ARG NEXT_PUBLIC_MICROSOFT_CLIENT_ID=
ARG NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_GOOGLE_CLIENT_ID=$NEXT_PUBLIC_GOOGLE_CLIENT_ID \
    NEXT_PUBLIC_MICROSOFT_CLIENT_ID=$NEXT_PUBLIC_MICROSOFT_CLIENT_ID \
    NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=$NEXT_PUBLIC_MICROSOFT_REDIRECT_URI \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build


FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=build --chown=node:node /app/package.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/.next ./.next
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/next.config.ts ./

USER node
EXPOSE 3000
CMD ["npx", "next", "start", "--port", "3000"]
