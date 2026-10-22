FROM node:22-bookworm-slim

# Chromium for Puppeteer PDF generation (use system build instead of Puppeteer's download)
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium fonts-liberation fonts-noto-color-emoji ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p logs public/uploads/profile public/uploads/documents \
  && chown -R node:node /app

USER node
EXPOSE 5000
CMD ["node", "app.js"]
