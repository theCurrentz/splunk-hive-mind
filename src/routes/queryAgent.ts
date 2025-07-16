import { Router, Request, Response } from 'express';
import { SplunkQueryAgent } from '../agent/splunkQueryAgent';
import { validateQueryRequest } from '../middleware/validation';
import { QueryRequest } from '../types';
import logger from '../utils/logger';

const router = Router();
const agent = new SplunkQueryAgent();

// POST /api/query-agent - Generate Splunk query
router.post('/', validateQueryRequest, async (req: Request, res: Response) => {
  try {
    logger.info('Received query generation request');
    
    const queryRequest: QueryRequest = req.body;
    const result = await agent.generateQuery(queryRequest);
    
    logger.info('Query generation completed', { status: result.status });
    res.json(result);
    
  } catch (error) {
    logger.error('Unexpected error in query generation:', error);
    res.status(500).json({
      status: 'error',
      error_message: 'Internal server error'
    });
  }
});

// GET /api/query-agent/health - Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// GET /api/query-agent/tools - List available tools
router.get('/tools', (req: Request, res: Response) => {
  const tools = [
    {
      name: 'web_search',
      description: 'Search the web for Splunk documentation and best practices'
    },
    {
      name: 'file_system_grep',
      description: 'Search for patterns in files using grep'
    },
    {
      name: 'terminal_command',
      description: 'Execute safe shell commands'
    },
    {
      name: 'folder_file_indexing',
      description: 'List contents of directories'
    },
    {
      name: 'read_file',
      description: 'Read file contents with security restrictions'
    }
  ];
  
  res.json({
    status: 'success',
    tools
  });
});

export default router;