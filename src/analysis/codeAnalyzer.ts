import { FileAnalysis } from '../types';
import path from 'path';
import logger from '../utils/logger';

export class CodeAnalyzer {
  
  analyzeFile(filePath: string, content: string): FileAnalysis {
    logger.debug(`Analyzing file: ${filePath}`);
    
    const fileType = this.getFileType(filePath);
    const patterns = this.extractPatterns(content, fileType);
    const logFormats = this.extractLogFormats(content, fileType);
    const dataFields = this.extractDataFields(content, fileType);
    const imports = this.extractImports(content, fileType);

    return {
      filePath,
      fileType,
      content,
      patterns,
      logFormats,
      dataFields,
      imports
    };
  }

  private getFileType(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    const typeMap: Record<string, string> = {
      '.js': 'javascript',
      '.ts': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.json': 'json',
      '.xml': 'xml',
      '.csv': 'csv',
      '.log': 'log',
      '.txt': 'text',
      '.yml': 'yaml',
      '.yaml': 'yaml',
      '.config': 'config',
      '.properties': 'properties',
      '.ini': 'ini'
    };

    return typeMap[extension] || 'unknown';
  }

  private extractPatterns(content: string, fileType: string): string[] {
    const patterns: string[] = [];

    switch (fileType) {
      case 'javascript':
      case 'typescript':
        patterns.push(...this.extractJavaScriptPatterns(content));
        break;
      case 'python':
        patterns.push(...this.extractPythonPatterns(content));
        break;
      case 'java':
        patterns.push(...this.extractJavaPatterns(content));
        break;
      case 'json':
        patterns.push(...this.extractJsonPatterns(content));
        break;
      case 'log':
        patterns.push(...this.extractLogPatterns(content));
        break;
    }

    return patterns;
  }

  private extractJavaScriptPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Function declarations
    const functionMatches = content.match(/function\s+(\w+)/g);
    if (functionMatches) {
      patterns.push(...functionMatches.map(match => `Function: ${match}`));
    }

    // Arrow functions
    const arrowFunctions = content.match(/const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/g);
    if (arrowFunctions) {
      patterns.push(...arrowFunctions.map(match => `Arrow Function: ${match}`));
    }

