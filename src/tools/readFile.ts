import { Tool, ToolResult, ReadFileParams } from '../types';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import { config } from '../config';

export class ReadFileTool implements Tool {
  name = 'read_file';
  description = 'Read file contents with security and size restrictions';

  async execute(parameters: ReadFileParams): Promise<ToolResult> {
    try {
      logger.info(`Reading file: ${parameters.filepath}`);
      
      // Security validation
      const validationResult = await this.validateFile(parameters.filepath);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      const absolutePath = path.resolve(parameters.filepath);
      const content = await this.readFileContent(absolutePath);

      return {
        success: true,
        output: content
      };
    } catch (error) {
      logger.error('File reading failed:', error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async validateFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const absolutePath = path.resolve(filePath);
      
      // Check if file exists and is a file (not directory)
      const stats = await fs.stat(absolutePath);
      if (!stats.isFile()) {
        return { valid: false, error: 'Path is not a file' };
      }
      
      // Check file size
      if (stats.size > config.maxFileSize) {
        return { 
          valid: false, 
          error: `File size (${stats.size} bytes) exceeds maximum allowed size (${config.maxFileSize} bytes)` 
        };
      }
      
      // Prevent directory traversal attacks
      if (absolutePath.includes('..') || absolutePath.includes('~')) {
        return { valid: false, error: 'Path traversal not allowed' };
      }

      // Check file extension
      const extension = path.extname(absolutePath);
      if (!config.allowedExtensions.includes(extension) && extension !== '') {
        return { valid: false, error: `File extension '${extension}' is not allowed` };
      }

      // Check if it's within allowed directories
      const allowedPaths = [process.cwd(), config.sandboxDirectory];
      const isAllowed = allowedPaths.some(allowedPath => 
        absolutePath.startsWith(path.resolve(allowedPath))
      );
      
      if (!isAllowed) {
        return { valid: false, error: 'Access to this file location is not allowed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'File does not exist or is not accessible' };
    }
  }

  private async readFileContent(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      
      // Add file metadata header
      const stats = await fs.stat(filePath);
      const header = `File: ${filePath}
Size: ${this.formatFileSize(stats.size)}
Last Modified: ${stats.mtime.toISOString()}
Extension: ${path.extname(filePath) || 'none'}

--- File Content ---
`;
      
      return header + content;
    } catch (error) {
      // Try reading as binary and show first few bytes if UTF-8 fails
      logger.warn(`Failed to read as UTF-8, attempting binary read: ${error}`);
      
      try {
        const buffer = await fs.readFile(filePath);
        return `File: ${filePath}
Note: Binary file detected, showing first 200 bytes as hex:

${buffer.subarray(0, 200).toString('hex')}

... (file is ${buffer.length} bytes total)`;
      } catch (binaryError) {
        throw new Error(`Failed to read file: ${binaryError instanceof Error ? binaryError.message : 'unknown error'}`);
      }
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }
}