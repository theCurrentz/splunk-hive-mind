import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import logger from '../utils/logger';

const queryRequestSchema = Joi.object({
  prompt: Joi.string().min(1).max(2000).required(),
  context_files: Joi.array().items(Joi.string()).optional(),
  conversation_history: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('user', 'agent').required(),
      content: Joi.string().required()
    })
  ).optional()
});

export const validateQueryRequest = (req: Request, res: Response, next: NextFunction): void => {
  const { error, value } = queryRequestSchema.validate(req.body);
  
  if (error) {
    logger.warn('Invalid request body:', error.details);
    res.status(400).json({
      status: 'error',
      error_message: `Validation error: ${error.details.map(d => d.message).join(', ')}`
    });
    return;
  }
  
  req.body = value;
  next();
};

export const validateApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.header('X-API-Key') || req.header('Authorization')?.replace('Bearer ', '');
  const configApiKey = process.env.API_KEY;
  
  // Skip API key validation if not configured
  if (!configApiKey) {
    logger.warn('API key not configured - skipping validation');
    next();
    return;
  }
  
  if (!apiKey || apiKey !== configApiKey) {
    logger.warn('Invalid or missing API key');
    res.status(401).json({
      status: 'error',
      error_message: 'Invalid or missing API key'
    });
    return;
  }
  
  next();
};