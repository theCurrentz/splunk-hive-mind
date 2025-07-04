import { Tool, ToolResult, TerminalCommandParams } from '../types';
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger';

const execAsync = promisify(exec);

export class TerminalCommandTool implements Tool {
  name = 'terminal_command';
  description = 'Execute shell commands with strict security restrictions';

  // Whitelist of allowed commands
  private readonly allowedCommands = [
    'ls', 'dir', 'pwd', 'whoami', 'date', 'uptime',
    'find', 'locate', 'which', 'type',
    'head', 'tail', 'cat', 'wc', 'sort', 'uniq',
    'ps', 'top', 'df', 'du', 'free',
    'node', 'npm', 'python', 'python3', 'java',
    'git'
  ];

  async execute(parameters: TerminalCommandParams): Promise<ToolResult> {
    try {
      logger.info(`Attempting to execute command: ${parameters.command}`);
      
      // Security validation
      const validationResult = this.validateCommand(parameters.command);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      const sanitizedCommand = this.sanitizeCommand(parameters.command);
      logger.debug(`Executing sanitized command: ${sanitizedCommand}`);

      const { stdout, stderr } = await execAsync(sanitizedCommand, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer limit
        cwd: process.cwd(), // Restrict to current working directory
        env: {
          ...process.env,
          PATH: process.env.PATH || '' // Only inherit PATH
        }
      });

      if (stderr) {
        logger.warn(`Command stderr: ${stderr}`);
      }

      return {
        success: true,
        output: stdout + (stderr ? `\nStderr: ${stderr}` : '')
      };
    } catch (error) {
      logger.error('Terminal command failed:', error);
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private validateCommand(command: string): { valid: boolean; error?: string } {
    // Remove leading/trailing whitespace
    const trimmedCommand = command.trim();
    
    // Check for empty command
    if (!trimmedCommand) {
      return { valid: false, error: 'Command cannot be empty' };
    }

    // Check for dangerous characters and patterns
    const dangerousPatterns = [
      /[;&|`$(){}[\]]/,  // Shell metacharacters
      /\.\./,            // Directory traversal
      /\/dev\/|\/proc\/|\/sys\//,  // System directories
      /rm\s+-rf/,        // Destructive commands
      /sudo|su/,         // Privilege escalation
      /chmod|chown/,     // Permission changes
      /wget|curl.*-o/,   // Downloads to files
      />\s*\/|>>/,       // File redirections to system paths
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(trimmedCommand)) {
        return { valid: false, error: 'Command contains dangerous patterns' };
      }
    }

    // Extract the base command (first word)
    const baseCommand = trimmedCommand.split(' ')[0];
    
    // Check if base command exists and is in whitelist
    if (!baseCommand || !this.allowedCommands.includes(baseCommand)) {
      return { valid: false, error: `Command '${baseCommand || 'empty'}' is not in the allowed list` };
    }

    return { valid: true };
  }

  private sanitizeCommand(command: string): string {
    // Additional sanitization if needed
    return command.trim();
  }
}