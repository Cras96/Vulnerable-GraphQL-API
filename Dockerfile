FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY src ./src

ENV NODE_ENV=production
ENV PORT=4000
ENV TEST_MODE=PENTEST_REALISTIC

EXPOSE 4000

USER node

CMD ["node", "src/server.js"]
