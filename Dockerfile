FROM node:22-alpine

# ffmpeg + python + yt-dlp (pip pour compatibilité ARM/x86)
RUN apk add --no-cache ffmpeg python3 py3-pip make g++ git docker-cli \
    && pip install --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && rm -rf /root/.npm

COPY . .

# Permissions : user node (UID 1000, existe dans node:22-alpine)
RUN (addgroup -g 999 -S docker 2>/dev/null || true) \
    && (addgroup node docker 2>/dev/null || true) \
    && chown -R node:node /app \
    && git config --system --add safe.directory '*'
USER node

EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3050), r => { if (r.statusCode !== 200) throw new Error(); })"

CMD ["node", "index.js"]
