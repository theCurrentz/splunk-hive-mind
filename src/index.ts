import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

import queryAgentRoutes from './routes/queryAgent';
import { validateApiKey } from './middleware/validation';
import { serverConfig } from './config';
import logger from './utils/logger';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// API key validation (optional based on configuration)
app.use('/api', validateApiKey);

// Routes
app.use('/api/query-agent', queryAgentRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Splunk Query AI Agent',
    version: '1.0.0',
    description: 'AI agent for generating Splunk queries using LLMs and contextual analysis',
    endpoints: {
      'POST /api/query-agent': 'Generate Splunk query',
      'GET /api/query-agent/health': 'Health check',
      'GET /api/query-agent/tools': 'List available tools'
    },
    documentation: 'See README.md for usage instructions'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: serverConfig.nodeEnv
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    error_message: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error_message: 'Endpoint not found'
  });
});

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Start server
const startServer = async () => {
  try {
    // Validate configuration
    if (!process.env.ANTHROPIC_API_KEY) {
      logger.warn('ANTHROPIC_API_KEY not set - AI functionality may not work');
    }

    const server = app.listen(serverConfig.port, () => {
      logger.info(`Splunk Query AI Agent started on port ${serverConfig.port}`);
      logger.info(`Environment: ${serverConfig.nodeEnv}`);
      logger.info(`API documentation available at http://localhost:${serverConfig.port}`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;