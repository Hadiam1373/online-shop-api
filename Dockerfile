# Development Dockerfile with all dependencies including devDependencies
FROM node:20-alpine

WORKDIR /app

# Install dumb-init, curl, bash, and OpenSSL 1.1 required by Prisma
RUN apk add --no-cache dumb-init curl bash openssl

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for development)
RUN npm install --verbose && npm cache clean --force

# Copy application code
COPY src ./src
COPY prisma ./prisma

# Generate Prisma client
RUN npx prisma generate

# Create a non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set permissions
RUN chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

# Run the application with nodemon for development
ENTRYPOINT ["dumb-init", "--"]
CMD ["npm", "run", "dev"]