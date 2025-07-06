# LI.FI Fee Collector Frontend

This directory contains the React frontend for the LI.FI Fee Collector Event Scraper system. For a complete overview of the entire project, see the [main README.md](../README.md).

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **Backend API** running (see [backend README](../backend/README.md))

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Create .env file if needed
   echo "VITE_API_URL=http://localhost:3000" > .env
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# API Configuration
VITE_API_URL=http://localhost:3000
```

### Build Configuration

The project uses Vite for building and development. Key configuration files:

- `vite.config.ts` - Vite configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint configuration

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Main dashboard component
│   │   ├── ChainsManagement.tsx  # Chain management UI
│   │   ├── Events.tsx       # Events display component
│   │   ├── HealthStatus.tsx # Health monitoring component
│   │   └── Loading.tsx      # Loading states
│   ├── services/
│   │   └── api.ts           # API client service
│   ├── types/
│   │   └── api.ts           # TypeScript type definitions
│   ├── App.tsx              # Main application component
│   └── main.tsx             # Application entry point
├── public/                  # Static assets
├── index.html               # HTML template
└── package.json             # Dependencies and scripts
```

## 🎨 UI Components

The frontend uses a combination of:

- **Material-UI (MUI)**: Core UI components and theming
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **Axios**: HTTP client for API communication

### Key Components

- **Dashboard**: Main overview with chain status and metrics
- **ChainsManagement**: Add, remove, and configure chains
- **Events**: Browse and filter collected events
- **HealthStatus**: Real-time system health monitoring

## 🧪 Development

### Code Quality

The project includes:

- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting (via ESLint)

### Development Workflow

1. **Start the backend** (see [backend README](../backend/README.md))
2. **Start the frontend**: `npm run dev`
3. **Access the application** at http://localhost:5173
4. **API documentation** available at http://localhost:3000/api-docs

### Hot Reload

The development server includes hot module replacement (HMR) for instant updates during development.

## 🚀 Production Build

### Build for Production

```bash
npm run build
```

This creates a production-ready build in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

This serves the production build locally for testing.

### Deployment

The frontend can be deployed to any static hosting service:

- **Vercel**: Recommended for easy deployment
- **Netlify**: Alternative static hosting
- **GitHub Pages**: Free hosting for public repositories

## 🔗 API Integration

The frontend communicates with the backend API through the `api.ts` service. Key endpoints used:

- **Chain Management**: 
  - `GET /api/v1/chains/status` - Get all chains status
  - `GET /api/v1/chains/{chainId}/status` - Get specific chain status
  - `POST /api/v1/chains` - Add and start a new chain worker
  - `PUT /api/v1/chains/{chainId}/start` - Start a specific chain worker
  - `PUT /api/v1/chains/{chainId}/stop` - Stop a chain worker
  - `PUT /api/v1/chains/{chainId}/update` - Update chain configuration
  - `DELETE /api/v1/chains/{chainId}` - Delete chain configuration
- **Events**: `/api/v1/events/*`
- **Health**: `/health`

## 🆘 Troubleshooting

### Common Issues

1. **API Connection Issues**
   - Ensure the backend is running on the correct port
   - Check `VITE_API_URL` in your `.env` file
   - Verify CORS settings in the backend

2. **Build Issues**
   - Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run lint`

3. **Development Server Issues**
   - Check if port 5173 is available
   - Try a different port: `npm run dev -- --port 3001`

### Getting Help

- **Backend Issues**: See [backend README](../backend/README.md)
- **Project Overview**: See [main README.md](../README.md)
- **Issues**: Create an issue on GitHub

---

**Built with ❤️ using React, TypeScript, Vite, and Material-UI**
