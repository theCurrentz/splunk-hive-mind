import { Tool, ToolResult, FolderIndexingParams } from '../types';
import fs from 'fs/promises';
import path from 'path';
import logger from '../utils/logger';
import { config } from '../config';

export class FolderIndexingTool implements Tool {
  name = 'folder_file_indexing';
  description = 'List contents of directories with security restrictions';

  async execute(parameters: FolderIndexingParams): Promise<ToolResult> {
    try {
      logger.info(`Indexing directory: ${parameters.path}`);
      
      // Security validation
      const validationResult = await this.validatePath(parameters.path);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      const absolutePath = path.resolve(parameters.path);
      const contents = await this.listDirectoryContents(absolutePath);

      return {
        success: true,
        output: contents
      };
    } catch (error) {
      logger.error('Folder indexing failed:', error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async validatePath(inputPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const absolutePath = path.resolve(inputPath);
      
      // Check if path exists and is a directory
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        return { valid: false, error: 'Path is not a directory' };
      }
      
      // Prevent directory traversal attacks
      if (absolutePath.includes('..') || absolutePath.includes('~')) {
        return { valid: false, error: 'Path traversal not allowed' };
      }

      // Check if it's within allowed directories
      const allowedPaths = [process.cwd(), config.sandboxDirectory];
      const isAllowed = allowedPaths.some(allowedPath => 
        absolutePath.startsWith(path.resolve(allowedPath))
      );
      
      if (!isAllowed) {
        return { valid: false, error: 'Access to this directory is not allowed' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Directory does not exist or is not accessible' };
    }
  }

  private async listDirectoryContents(dirPath: string, depth = 0, maxDepth = 3): Promise<string> {
    if (depth > maxDepth) {
      return '  '.repeat(depth) + '... (max depth reached)\n';
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      let result = '';

      // Sort entries: directories first, then files
      const sortedEntries = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      for (const entry of sortedEntries) {
        const indent = '  '.repeat(depth);
        const entryPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          result += `${indent}📁 ${entry.name}/\n`;
          // Recursively list subdirectory contents
          if (depth < maxDepth) {
            try {
              result += await this.listDirectoryContents(entryPath, depth + 1, maxDepth);
            } catch (error) {
              result += `${indent}  (error reading directory: ${error instanceof Error ? error.message : 'unknown'})\n`;
            }
          }
        } else {
          const stats = await fs.stat(entryPath);
          const size = this.formatFileSize(stats.size);
          const extension = path.extname(entry.name);
          const isAllowedFile = config.allowedExtensions.includes(extension) || extension === '';
          
          const icon = this.getFileIcon(extension);
          const marker = isAllowedFile ? '' : ' (restricted)';
          
          result += `${indent}${icon} ${entry.name} (${size})${marker}\n`;
        }
      }

      return result;
    } catch (error) {
      return `${'  '.repeat(depth)}Error reading directory: ${error instanceof Error ? error.message : 'unknown'}\n`;
    }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  private getFileIcon(extension: string): string {
    const iconMap: Record<string, string> = {
      '.js': '📄',
      '.ts': '📄',
      '.py': '🐍',
      '.java': '☕',
      '.json': '📋',
      '.xml': '📋',
      '.csv': '📊',
      '.txt': '📝',
      '.log': '📜',
      '.yml': '⚙️',
      '.yaml': '⚙️',
      '.config': '⚙️',
      '.properties': '⚙️',
      '.ini': '⚙️'
    };
    
    return iconMap[extension] || '📄';
  }
}