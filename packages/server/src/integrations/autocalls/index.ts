// ===========================================
// AUTOCALLS.AI INTEGRATION
// AI-powered voice calling platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class AutocallsIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'autocalls',
    name: 'Autocalls.ai',
    description: 'AI-powered voice calling and automation platform',
    category: 'voice',
    authType: 'api_key',
    requiredEnvVars: ['AUTOCALLS_API_KEY'],
  };

  private apiKey = process.env.AUTOCALLS_API_KEY;
  private baseUrl = 'https://api.autocalls.ai/api';

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      // Assistants
      {
        name: 'autocalls_list_assistants',
        description: 'List all AI assistants',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'page', type: 'number', description: 'Page number', required: false, default: 1 },
          { name: 'per_page', type: 'number', description: 'Results per page', required: false, default: 20 },
        ],
      },
      {
        name: 'autocalls_list_outbound_assistants',
        description: 'List outbound assistants only',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'autocalls_create_assistant',
        description: 'Create a new AI assistant',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Assistant name', required: true },
          { name: 'prompt', type: 'string', description: 'System prompt for the assistant', required: true },
          { name: 'voice_id', type: 'string', description: 'Voice ID to use', required: false },
          { name: 'language', type: 'string', description: 'Language code', required: false },
          { name: 'model', type: 'string', description: 'LLM model to use', required: false },
        ],
      },
      {
        name: 'autocalls_update_assistant',
        description: 'Update an existing assistant',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant ID', required: true },
          { name: 'name', type: 'string', description: 'Assistant name', required: false },
          { name: 'prompt', type: 'string', description: 'System prompt', required: false },
          { name: 'voice_id', type: 'string', description: 'Voice ID', required: false },
        ],
      },
      {
        name: 'autocalls_delete_assistant',
        description: 'Delete an assistant',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant ID', required: true },
        ],
      },
      {
        name: 'autocalls_get_languages',
        description: 'List supported languages',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'autocalls_get_voices',
        description: 'List available voices',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'autocalls_get_models',
        description: 'List available LLM models',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'autocalls_get_phone_numbers',
        description: 'List available phone numbers',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      // Calls
      {
        name: 'autocalls_list_calls',
        description: 'List all calls',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'page', type: 'number', description: 'Page number', required: false },
          { name: 'per_page', type: 'number', description: 'Results per page', required: false },
          { name: 'assistant_id', type: 'string', description: 'Filter by assistant', required: false },
        ],
      },
      {
        name: 'autocalls_get_call',
        description: 'Get call details',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'call_id', type: 'string', description: 'Call ID', required: true },
        ],
      },
      {
        name: 'autocalls_make_call',
        description: 'Initiate an outbound call',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant ID to use', required: true },
          { name: 'phone_number', type: 'string', description: 'Phone number to call', required: true },
          { name: 'variables', type: 'object', description: 'Custom variables for the call', required: false },
        ],
      },
      {
        name: 'autocalls_delete_call',
        description: 'Delete a call record',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'call_id', type: 'string', description: 'Call ID', required: true },
        ],
      },
      // Leads
      {
        name: 'autocalls_list_leads',
        description: 'List all leads',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'autocalls_create_lead',
        description: 'Create a new lead',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'phone_number', type: 'string', description: 'Lead phone number', required: true },
          { name: 'name', type: 'string', description: 'Lead name', required: false },
          { name: 'email', type: 'string', description: 'Lead email', required: false },
          { name: 'variables', type: 'object', description: 'Custom variables', required: false },
        ],
      },
      {
        name: 'autocalls_update_lead',
        description: 'Update a lead',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID', required: true },
          { name: 'phone_number', type: 'string', description: 'Phone number', required: false },
          { name: 'name', type: 'string', description: 'Name', required: false },
          { name: 'email', type: 'string', description: 'Email', required: false },
        ],
      },
      {
        name: 'autocalls_delete_lead',
        description: 'Delete a lead',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID', required: true },
        ],
      },
      // Campaigns
      {
        name: 'autocalls_list_campaigns',
        description: 'List all campaigns',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'autocalls_update_campaign_status',
        description: 'Start or stop a campaign',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'campaign_id', type: 'string', description: 'Campaign ID', required: true },
          { name: 'status', type: 'string', description: 'Status (start or stop)', required: true },
        ],
      },
      // Mid-Call Tools
      {
        name: 'autocalls_list_tools',
        description: 'List all mid-call tools',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'autocalls_get_tool',
        description: 'Get a mid-call tool',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'tool_id', type: 'string', description: 'Tool ID', required: true },
        ],
      },
      {
        name: 'autocalls_create_tool',
        description: 'Create a mid-call tool',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Tool name', required: true },
          { name: 'description', type: 'string', description: 'Tool description', required: true },
          { name: 'webhook_url', type: 'string', description: 'Webhook URL to call', required: true },
          { name: 'parameters', type: 'array', description: 'Tool parameters', required: false },
        ],
      },
      {
        name: 'autocalls_delete_tool',
        description: 'Delete a mid-call tool',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'tool_id', type: 'string', description: 'Tool ID', required: true },
        ],
      },
      // SMS
      {
        name: 'autocalls_send_sms',
        description: 'Send an SMS message',
        category: 'voice',
        integration: 'autocalls',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'to', type: 'string', description: 'Recipient phone number', required: true },
          { name: 'message', type: 'string', description: 'SMS message content', required: true },
          { name: 'from', type: 'string', description: 'Sender phone number ID', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || this.apiKey;
    if (!apiKey) {
      return { success: false, error: 'No API key. Please configure Autocalls.ai.' };
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      switch (toolName) {
        // Assistants
        case 'autocalls_list_assistants': {
          const queryParams = new URLSearchParams();
          if (params.page) queryParams.append('page', String(params.page));
          if (params.per_page) queryParams.append('per_page', String(params.per_page));

          const response = await fetch(`${this.baseUrl}/user/assistants/get?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_list_outbound_assistants': {
          const response = await fetch(`${this.baseUrl}/user/assistants/outbound`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_create_assistant': {
          const body: Record<string, unknown> = {
            name: params.name,
            prompt: params.prompt,
          };
          if (params.voice_id) body.voice_id = params.voice_id;
          if (params.language) body.language = params.language;
          if (params.model) body.model = params.model;

          const response = await fetch(`${this.baseUrl}/user/assistant`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_update_assistant': {
          const body: Record<string, unknown> = {};
          if (params.name) body.name = params.name;
          if (params.prompt) body.prompt = params.prompt;
          if (params.voice_id) body.voice_id = params.voice_id;

          const response = await fetch(`${this.baseUrl}/user/assistant/${params.assistant_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_delete_assistant': {
          const response = await fetch(`${this.baseUrl}/user/assistant/${params.assistant_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        case 'autocalls_get_languages': {
          const response = await fetch(`${this.baseUrl}/user/assistants/languages`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_get_voices': {
          const response = await fetch(`${this.baseUrl}/user/assistants/voices`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_get_models': {
          const response = await fetch(`${this.baseUrl}/user/assistants/models`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_get_phone_numbers': {
          const response = await fetch(`${this.baseUrl}/user/assistants/phone-numbers`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        // Calls
        case 'autocalls_list_calls': {
          const queryParams = new URLSearchParams();
          if (params.page) queryParams.append('page', String(params.page));
          if (params.per_page) queryParams.append('per_page', String(params.per_page));
          if (params.assistant_id) queryParams.append('assistant_id', String(params.assistant_id));

          const response = await fetch(`${this.baseUrl}/user/calls?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_get_call': {
          const response = await fetch(`${this.baseUrl}/user/calls/${params.call_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_make_call': {
          const body: Record<string, unknown> = {
            assistant_id: params.assistant_id,
            phone_number: params.phone_number,
          };
          if (params.variables) body.variables = params.variables;

          const response = await fetch(`${this.baseUrl}/user/make_call`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_delete_call': {
          const response = await fetch(`${this.baseUrl}/user/calls/${params.call_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        // Leads
        case 'autocalls_list_leads': {
          const response = await fetch(`${this.baseUrl}/user/leads`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_create_lead': {
          const body: Record<string, unknown> = {
            phone_number: params.phone_number,
          };
          if (params.name) body.name = params.name;
          if (params.email) body.email = params.email;
          if (params.variables) body.variables = params.variables;

          const response = await fetch(`${this.baseUrl}/user/lead`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_update_lead': {
          const body: Record<string, unknown> = {};
          if (params.phone_number) body.phone_number = params.phone_number;
          if (params.name) body.name = params.name;
          if (params.email) body.email = params.email;

          const response = await fetch(`${this.baseUrl}/user/leads/${params.lead_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_delete_lead': {
          const response = await fetch(`${this.baseUrl}/user/leads/${params.lead_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        // Campaigns
        case 'autocalls_list_campaigns': {
          const response = await fetch(`${this.baseUrl}/user/campaigns`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_update_campaign_status': {
          const response = await fetch(`${this.baseUrl}/user/campaigns/update-status`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              campaign_id: params.campaign_id,
              status: params.status,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        // Mid-Call Tools
        case 'autocalls_list_tools': {
          const response = await fetch(`${this.baseUrl}/user/tools`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_get_tool': {
          const response = await fetch(`${this.baseUrl}/user/tools/${params.tool_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_create_tool': {
          const body: Record<string, unknown> = {
            name: params.name,
            description: params.description,
            webhook_url: params.webhook_url,
          };
          if (params.parameters) body.parameters = params.parameters;

          const response = await fetch(`${this.baseUrl}/user/tools`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'autocalls_delete_tool': {
          const response = await fetch(`${this.baseUrl}/user/tools/${params.tool_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        // SMS
        case 'autocalls_send_sms': {
          const body: Record<string, unknown> = {
            to: params.to,
            message: params.message,
          };
          if (params.from) body.from = params.from;

          const response = await fetch(`${this.baseUrl}/user/sms`, {
            method: 'POST',
            headers,
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

export const autocallsIntegration = new AutocallsIntegration();
