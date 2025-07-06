# LI.FI Fee Collector Backend

This directory contains the backend service for the LI.FI Fee Collector Event Scraper system. For a complete overview of the entire project, see the [main README.md](../README.md).

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Docker** and **Docker Compose**
- **MongoDB** 5.0+ (or use Docker)
- **Redis** (or use Docker)

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB and Redis**
   ```bash
   docker-compose up -d mongodb redis
   ```

4. **Run the application**
   ```bash
   npm run dev
   ```

5. **Verify the installation**
   ```bash
   curl http://localhost:3000/health
   ```

### Docker Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app

# Rebuild and restart
docker-compose down
docker-compose build --no-cache app
docker-compose up -d

# Stop all services
docker-compose down
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Application
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/fee_collector

# Redis
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=30

# Scraper Settings
DEFAULT_SCRAPER_INTERVAL=30000
DEFAULT_STARTING_BLOCK=70000000
DEFAULT_MAX_BLOCK_RANGE=1000

# API Settings
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=http://localhost:3000
HELMET_ENABLED=true

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=logs/app.log
```

## 📚 API Documentation

Once the server is running, access the interactive Swagger documentation at:
**🌐 http://localhost:3000/api-docs**

### Key API Endpoints

#### Events Endpoints
- `GET /api/v1/events/integrator/{integrator}` - Query events by integrator address
- `GET /api/v1/events/chain/{chainId}` - Query events for a specific chain  
- `GET /api/v1/events` - Query events with advanced filters

#### Chain Management Endpoints
- `GET /api/v1/chains/status` - Get status of all chains
- `GET /api/v1/chains/{chainId}/status` - Get status of specific chain
- `POST /api/v1/chains` - Add and start a new chain worker
- `PUT /api/v1/chains/{chainId}/start` - Start a specific chain worker
- `PUT /api/v1/chains/{chainId}/stop` - Stop a chain worker
- `PUT /api/v1/chains/{chainId}/update` - Update chain configuration
- `DELETE /api/v1/chains/{chainId}` - Delete chain configuration

#### Health Endpoints
- `GET /health` - Overall system health
- `GET /health/database` - Database connection health
- `GET /health/scraper` - Scraper service health

### Example API Usage

#### 1. Add and Start a New Chain
```bash
curl -X POST http://localhost:3000/api/v1/chains \
  -H "Content-Type: application/json" \
  -d '{
    "chainId": 137,
    "name": "Polygon",
    "rpcUrl": "https://polygon-rpc.com",
    "contractAddress": "0xbD6C7B0d2f68c2b7805d88388319cfB6EcB50eA9",
    "startingBlock": 70000000,
    "scanInterval": 30000,
    "maxBlockRange": 1000,
    "retryAttempts": 3
  }'
```

#### 2. Query Events by Integrator
```bash
curl "http://localhost:3000/api/v1/events/integrator/0xB0b86a33E6441b8c4C8C0C8C0C8C0C8C0C8C0C8C?chainId=137&page=1&limit=10"
```

#### 3. Get Chain Status
```bash
curl http://localhost:3000/api/v1/chains/status
```

#### 4. Check System Health
```bash
curl http://localhost:3000/health
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Tests with Coverage
```bash
npm run test:coverage
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Test Categories

- **API Tests**: Endpoint testing with mocked data
- **Unit Tests**: Individual service and utility testing
- **Integration Tests**: Database and blockchain service testing
- **Health Tests**: System health endpoint testing

## 📊 Monitoring

### Health Checks

The system provides comprehensive health monitoring:

- **Overall Health**: `GET /health`
- **Database Health**: `GET /health/database`
- **Scraper Health**: `GET /health/scraper`

### Logging

Structured logging is implemented with different levels:
- `error`: Critical errors and failures
- `warn`: Warning conditions
- `info`: General information
- `debug`: Detailed debugging information

### Metrics

The API provides real-time metrics:
- Active chains count
- Total events collected
- Worker status per chain
- Error counts and rates

## 🔒 Security

### Rate Limiting
- **Event Endpoints**: 100 requests per 15 minutes
- **Chain Management**: 10 requests per minute
- **Health Endpoints**: No rate limiting

### Input Validation
- All API inputs are validated using Joi schemas
- Ethereum address format validation
- Chain ID validation
- Date range validation

### CORS and Helmet
- Configurable CORS settings
- Helmet.js for security headers
- Content Security Policy

## 🚀 Production Deployment

### Docker Production Deployment

```bash
# Build production image
docker build -t fee-collector:latest .

# Run with production environment
docker run -d \
  --name fee-collector \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e MONGODB_URI=mongodb://your-mongodb:27017/fee_collector \
  -e REDIS_URL=redis://your-redis:6379 \
  fee-collector:latest
```

### Production Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Configure production database URLs
   - Set appropriate rate limits

2. **Database Setup**
   - Ensure MongoDB is properly configured
   - Set up database indexes for performance
   - Configure backup strategies

3. **Redis Setup**
   - Configure Redis for production
   - Set appropriate TTL values
   - Monitor memory usage

4. **Monitoring**
   - Set up health check monitoring
   - Configure log aggregation
   - Set up alerting for failures

## 📈 Performance

### Optimization Tips

1. **Database Indexing**
   - Ensure proper indexes on frequently queried fields
   - Monitor query performance
   - Use compound indexes for complex queries

2. **Caching Strategy**
   - Configure appropriate cache TTL
   - Monitor cache hit rates
   - Use cache warming for popular queries

3. **Rate Limiting**
   - Adjust rate limits based on usage patterns
   - Monitor rate limit violations
   - Implement client-specific limits if needed

### Scaling Considerations

- **Horizontal Scaling**: Run multiple instances behind a load balancer
- **Database Scaling**: Use MongoDB replica sets or sharding
- **Redis Scaling**: Use Redis Cluster for high availability
- **Monitoring**: Implement comprehensive monitoring and alerting

## 🆘 Support

### Common Issues

1. **MongoDB Connection Issues**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check network connectivity

2. **Redis Connection Issues**
   - Ensure Redis is running
   - Verify Redis URL in `.env`
   - Check Redis memory usage

3. **Rate Limiting**
   - Check current rate limits
   - Monitor API usage patterns
   - Adjust limits if needed

### Getting Help

- **Documentation**: Check the Swagger UI at `/api-docs`
- **Issues**: Create an issue on GitHub
- **Discussions**: Use GitHub Discussions for questions

---

**Built with ❤️ using TypeScript, Node.js, MongoDB, and Redis**