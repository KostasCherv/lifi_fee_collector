# LI.FI Fee Collector Event Scraper

A comprehensive multi-chain event scraper system that monitors LI.FI FeeCollector smart contract events across multiple EVM chains, stores them in MongoDB, and provides both a REST API and a modern React frontend for querying and managing the data.

## 🚀 Features

### Backend Features
- **Multi-Chain Support**: Monitor events from multiple EVM chains simultaneously
- **Real-time Event Scraping**: Continuously monitor smart contracts for `FeesCollected` events
- **Dynamic Chain Management**: Add, remove, and configure chains at runtime via API
- **REST API**: Complete REST API with comprehensive Swagger documentation
- **API Caching**: Redis-based caching for API responses to improve performance
- **Health Monitoring**: Real-time health checks for all system components
- **Rate Limiting**: Built-in rate limiting for API protection
- **Comprehensive Testing**: Full test suite with Jest
- **Docker Support**: Complete Docker containerization
- **TypeScript**: Fully typed codebase

### Frontend Features
- **Modern React UI**: Built with React 19, TypeScript, and Vite
- **Material-UI Components**: Beautiful and responsive UI using MUI
- **Real-time Dashboard**: Live monitoring of chain status and events
- **Chain Management**: Add, remove, and configure chains through the UI
- **Event Visualization**: Browse and filter collected events
- **Health Monitoring**: Real-time system health status
- **Responsive Design**: Works on desktop and mobile devices
- **Tailwind CSS**: Utility-first CSS framework for styling

## 🏗️ Architecture

```
+-------------------+         +---------------------+
|   React Frontend  | <-----> |  Express.js REST API|
+-------------------+         +---------------------+
                                   |        |
                                   v        v
                             +---------+  +----------------+
                             | MongoDB |  | Redis (Cache)  |
                             +---------+  +----------------+
                                   ^
                                   |
                         +----------------------+
                         |   Scraper Service    |
                         +----------------------+
```

- The **React Frontend** communicates with the **REST API**.
- The **REST API** uses **MongoDB** for persistent data and **Redis** for API response caching.
- The **Scraper Service** (internal) fetches events from blockchains and writes them to **MongoDB**.

## 📁 Project Structure

```
fee_collector/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── controllers/     # API controllers
│   │   ├── models/          # MongoDB models (Typegoose)
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── middleware/      # Express middleware
│   │   └── utils/           # Utility functions
│   ├── test/                # Test files
│   ├── Dockerfile           # Backend container
│   └── package.json
├── frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript types
│   ├── public/              # Static assets
│   └── package.json
├── docker-compose.yml       # Local development setup
├── DEPLOYMENT_GUIDE.md      # Deployment instructions
└── README.md               # This file
```

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose/Typegoose
- **API Cache**: Redis with ioredis (for API response caching)
- **Blockchain**: Ethers.js for EVM interaction
- **Testing**: Jest with Supertest
- **Documentation**: Swagger/OpenAPI
- **Containerization**: Docker

### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Linting**: ESLint with TypeScript support

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Docker** and **Docker Compose**
- **Git**

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fee_collector
   ```

2. **Start the backend services**
   ```bash
   cd backend
   cp env.example .env
   # Edit .env with your configuration
   docker-compose up -d mongodb redis
   npm install
   npm run dev
   ```

3. **Start the frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the applications**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - API Documentation: http://localhost:3000/api-docs

### Docker Deployment

1. **Start all services**
   ```bash
   docker-compose up -d
   ```

2. **Access the applications**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## 📚 API Documentation

Once the backend is running, access the interactive Swagger documentation at:
**🌐 http://localhost:3000/api-docs**

### Key API Endpoints

#### Events
- `GET /api/v1/events/integrator/{integrator}` - Query events by integrator
- `GET /api/v1/events/chain/{chainId}` - Query events for a specific chain
- `GET /api/v1/events` - Query events with filters

#### Chain Management
- `GET /api/v1/chains/status` - Get all chains status
- `POST /api/v1/chains/start` - Start a new chain worker
- `PUT /api/v1/chains/{chainId}/stop` - Stop a chain worker

#### Health
- `GET /health` - Overall system health
- `GET /health/database` - Database health
- `GET /health/scraper` - Scraper health

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:coverage      # Run with coverage
npm run test:watch         # Watch mode
```

### Frontend Tests
```bash
cd frontend
npm run lint              # Lint code
npm run build             # Build for production
```

## 🚀 Deployment

For detailed deployment instructions using free cloud services, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

**Recommended Stack:**
- **Frontend**: Vercel
- **Backend**: Railway
- **Database**: MongoDB Atlas
- **Cache**: Upstash Redis

## 🔧 Configuration

### Backend Environment Variables
```env
# Application
PORT=3000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/fee_collector

# Redis (for API response caching)
REDIS_URL=redis://localhost:6379

# Scraper Settings
DEFAULT_SCRAPER_INTERVAL=30000
DEFAULT_STARTING_BLOCK=70000000
DEFAULT_MAX_BLOCK_RANGE=1000

# API Settings
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100
```

### Frontend Environment Variables
```env
VITE_API_URL=http://localhost:3000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions:
1. Check the [API documentation](http://localhost:3000/api-docs)
2. Review the [deployment guide](./DEPLOYMENT_GUIDE.md)
3. Open an issue on GitHub

---

**Built with ❤️ by the LI.FI Team** 