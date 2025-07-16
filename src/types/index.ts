export interface QueryRequest {
  prompt: string;
  context_files?: string[];
  conversation_history?: ConversationTurn[];
}

export interface ConversationTurn {
  role: 'user' | 'agent';
  content: string;
}

export interface QueryResponse {
  status: 'success' | 'error';
  query?: string;
  explanation?: string;
  tool_calls?: ToolCall[];
  error_message?: string;
}

export interface ToolCall {
  tool_name: string;
  parameters: Record<string, any>;
  output: string;
}

export interface Tool {
  name: string;
  description: string;
  execute(parameters: Record<string, any>): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export interface FileAnalysis {
  filePath: string;
  fileType: string;
  content: string;
  patterns: string[];
  logFormats: string[];
  dataFields: string[];
  imports: string[];
}

export interface SplunkQueryContext {
  analysisResults: FileAnalysis[];
  userPrompt: string;
  conversationHistory: ConversationTurn[];
}

export interface AgentConfig {
  anthropicApiKey: string;
  maxFileSize: number;
  allowedExtensions: string[];
  sandboxDirectory: string;
  logLevel: string;
}

export interface WebSearchParams {
  query: string;
}

export interface FileSystemGrepParams {
  pattern: string;
  path: string;
}

export interface TerminalCommandParams {
  command: string;
}

export interface FolderIndexingParams {
  path: string;
}

export interface ReadFileParams {
  filepath: string;
}