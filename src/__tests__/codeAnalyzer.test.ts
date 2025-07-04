import { CodeAnalyzer } from '../analysis/codeAnalyzer';

describe('CodeAnalyzer', () => {
  let analyzer: CodeAnalyzer;

  beforeEach(() => {
    analyzer = new CodeAnalyzer();
  });

  describe('analyzeFile', () => {
    it('should analyze a JavaScript file correctly', () => {
      const filePath = 'test.js';
      const content = `
        const express = require('express');
        const app = express();
        
        function handleLogin(req, res) {
          console.log('Login attempt:', req.body.username);
          return res.json({ success: true });
        }
        
        app.post('/api/login', handleLogin);
      `;

      const result = analyzer.analyzeFile(filePath, content);

      expect(result.filePath).toBe(filePath);
      expect(result.fileType).toBe('javascript');
      expect(result.patterns).toContain('Function: function handleLogin');
      expect(result.patterns.some(p => p.includes('console.log'))).toBe(true);
      expect(result.imports.some(i => i.includes('express'))).toBe(true);
    });

    it('should analyze a JSON configuration file correctly', () => {
      const filePath = 'config.json';
      const content = JSON.stringify({
        database: {
          host: 'localhost',
          port: 5432
        },
        logging: {
          level: 'info',
          format: 'json'
        }
      });

      const result = analyzer.analyzeFile(filePath, content);

      expect(result.filePath).toBe(filePath);
      expect(result.fileType).toBe('json');
      expect(result.dataFields).toContain('database.host');
      expect(result.dataFields).toContain('logging.level');
      expect(result.patterns.some(p => p.includes('JSON Key: database'))).toBe(true);
    });

    it('should analyze a log file correctly', () => {
      const filePath = 'app.log';
      const content = `2024-01-15 10:30:15 [INFO] Server started
2024-01-15 10:30:22 [ERROR] Database connection failed
192.168.1.100 - GET /api/users 200`;

      const result = analyzer.analyzeFile(filePath, content);

      expect(result.filePath).toBe(filePath);
      expect(result.fileType).toBe('log');
      expect(result.patterns).toContain('Log Format: ISO Date');
      expect(result.patterns).toContain('Log Format: Bracketed Level');
      expect(result.patterns).toContain('Log Format: Contains IP');
    });

    it('should handle CSV files correctly', () => {
      const filePath = 'data.csv';
      const content = `username,email,last_login,status
john_doe,john@example.com,2024-01-15,active
jane_smith,jane@example.com,2024-01-14,inactive`;

      const result = analyzer.analyzeFile(filePath, content);

      expect(result.filePath).toBe(filePath);
      expect(result.fileType).toBe('csv');
      expect(result.dataFields).toContain('CSV Field: username');
      expect(result.dataFields).toContain('CSV Field: email');
      expect(result.dataFields).toContain('CSV Field: last_login');
      expect(result.dataFields).toContain('CSV Field: status');
    });

    it('should handle unknown file types', () => {
      const filePath = 'unknown.xyz';
      const content = 'some content';

      const result = analyzer.analyzeFile(filePath, content);

      expect(result.filePath).toBe(filePath);
      expect(result.fileType).toBe('unknown');
      expect(result.patterns).toEqual([]);
      expect(result.dataFields).toEqual([]);
    });
  });
});