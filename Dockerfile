FROM node:18-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# uploads/ must exist and be writable
RUN mkdir -p uploads

EXPOSE 3000

CMD ["node", "app.js"]
