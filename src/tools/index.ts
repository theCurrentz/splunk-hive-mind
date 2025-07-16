import { Tool } from '../types';
import { WebSearchTool } from './webSearch';
import { FileSystemGrepTool } from './fileSystemGrep';
import { TerminalCommandTool } from './terminalCommand';
import { FolderIndexingTool } from './folderIndexing';
import { ReadFileTool } from './readFile';

export { WebSearchTool } from './webSearch';
export { FileSystemGrepTool } from './fileSystemGrep';
export { TerminalCommandTool } from './terminalCommand';
export { FolderIndexingTool } from './folderIndexing';
export { ReadFileTool } from './readFile';

export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerTools();
  }

  private registerTools(): void {
    const toolInstances = [
      new WebSearchTool(),
      new FileSystemGrepTool(),
      new TerminalCommandTool(),
      new FolderIndexingTool(),
      new ReadFileTool()
    ];

    for (const tool of toolInstances) {
      this.tools.set(tool.name, tool);
    }
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

export const toolRegistry = new ToolRegistry();