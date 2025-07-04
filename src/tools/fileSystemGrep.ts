import { Tool, ToolResult, FileSystemGrepParams } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';
import logger from '../utils/logger';
import { config } from '../config';

const execAsync = promisify(exec);

export class FileSystemGrepTool implements Tool {
  name = 'file_system_grep';
  description = 'Search for patterns in files using grep with security restrictions';

  async execute(parameters: FileSystemGrepParams): Promise<ToolResult> {
    try {
      logger.info(`Executing grep search for pattern: ${parameters.pattern} in path: ${parameters.path}`);
      
      // Security validation
      const validationResult = await this.validatePath(parameters.path);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Sanitize pattern to prevent command injection
      const sanitizedPattern = this.sanitizePattern(parameters.pattern);
      const sanitizedPath = this.sanitizePath(parameters.path);

      // Build grep command with security restrictions
      const grepCommand = `grep -r -n -H --include="*.{${config.allowedExtensions.map(ext => ext.replace('.', '')).join(',')}}" "${sanitizedPattern}" "${sanitizedPath}"`;
      
      logger.debug(`Executing command: ${grepCommand}`);

      const { stdout, stderr } = await execAsync(grepCommand, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer limit
      });

      if (stderr && !stderr.includes('No such file or directory')) {
        logger.warn(`Grep stderr: ${stderr}`);
      }

      return {
        success: true,
        output: stdout || 'No matches found'
      };
    } catch (error) {
      logger.error('File system grep failed:', error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async validatePath(inputPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Resolve absolute path and check if it exists
      const absolutePath = path.resolve(inputPath);
      
      // Check if path exists
      await fs.access(absolutePath);
      
      // Prevent directory traversal attacks
      if (absolutePath.includes('..') || absolutePath.includes('~')) {
        return { valid: false, error: 'Path traversal not allowed' };
      }

      // Check if it's within allowed directories (basic sandbox)
      const allowedPaths = [process.cwd(), config.sandboxDirectory];
      const isAllowed = allowedPaths.some(allowedPath => absolutePath.startsWith(path.resolve(allowedPath)));
      
      if (!isAllowed) {
        return { valid: false, error: 'Access to this path is not allowed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Path does not exist or is not accessible' };
    }
  }

  private sanitizePattern(pattern: string): string {
    // Remove or escape potentially dangerous characters
    return pattern.replace(/[`$;|&<>()]/g, '\\$&');
  }

  private sanitizePath(inputPath: string): string {
    // Remove or escape potentially dangerous characters
    return inputPath.replace(/[`$;|&<>()]/g, '\\$&');
  }
}