    // Console/logging statements
    const logStatements = content.match(/console\.(log|error|warn|info|debug)\([^)]+\)/g);
    if (logStatements) {
      patterns.push(...logStatements.map(match => `Log Statement: ${match}`));
    }

    // API endpoints
    const endpoints = content.match(/(app|router)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (endpoints) {
      patterns.push(...endpoints.map(match => `API Endpoint: ${match}`));
    }

    return patterns;
  }

  private extractPythonPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Function definitions
    const functionMatches = content.match(/def\s+(\w+)\s*\(/g);
    if (functionMatches) {
      patterns.push(...functionMatches.map(match => `Function: ${match}`));
    }

    // Logging statements
    const logStatements = content.match(/logging\.(debug|info|warning|error|critical)\([^)]+\)/g);
    if (logStatements) {
      patterns.push(...logStatements.map(match => `Log Statement: ${match}`));
    }

    // Print statements
    const printStatements = content.match(/print\([^)]+\)/g);
    if (printStatements) {
      patterns.push(...printStatements.map(match => `Print Statement: ${match}`));
    }

    return patterns;
  }

  private extractJavaPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    // Method definitions
    const methodMatches = content.match(/(public|private|protected)?\s*(static)?\s*\w+\s+(\w+)\s*\(/g);
    if (methodMatches) {
      patterns.push(...methodMatches.map(match => `Method: ${match}`));
    }

    // Logger statements
    const logStatements = content.match(/log(ger)?\.(debug|info|warn|error|trace)\([^)]+\)/g);
    if (logStatements) {
      patterns.push(...logStatements.map(match => `Log Statement: ${match}`));
    }

    return patterns;
  }

  private extractJsonPatterns(content: string): string[] {
    const patterns: string[] = [];
    
    try {
      const jsonData = JSON.parse(content);
      patterns.push(...this.extractJsonKeys(jsonData, ''));
    } catch (error) {
      logger.warn('Failed to parse JSON content for pattern extraction');
    }

    return patterns;
  }

  private extractJsonKeys(obj: any, prefix: string): string[] {
    const keys: string[] = [];
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          keys.push(`JSON Key: ${fullKey}`);
          
          if (typeof obj[key] === 'object') {
            keys.push(...this.extractJsonKeys(obj[key], fullKey));
          }
        }
      }
    }
    
    return keys;
  }

  private extractLogPatterns(content: string): string[] {
    const patterns: string[] = [];
    const lines = content.split('\n').slice(0, 50); // Analyze first 50 lines

    for (const line of lines) {
      if (line.trim()) {
        // Common log formats
        if (/^\d{4}-\d{2}-\d{2}/.test(line)) {
          patterns.push('Log Format: ISO Date');
        }
        if (/\[INFO\]|\[ERROR\]|\[WARN\]|\[DEBUG\]/.test(line)) {
          patterns.push('Log Format: Bracketed Level');
        }
        if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(line)) {
          patterns.push('Log Format: Contains IP');
        }
      }
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  private extractLogFormats(content: string, fileType: string): string[] {
    const formats: string[] = [];

    // Common logging framework patterns
    const logFormatPatterns = [
      /log4j|logback|slf4j/i,
      /winston|bunyan|pino/i,
      /logging\.basicConfig|logging\.getLogger/i,
      /console\.log|console\.error|console\.warn/i,
      /syslog|rsyslog/i
    ];

    for (const pattern of logFormatPatterns) {
      if (pattern.test(content)) {
        formats.push(`Logging Framework: ${pattern.source}`);
      }
    }

    // Specific log format strings
    const formatStrings = content.match(/['"`][^'"`]*%[sd].*?['"`]/g);
    if (formatStrings) {
      formats.push(...formatStrings.map(format => `Format String: ${format}`));
    }

    return formats;
  }

  private extractDataFields(content: string, fileType: string): string[] {
    const fields: string[] = [];

    switch (fileType) {
      case 'json':
        try {
          const jsonData = JSON.parse(content);
          fields.push(...this.extractJsonFieldNames(jsonData));
        } catch (error) {
          // Ignore parsing errors
        }
        break;
      case 'csv':
        const csvLines = content.split('\n');
        if (csvLines.length > 0 && csvLines[0]) {
          const headers = csvLines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
          fields.push(...headers.map(h => `CSV Field: ${h}`));
        }
        break;
      case 'javascript':
      case 'typescript':
        // Extract object property names
        const objectProps = content.match(/(\w+):\s*['"]/g);
        if (objectProps) {
          fields.push(...objectProps.map(prop => `Object Property: ${prop.replace(':', '').trim()}`));
        }
        break;
    }

    return fields;
  }

  private extractJsonFieldNames(obj: any, prefix: string = ''): string[] {
    const fields: string[] = [];
    
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      for (const key in obj) {
        if (obj && obj.hasOwnProperty(key)) {
          const fieldName = prefix ? `${prefix}.${key}` : key;
          fields.push(fieldName);
          
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            fields.push(...this.extractJsonFieldNames(obj[key], fieldName));
          }
        }
      }
    }
    
    return fields;
  }

  private extractImports(content: string, fileType: string): string[] {
    const imports: string[] = [];

    switch (fileType) {
      case 'javascript':
      case 'typescript':
        const jsImports = content.match(/import\s+.*?from\s+['"`]([^'"`]+)['"`]/g);
        if (jsImports) {
          imports.push(...jsImports);
        }
        const requireImports = content.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g);
        if (requireImports) {
          imports.push(...requireImports);
        }
        break;
      case 'python':
        const pythonImports = content.match(/^(import|from)\s+[\w.]+/gm);
        if (pythonImports) {
          imports.push(...pythonImports);
        }
        break;
      case 'java':
        const javaImports = content.match(/import\s+[\w.]+;/g);
        if (javaImports) {
          imports.push(...javaImports);
        }
        break;
    }

    return imports;
  }
}