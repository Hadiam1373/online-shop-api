# Docker Setup Guide

This document provides comprehensive instructions for setting up and running the E-commerce backend using Docker.

## Overview

The project uses Docker Compose to orchestrate three services:
- **Node.js Express App**: The main backend application
- **PostgreSQL**: Database service
- **Redis**: Cache and session service

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB of available RAM
- Port availability: 5000, 5432, 6379

## Quick Start (Development)

### 1. Build and Start Services

```bash
docker-compose up --build
```

This will:
- Build the Node.js application image
- Pull PostgreSQL and Redis images
- Create and start all containers
- Initialize the database

### 2. Verify Services

```bash
# Check running containers
docker-compose ps

# View logs
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis
```

### 3. Stop Services

```bash
docker-compose down

# Remove volumes as well
docker-compose down -v
```

## Configuration

### Environment Variables

Development environment is defined in `.env`:
```
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://admin:123456@postgres:5432/shopdb
REDIS_URL=redis://redis:6379
JWT_SECRET=supersecretkey
```

For custom values, create a `.env` file in the project root.

### Database Access

From host machine:
```bash
psql -h localhost -p 5432 -U admin -d shopdb

# When prompted for password, enter: 123456
```

From within Docker:
```bash
docker-compose exec postgres psql -U admin -d shopdb
```

### Redis Access

```bash
# From host
redis-cli -h localhost -p 6379

# From Docker
docker-compose exec redis redis-cli
```

## Development Workflow

### 1. Running the Development Server

```bash
docker-compose up
```

The app will:
- Start with hot-reload via nodemon
- Be accessible at `http://localhost:5000`
- Automatically restart on file changes (if volumes are mounted)

### 2. Database Migrations

```bash
# Run migrations
docker-compose exec app npm run db:migrate

# Generate Prisma client
docker-compose exec app npm run db:generate

# Seed database with sample data
docker-compose exec app npm run db:seed
```

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

### 4. Access Container Shell

```bash
docker-compose exec app sh
```

## Production Setup

### Build for Production

```bash
docker-compose -f docker-compose.prod.yml up --build
```

### Key Differences from Development

| Aspect | Development | Production |
|--------|-------------|-----------|
| Dockerfile | Dockerfile | Dockerfile.prod |
| Node Env | development | production |
| Hot Reload | Enabled | Disabled |
| npm command | npm run dev | npm start |
| Volumes | Mounted | Not mounted |
| Logging | Streamed | JSON-file driver |

### Environment Variables for Production

Create a `.env.prod` file:
```
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://admin:strong_password@postgres:5432/shopdb
REDIS_URL=redis://:strong_redis_password@redis:6379
JWT_SECRET=your_strong_jwt_secret
JWT_REFRESH_SECRET=your_strong_refresh_secret
POSTGRES_PASSWORD=strong_password
REDIS_PASSWORD=strong_redis_password
```

Then use:
```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

## Common Tasks

### View Database Tables

```bash
docker-compose exec postgres psql -U admin -d shopdb -c "\dt"
```

### Backup Database

```bash
docker-compose exec postgres pg_dump -U admin shopdb > backup.sql
```

### Restore Database

```bash
docker-compose exec -T postgres psql -U admin shopdb < backup.sql
```

### Rebuild a Specific Service

```bash
docker-compose up --build app
```

### Clear All Data and Start Fresh

```bash
docker-compose down -v
docker-compose up --build
```

### Run Database Seed

```bash
docker-compose exec app npm run db:seed
```

## Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :5000

# Kill the process
kill -9 <PID>

# Or use different ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify service is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U admin
```

### Redis Connection Issues

```bash
# Check Redis logs
docker-compose logs redis

# Test connection
docker-compose exec redis redis-cli ping
```

### Out of Memory

```bash
# Check Docker resource usage
docker stats

# Limit container memory
# Modify docker-compose.yml and add:
# deploy:
#   resources:
#     limits:
#       memory: 512M
```

### Volumes Not Updating

For Windows users with WSL2:
```bash
# Ensure volume mounting is properly configured
docker-compose down -v
docker system prune
docker-compose up --build
```

## Performance Optimization

### 1. Use Named Volumes

Already configured in `docker-compose.yml`:
- `postgres_data`: Persistent database storage
- `redis_data`: Persistent Redis data

### 2. Enable Docker BuildKit

```bash
export DOCKER_BUILDKIT=1
docker-compose up --build
```

### 3. Optimize Image Size

- Multi-stage builds are used in Dockerfile.prod
- Alpine Linux images are used for smaller footprint

### 4. Resource Limits

Add to docker-compose.yml services:
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

## Health Checks

All services have health checks configured:

```bash
# View health status
docker-compose ps

# Test manually
curl http://localhost:5000/api/health
```

## Security Considerations

### Development Notes
- Default credentials are used for ease of setup
- JWT secret is weak - change in production

### Production Recommendations
- Change default PostgreSQL credentials
- Use strong, randomly generated JWT secrets
- Enable Redis password protection
- Use environment variables for sensitive data
- Run containers with specific users (non-root)
- Use secrets management tools (Docker Secrets, Vault)
- Enable container resource limits
- Use a reverse proxy (Nginx) in front of the app
- Enable HTTPS/TLS

## Scaling

### Horizontal Scaling

To run multiple app instances:
```bash
docker-compose up --scale app=3
```

Use a load balancer (Nginx) to distribute traffic.

### Monitoring

Use tools like:
- Docker Dashboard
- Prometheus + Grafana
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Datadog
- New Relic

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Build Docker Image
  run: docker build -t shop-app:latest .

- name: Run Tests
  run: docker-compose -f docker-compose.test.yml up

- name: Push to Registry
  run: docker push your-registry/shop-app:latest
```

## References

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Node.js Docker Hub](https://hub.docker.com/_/node)