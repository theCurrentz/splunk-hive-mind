# Splunk Query AI Agent

A TypeScript/Node.js backend service that uses AI to generate accurate Splunk Search Processing Language (SPL) queries based on natural language requests and contextual analysis of code and data files.

## Features

- **AI-Powered Query Generation**: Uses Large Language Models (Claude) to generate syntactically correct and semantically relevant Splunk queries
- **Code Analysis**: Analyzes source code files to understand logging patterns, data structures, and application logic
- **Structured Data Analysis**: Processes JSON, CSV, XML, and other structured data to identify field names and relationships
- **Tool Integration**: Includes web search, file system grep, terminal commands, and file reading capabilities
- **RESTful API**: Clean JSON API for integration with other systems
- **Security**: Built-in security controls including input validation, command sanitization, and file access restrictions

## Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **AI Integration**: LangChain.js with Anthropic Claude models
- **Logging**: Winston
- **Validation**: Joi
- **Security**: Helmet, CORS

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd splunk-query-ai-agent
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Build the project:
```bash
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# AI Model Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Logging
LOG_LEVEL=info

# Security
API_KEY=your_api_key_for_authentication

# File System Security
MAX_FILE_SIZE=10485760
ALLOWED_FILE_EXTENSIONS=.js,.ts,.py,.java,.xml,.json,.csv,.txt,.log,.yml,.yaml,.config,.properties,.ini
SANDBOX_DIRECTORY=/tmp/splunk-agent-sandbox
```

### Required Setup

1. **Anthropic API Key**: Get your API key from [Anthropic Console](https://console.anthropic.com/)
2. **File Permissions**: Ensure the application has read access to files you want to analyze
3. **Log Directory**: The app will create a `logs/` directory for log files

## Usage

### Starting the Server

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on the configured port (default: 3000).

### API Endpoints

#### Generate Splunk Query
**POST** `/api/query-agent`

Generate a Splunk query based on natural language request and optional context files.

**Headers:**
- `Content-Type: application/json`
- `X-API-Key: your_api_key` (if configured)

**Request Body:**
```json
{
  "prompt": "Find all login failures in the last 24 hours and show the top 5 source IPs",
  "context_files": [
    "./auth-service.js",
    "./logs/sample.log"
  ],
  "conversation_history": [
    {
      "role": "user",
      "content": "Show me authentication logs"
    },
    {
      "role": "agent",
      "content": "Here's a query for authentication logs: index=auth..."
    }
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "query": "index=auth sourcetype=auth_logs \"login failure\" earliest=-24h | stats count by src_ip | sort -count | head 5",
  "explanation": "This query searches the auth index for login failure events in the last 24 hours, counts occurrences by source IP, sorts by count descending, and shows the top 5 results.",
  "tool_calls": [
    {
      "tool_name": "read_file",
      "parameters": {
        "filepath": "./auth-service.js"
      },
      "output": "File analysis results..."
    }
  ]
}
```

#### Health Check
**GET** `/api/query-agent/health`

Check the health status of the service.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

#### List Tools
**GET** `/api/query-agent/tools`

Get information about available tools.

**Response:**
```json
{
  "status": "success",
  "tools": [
    {
      "name": "web_search",
      "description": "Search the web for Splunk documentation and best practices"
    },
    {
      "name": "file_system_grep",
      "description": "Search for patterns in files using grep"
    }
  ]
}
```

### Example Use Cases

#### 1. Basic Query Generation
```bash
curl -X POST http://localhost:3000/api/query-agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Show me all ERROR level logs from the application in the last hour"
  }'
```

#### 2. Query with Code Context
```bash
curl -X POST http://localhost:3000/api/query-agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Find all API calls that resulted in 500 errors",
    "context_files": ["./src/api-server.js", "./config/logging.json"]
  }'
```

#### 3. Interactive Conversation
```bash
curl -X POST http://localhost:3000/api/query-agent \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Can you modify the previous query to also show the response time?",
    "conversation_history": [
      {
        "role": "user",
        "content": "Show me API errors"
      },
      {
        "role": "agent", 
        "content": "index=app_logs level=ERROR | stats count by endpoint"
      }
    ]
  }'
```

## Tool Capabilities

The agent has access to several tools for gathering context:

### Web Search
- Searches for Splunk documentation and best practices
- Returns relevant information about SPL commands and patterns

### File System Grep
- Searches for patterns in code and log files
- Security-restricted to allowed directories and file types

### Terminal Commands
- Executes safe shell commands for system information
- Whitelist-controlled for security

### Folder Indexing
- Lists directory contents with file metadata
- Helps understand project structure

### File Reading
- Reads file contents with size and type restrictions
- Provides metadata about files being analyzed

## Security Features

- **Input Validation**: All API inputs are validated using Joi schemas
- **Command Sanitization**: Terminal commands are sanitized and restricted to a whitelist
- **File Access Control**: File operations are restricted to allowed directories and extensions
- **API Key Authentication**: Optional API key protection
- **Rate Limiting**: Built-in protection against abuse
- **Error Handling**: Comprehensive error handling with sanitized error messages

## Development

### Project Structure
```
src/
├── agent/           # Core AI agent logic
├── analysis/        # Code and data analysis utilities  
├── config/          # Configuration management
├── middleware/      # Express middleware
├── routes/          # API route handlers
├── tools/           # Tool implementations
├── types/           # TypeScript type definitions
├── utils/           # Utility functions
└── index.ts         # Main server entry point
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues

### Adding New Tools

1. Create a new tool class implementing the `Tool` interface:
```typescript
import { Tool, ToolResult } from '../types';

export class MyCustomTool implements Tool {
  name = 'my_custom_tool';
  description = 'Description of what this tool does';

  async execute(parameters: any): Promise<ToolResult> {
    // Implementation
    return {
      success: true,
      output: 'Tool output'
    };
  }
}
```

2. Register the tool in `src/tools/index.ts`
3. The agent will automatically have access to the new tool

## Troubleshooting

### Common Issues

1. **"ANTHROPIC_API_KEY not set"**
   - Ensure you have a valid Anthropic API key in your `.env` file

2. **"File access not allowed"**
   - Check that the file paths are within allowed directories
   - Verify file extensions are in the allowed list

3. **"Command not in allowed list"**
   - Terminal commands are restricted to a security whitelist
   - Add safe commands to the whitelist in `terminalCommand.ts`

4. **Memory or timeout errors**
   - Adjust `MAX_FILE_SIZE` for large files
   - Check LLM token limits for complex requests

### Logs

Application logs are written to:
- `logs/error.log` - Error-level logs
- `logs/combined.log` - All logs
- Console output (development mode)

### Performance Optimization

- Use specific context files rather than entire directories
- Keep prompts concise and focused
- Limit conversation history to recent relevant exchanges
- Consider file size when providing context

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run `npm run lint` and `npm test`
6. Submit a pull request

## License

MIT License - see LICENSE file for details.
