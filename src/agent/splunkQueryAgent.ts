import { ChatAnthropic } from '@langchain/anthropic';
import { StructuredTool } from '@langchain/core/tools';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { StringOutputParser } from '@langchain/core/output_parsers';

import { QueryRequest, QueryResponse, SplunkQueryContext, ToolCall, FileAnalysis } from '../types';
import { toolRegistry } from '../tools';
import { CodeAnalyzer } from '../analysis/codeAnalyzer';
import { ReadFileTool } from '../tools/readFile';
import logger from '../utils/logger';
import { config } from '../config';

export class SplunkQueryAgent {
  private llm: ChatAnthropic;
  private codeAnalyzer: CodeAnalyzer;
  private readFileTool: ReadFileTool;

  constructor() {
    this.llm = new ChatAnthropic({
      apiKey: config.anthropicApiKey,
      model: 'claude-3-sonnet-20240229',
      temperature: 0.1,
      maxTokens: 4000
    });
    
    this.codeAnalyzer = new CodeAnalyzer();
    this.readFileTool = new ReadFileTool();
  }

  async generateQuery(request: QueryRequest): Promise<QueryResponse> {
    try {
      logger.info('Starting Splunk query generation', { prompt: request.prompt });

      // Analyze context files if provided
      const analysisResults = await this.analyzeContextFiles(request.context_files || []);
      
      // Build context for the LLM
      const context: SplunkQueryContext = {
        analysisResults,
        userPrompt: request.prompt,
        conversationHistory: request.conversation_history || []
      };

      // Generate query using LLM with tools
      const result = await this.runQueryGeneration(context);
      
      logger.info('Successfully generated Splunk query');
      return result;

    } catch (error) {
      logger.error('Failed to generate Splunk query', error);
      return {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private async analyzeContextFiles(filePaths: string[]): Promise<FileAnalysis[]> {
    const analysisResults: FileAnalysis[] = [];

    for (const filePath of filePaths) {
      try {
        logger.debug(`Analyzing context file: ${filePath}`);
        
        // Read file content
        const readResult = await this.readFileTool.execute({ filepath: filePath });
        
        if (readResult.success) {
          // Analyze the file content
          const analysis = this.codeAnalyzer.analyzeFile(filePath, readResult.output);
          analysisResults.push(analysis);
        } else {
          logger.warn(`Failed to read context file ${filePath}: ${readResult.error}`);
        }
      } catch (error) {
        logger.warn(`Error analyzing context file ${filePath}:`, error);
      }
    }

    return analysisResults;
  }

  private async runQueryGeneration(context: SplunkQueryContext): Promise<QueryResponse> {
    const toolCalls: ToolCall[] = [];

    // Build system message with context
    const systemMessage = this.buildSystemMessage(context);
    
    // Build user message
    const userMessage = new HumanMessage({
      content: this.buildUserMessage(context)
    });

    // First pass: Let the LLM decide what tools to use
    const toolDecisionPrompt = `Given the user's request and the context provided, determine which tools (if any) you need to use to gather additional information before generating a Splunk query.

Available tools:
- web_search: Search for Splunk documentation and best practices
- file_system_grep: Search for patterns in files
- terminal_command: Execute safe shell commands
- folder_file_indexing: List directory contents
- read_file: Read file contents

User request: ${context.userPrompt}

Respond with a JSON object indicating which tools to use and their parameters, or "none" if no additional tools are needed.
Format: {"tools": [{"name": "tool_name", "parameters": {...}}]} or {"tools": "none"}`;

    const toolDecisionResponse = await this.llm.invoke([systemMessage, new HumanMessage(toolDecisionPrompt)]);
    
    // Execute tools if needed
    let additionalContext = '';
    try {
      const toolDecision = JSON.parse(toolDecisionResponse.content as string);
      
      if (toolDecision.tools !== 'none' && Array.isArray(toolDecision.tools)) {
        for (const toolSpec of toolDecision.tools) {
          const tool = toolRegistry.getTool(toolSpec.name);
          if (tool) {
            logger.debug(`Executing tool: ${toolSpec.name}`, toolSpec.parameters);
            const result = await tool.execute(toolSpec.parameters);
            
            toolCalls.push({
              tool_name: toolSpec.name,
              parameters: toolSpec.parameters,
              output: result.output
            });

            if (result.success) {
              additionalContext += `\n\n--- ${toolSpec.name} Output ---\n${result.output}`;
            }
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to parse tool decision or execute tools:', error);
    }

    // Generate final Splunk query
    const finalPrompt = this.buildFinalQueryPrompt(context, additionalContext);
    
    const chain = RunnableSequence.from([
      (input) => [systemMessage, new HumanMessage(input)],
      this.llm,
      new StringOutputParser()
    ]);

    const response = await chain.invoke(finalPrompt);
    
    // Parse the response to extract query and explanation
    const { query, explanation } = this.parseQueryResponse(response);

    const result: QueryResponse = {
      status: 'success',
      query,
      explanation
    };

    if (toolCalls.length > 0) {
      result.tool_calls = toolCalls;
    }

    return result;
  }

  private buildSystemMessage(context: SplunkQueryContext): SystemMessage {
    let systemContent = `You are an expert Splunk query assistant. Your role is to generate accurate and efficient Splunk Search Processing Language (SPL) queries based on user requests and provided context.

## Your Capabilities:
1. Analyze code patterns, log formats, and data structures
2. Generate syntactically correct SPL queries
3. Provide clear explanations for your queries
4. Use appropriate Splunk commands and functions
5. Consider performance and best practices

## Key Splunk Commands and Concepts:
- Basic search: index=main sourcetype=access_log
- Filtering: where, search, regex
- Field extraction: rex, extract, eval
- Aggregation: stats, timechart, chart
- Sorting and formatting: sort, head, tail, table
- Time handling: earliest, latest, strftime, strptime
- Functions: count, sum, avg, max, min, dc (distinct count)

## Context Analysis:`;

    if (context.analysisResults.length > 0) {
      systemContent += '\n\n### Analyzed Files:\n';
      for (const analysis of context.analysisResults) {
        systemContent += `
**File: ${analysis.filePath}**
- Type: ${analysis.fileType}
- Patterns: ${analysis.patterns.slice(0, 10).join(', ')}${analysis.patterns.length > 10 ? '...' : ''}
- Log Formats: ${analysis.logFormats.join(', ')}
- Data Fields: ${analysis.dataFields.slice(0, 20).join(', ')}${analysis.dataFields.length > 20 ? '...' : ''}
- Imports: ${analysis.imports.slice(0, 5).join(', ')}${analysis.imports.length > 5 ? '...' : ''}
`;
      }
    }

    if (context.conversationHistory.length > 0) {
      systemContent += '\n\n### Conversation History:\n';
      for (const turn of context.conversationHistory) {
        systemContent += `${turn.role}: ${turn.content}\n`;
      }
    }

    systemContent += `

## Instructions:
1. Generate a Splunk query that addresses the user's specific request
2. Use the analyzed context to inform field names, data patterns, and search criteria
3. Ensure the query is syntactically correct and follows SPL best practices
4. Provide a clear explanation of what the query does
5. Consider performance implications and suggest optimizations if relevant

## Response Format:
Provide your response in the following format:
QUERY: [Your SPL query here]

EXPLANATION: [Clear explanation of what the query does and why you chose this approach]`;

    return new SystemMessage({ content: systemContent });
  }

  private buildUserMessage(context: SplunkQueryContext): string {
    return `Please generate a Splunk query for the following request:

${context.userPrompt}

Use the provided context analysis and apply Splunk best practices. Focus on creating an efficient and accurate query that addresses the specific requirements.`;
  }

  private buildFinalQueryPrompt(context: SplunkQueryContext, additionalContext: string): string {
    let prompt = `Generate a Splunk query for: ${context.userPrompt}`;
    
    if (additionalContext) {
      prompt += `\n\nAdditional context from tools:${additionalContext}`;
    }
    
    prompt += `\n\nProvide the response in the exact format:
QUERY: [Your SPL query]

EXPLANATION: [Your explanation]`;

    return prompt;
  }

  private parseQueryResponse(response: string): { query: string; explanation: string } {
    const queryMatch = response.match(/QUERY:\s*(.*?)(?=\n\nEXPLANATION:|$)/s);
    const explanationMatch = response.match(/EXPLANATION:\s*(.*?)$/s);

    const query = queryMatch?.[1]?.trim() || response.trim();
    const explanation = explanationMatch?.[1]?.trim() || 'No explanation provided';

    return { query, explanation };
  }
}