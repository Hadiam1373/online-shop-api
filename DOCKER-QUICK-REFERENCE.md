# Docker Quick Reference

## Common Commands

### Starting Services

```bash
# Development (with hot reload)
docker-compose up

# Development with rebuild
docker-compose up --build

# Production
docker-compose -f docker-compose.prod.yml up -d

# Detached mode
docker-compose up -d
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop specific service
docker-compose stop app
```

### Viewing Logs

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs app

# Follow logs
docker-compose logs -f app

# Last 100 lines
docker-compose logs --tail=100 app
```

### Database Operations

```bash
# Run migrations
docker-compose exec app npm run db:migrate

# Generate Prisma client
docker-compose exec app npm run db:generate

# Seed database
docker-compose exec app npm run db:seed

# Access PostgreSQL
docker-compose exec postgres psql -U admin -d shopdb

# Backup database
docker-compose exec postgres pg_dump -U admin shopdb > backup.sql

# Restore database
docker-compose exec -T postgres psql -U admin shopdb < backup.sql
```

### Redis Operations

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# With password
docker-compose exec redis redis-cli -a redis_password

# Check memory usage
docker-compose exec redis redis-cli info memory
```

### Container Management

```bash
# List containers
docker-compose ps

# Execute command in container
docker-compose exec app sh

# View service details
docker-compose config

# Validate compose file
docker-compose config --quiet

# Restart services
docker-compose restart

# Rebuild images
docker-compose build

# Rebuild specific service
docker-compose build app
```

### Debugging

```bash
# View container logs
docker-compose logs -f app

# Access container shell
docker-compose exec app sh

# Check container resource usage
docker stats

# Inspect network
docker network ls
docker network inspect online-shop_shop_network

# Check volumes
docker volume ls
docker volume inspect online-shop_postgres_data
```

### Cleanup

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune

# Remove everything including volumes
docker system prune -a --volumes
```

## Docker Compose Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development configuration |
| `docker-compose.override.yml` | Development overrides (auto-loaded) |
| `docker-compose.prod.yml` | Production configuration |
| `.dockerignore` | Files to exclude from build context |

## Environment Files

| File | Purpose |
|------|---------|
| `.env` | Development environment variables |
| `.env.docker` | Docker-specific variables |
| `.env.example` | Template for environment variables |
| `.env.prod` | Production environment variables (create manually) |

## Dockerfiles

| File | Purpose |
|------|---------|
| `Dockerfile` | Development image (with nodemon) |
| `Dockerfile.prod` | Production image (optimized) |

## Service Details

### PostgreSQL
- **Image**: postgres:16-alpine
- **Port**: 5432
- **User**: admin
- **Password**: 123456
- **Database**: shopdb
- **Volume**: postgres_data

### Redis
- **Image**: redis:7-alpine
- **Port**: 6379
- **Volume**: redis_data

### Node.js App
- **Port**: 5000
- **Volumes**: 
  - `.:/app` (source code)
  - `/app/node_modules` (dependencies)

## Troubleshooting

### Port Already in Use
```bash
# Find process using port
lsof -i :5000
# Kill process
kill -9 <PID>
```

### Permission Denied
```bash
# Run Docker commands without sudo (Linux)
sudo usermod -aG docker $USER
newgrp docker
```

### Database Connection Failed
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify service is running
docker-compose ps postgres

# Test connection
docker-compose exec postgres pg_isready -U admin
```

### Out of Memory
```bash
# Check Docker memory usage
docker stats

# Prune unused data
docker system prune -a
```

## Performance Tips

1. **Use named volumes** for persistent data
2. **Enable BuildKit**: `export DOCKER_BUILDKIT=1`
3. **Use Alpine images** for smaller footprint
4. **Optimize layer caching** in Dockerfile
5. **Exclude files with .dockerignore**
6. **Use depends_on** with healthchecks
7. **Set resource limits** for containers

## Security Tips

1. **Change default credentials** in production
2. **Use environment variables** for sensitive data
3. **Run containers as non-root user**
4. **Use secrets management** (Docker Secrets, Vault)
5. **Scan images** for vulnerabilities
6. **Keep images updated**
7. **Use private registries** for sensitive images

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Dockerfile Reference](https://docs.docker.com/engine/reference/builder/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Security Best Practices](https://docs.docker.com/engine/security/)