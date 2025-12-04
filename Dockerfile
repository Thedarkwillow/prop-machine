FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (including dev) for build
COPY package*.json ./
RUN npm install --include=dev

# Copy source
COPY . .

# Build client (and any other build steps wired to `npm run build`)
RUN npm run build


FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev

# Copy built app and source (without node_modules from builder)
COPY --from=builder /app .

EXPOSE 8080

CMD ["npm", "start"]

