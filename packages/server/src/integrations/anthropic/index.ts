// ===========================================
// ANTHROPIC INTEGRATION
// Claude AI language models
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class AnthropicIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude AI language models',
    category: 'ai',
    authType: 'api_key',
    requiredEnvVars: ['ANTHROPIC_API_KEY'],
  };

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'anthropic_message',
        description: 'Generate a Claude message response',
        category: 'ai',
        integration: 'anthropic',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'messages', type: 'array', description: 'Messages [{role, content}]', required: true },
          { name: 'model', type: 'string', description: 'Model (claude-3-opus, claude-3-sonnet, claude-3-haiku)', required: false, default: 'claude-3-sonnet-20240229' },
          { name: 'max_tokens', type: 'number', description: 'Max tokens', required: false, default: 1024 },
          { name: 'system', type: 'string', description: 'System prompt', required: false },
          { name: 'temperature', type: 'number', description: 'Temperature (0-1)', required: false },
        ],
      },
      {
        name: 'anthropic_message_stream',
        description: 'Generate a streaming Claude message response',
        category: 'ai',
        integration: 'anthropic',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'messages', type: 'array', description: 'Messages [{role, content}]', required: true },
          { name: 'model', type: 'string', description: 'Model', required: false, default: 'claude-3-sonnet-20240229' },
          { name: 'max_tokens', type: 'number', description: 'Max tokens', required: false, default: 1024 },
          { name: 'system', type: 'string', description: 'System prompt', required: false },
        ],
      },
      {
        name: 'anthropic_count_tokens',
        description: 'Count tokens in a message (estimate)',
        category: 'ai',
        integration: 'anthropic',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'text', type: 'string', description: 'Text to count', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'No API key. Please configure Anthropic.' };
    }

    const baseUrl = 'https://api.anthropic.com/v1';
    const headers = {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    };

    try {
      switch (toolName) {
        case 'anthropic_message': {
          const body: Record<string, unknown> = {
            model: params.model || 'claude-3-sonnet-20240229',
            messages: params.messages,
            max_tokens: params.max_tokens || 1024,
          };
          if (params.system) body.system = params.system;
          if (params.temperature !== undefined) body.temperature = params.temperature;

          const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error: ${response.status} - ${JSON.stringify(errorData)}`);
          }
          const data = await response.json();
          return { success: true, data };
        }

        case 'anthropic_message_stream': {
          // Note: Streaming would require different handling (SSE)
          // This returns a non-streaming response with a note
          const body: Record<string, unknown> = {
            model: params.model || 'claude-3-sonnet-20240229',
            messages: params.messages,
            max_tokens: params.max_tokens || 1024,
            stream: false, // Would be true for actual streaming
          };
          if (params.system) body.system = params.system;

          const response = await fetch(`${baseUrl}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return {
            success: true,
            data: {
              ...data,
              note: 'Streaming requires special client handling. This is a non-streaming response.',
            },
          };
        }

        case 'anthropic_count_tokens': {
          // Anthropic doesn't have a public token counting endpoint
          // This is a rough estimate (approx 4 chars per token for English)
          const text = params.text as string;
          const estimatedTokens = Math.ceil(text.length / 4);
          return {
            success: true,
            data: {
              estimated_tokens: estimatedTokens,
              character_count: text.length,
              note: 'This is an estimate. Actual token count may vary.',
            },
          };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const anthropicIntegration = new AnthropicIntegration();
