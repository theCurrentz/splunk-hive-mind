const express = require('express');
const winston = require('winston');
const app = express();

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Middleware
app.use(express.json());

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) {
    logger.error('Authentication failed: No token provided', {
      ip: req.ip,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });
    return res.status(401).json({ error: 'Access denied' });
  }
  
  // Verify token logic here
  try {
    // Token verification would go here
    logger.info('User authenticated successfully', {
      ip: req.ip,
      endpoint: req.path,
      timestamp: new Date().toISOString()
    });
    next();
  } catch (error) {
    logger.error('Authentication failed: Invalid token', {
      ip: req.ip,
      endpoint: req.path,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// API routes
app.get('/api/users', authenticateUser, (req, res) => {
  logger.info('Users endpoint accessed', {
    ip: req.ip,
    endpoint: '/api/users',
    timestamp: new Date().toISOString()
  });
  
  try {
    // Database query logic here
    const users = [
      { id: 1, username: 'john_doe', email: 'john@example.com' },
      { id: 2, username: 'jane_smith', email: 'jane@example.com' }
    ];
    
    res.json({
      status: 'success',
      data: users,
      count: users.length
    });
  } catch (error) {
    logger.error('Database error in users endpoint', {
      ip: req.ip,
      endpoint: '/api/users',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  logger.info('Login attempt', {
    username: username,
    ip: req.ip,
    endpoint: '/api/login',
    timestamp: new Date().toISOString()
  });
  
  // Login validation logic
  if (!username || !password) {
    logger.warn('Login failed: Missing credentials', {
      username: username,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  // Simulate authentication
  if (username === 'admin' && password === 'secret') {
    logger.info('Login successful', {
      username: username,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    res.json({
      status: 'success',
      token: 'sample-jwt-token',
      user: { username: username, role: 'admin' }
    });
  } else {
    logger.error('Login failed: Invalid credentials', {
      username: username,
      ip: req.ip,
      attempt_count: 1,
      timestamp: new Date().toISOString()
    });
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/api/orders/:id', authenticateUser, (req, res) => {
  const orderId = req.params.id;
  
  logger.info('Order lookup', {
    order_id: orderId,
    ip: req.ip,
    endpoint: `/api/orders/${orderId}`,
    timestamp: new Date().toISOString()
  });
  
  // Simulate order lookup
  if (isNaN(orderId)) {
    logger.warn('Invalid order ID format', {
      order_id: orderId,
      ip: req.ip,
      timestamp: new Date().toISOString()
    });
    return res.status(400).json({ error: 'Invalid order ID format' });
  }
  
  // Mock order data
  const order = {
    id: orderId,
    customer: 'John Doe',
    items: ['laptop', 'mouse'],
    total: 1299.99,
    status: 'shipped'
  };
  
  res.json({
    status: 'success',
    data: order
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    endpoint: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  res.status(500).json({
    status: 'error',
    message: 'Internal server error'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    timestamp: new Date().toISOString()
  });
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;