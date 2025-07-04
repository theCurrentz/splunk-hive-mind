import dotenv from 'dotenv';
import { AgentConfig } from '../types';

dotenv.config();

export const config: AgentConfig = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  allowedExtensions: (process.env.ALLOWED_FILE_EXTENSIONS || '.js,.ts,.py,.java,.xml,.json,.csv,.txt,.log,.yml,.yaml,.config,.properties,.ini').split(','),
  sandboxDirectory: process.env.SANDBOX_DIRECTORY || '/tmp/splunk-agent-sandbox',
  logLevel: process.env.LOG_LEVEL || 'info'
};

export const serverConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  apiKey: process.env.API_KEY || ''
};

export default config;