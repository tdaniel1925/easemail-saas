// ===========================================
// OPENAI INTEGRATION
// AI language models and embeddings
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class OpenAIIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'openai',
    name: 'OpenAI',
    description: 'AI language models, embeddings, and assistants',
    category: 'ai',
    authType: 'api_key',
    requiredEnvVars: ['OPENAI_API_KEY'],
  };

  isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'openai_chat_completion',
        description: 'Generate a chat completion',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'messages', type: 'array', description: 'Chat messages [{role, content}]', required: true },
          { name: 'model', type: 'string', description: 'Model (gpt-4, gpt-3.5-turbo)', required: false, default: 'gpt-4' },
          { name: 'temperature', type: 'number', description: 'Temperature (0-2)', required: false },
          { name: 'max_tokens', type: 'number', description: 'Max tokens', required: false },
        ],
      },
      {
        name: 'openai_create_embedding',
        description: 'Create text embeddings',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'input', type: 'string', description: 'Text to embed', required: true },
          { name: 'model', type: 'string', description: 'Model', required: false, default: 'text-embedding-ada-002' },
        ],
      },
      {
        name: 'openai_list_models',
        description: 'List available models',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'openai_create_image',
        description: 'Generate an image with DALL-E',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'prompt', type: 'string', description: 'Image description', required: true },
          { name: 'size', type: 'string', description: 'Size (1024x1024, 512x512, 256x256)', required: false },
          { name: 'quality', type: 'string', description: 'Quality (standard, hd)', required: false },
          { name: 'n', type: 'number', description: 'Number of images', required: false, default: 1 },
        ],
      },
      {
        name: 'openai_transcribe_audio',
        description: 'Transcribe audio with Whisper',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'file_url', type: 'string', description: 'Audio file URL', required: true },
          { name: 'language', type: 'string', description: 'Language code', required: false },
        ],
      },
      {
        name: 'openai_moderate_content',
        description: 'Check content for policy violations',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'input', type: 'string', description: 'Content to moderate', required: true },
        ],
      },
      // Assistants API
      {
        name: 'openai_list_assistants',
        description: 'List OpenAI Assistants',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'openai_create_assistant',
        description: 'Create an OpenAI Assistant',
        category: 'ai',
        integration: 'openai',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Assistant name', required: true },
          { name: 'instructions', type: 'string', description: 'System instructions', required: true },
          { name: 'model', type: 'string', description: 'Model', required: false, default: 'gpt-4' },
          { name: 'tools', type: 'array', description: 'Tools (code_interpreter, retrieval, function)', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'No API key. Please configure OpenAI.' };
    }

    const baseUrl = 'https://api.openai.com/v1';
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'openai_chat_completion': {
          const body: Record<string, unknown> = {
            model: params.model || 'gpt-4',
            messages: params.messages,
          };
          if (params.temperature !== undefined) body.temperature = params.temperature;
          if (params.max_tokens) body.max_tokens = params.max_tokens;

          const response = await fetch(`${baseUrl}/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.choices[0] };
        }

        case 'openai_create_embedding': {
          const response = await fetch(`${baseUrl}/embeddings`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: params.model || 'text-embedding-ada-002',
              input: params.input,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data[0] };
        }

        case 'openai_list_models': {
          const response = await fetch(`${baseUrl}/models`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'openai_create_image': {
          const body: Record<string, unknown> = {
            model: 'dall-e-3',
            prompt: params.prompt,
            n: params.n || 1,
          };
          if (params.size) body.size = params.size;
          if (params.quality) body.quality = params.quality;

          const response = await fetch(`${baseUrl}/images/generations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'openai_transcribe_audio': {
          // Note: For file upload, you'd need to download the file first
          // This is a simplified version
          return { success: false, error: 'Audio transcription requires file upload. Use the API directly for this feature.' };
        }

        case 'openai_moderate_content': {
          const response = await fetch(`${baseUrl}/moderations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ input: params.input }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results[0] };
        }

        case 'openai_list_assistants': {
          const response = await fetch(`${baseUrl}/assistants`, {
            headers: { ...headers, 'OpenAI-Beta': 'assistants=v2' },
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'openai_create_assistant': {
          const body: Record<string, unknown> = {
            name: params.name,
            instructions: params.instructions,
            model: params.model || 'gpt-4',
          };
          if (params.tools) body.tools = params.tools;

          const response = await fetch(`${baseUrl}/assistants`, {
            method: 'POST',
            headers: { ...headers, 'OpenAI-Beta': 'assistants=v2' },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const openaiIntegration = new OpenAIIntegration();
