FROM node:22-alpine

# ffmpeg + python + yt-dlp (pip pour compatibilité ARM/x86)
RUN apk add --no-cache ffmpeg python3 py3-pip make g++ \
    && pip install --break-system-packages yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && rm -rf /root/.npm

COPY . .

# Utilisateur non-root + permissions
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 \
    && chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3050

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3050), r => { if (r.statusCode !== 200) throw new Error(); })"

CMD ["node", "index.js"]
