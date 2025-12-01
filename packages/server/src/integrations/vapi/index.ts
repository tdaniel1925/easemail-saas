// ===========================================
// VAPI INTEGRATION
// Voice AI platform for building voice agents
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class VapiIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'vapi',
    name: 'Vapi',
    description: 'Voice AI platform for building conversational voice agents',
    category: 'voice',
    authType: 'api_key',
    requiredEnvVars: ['VAPI_API_KEY'],
  };

  private apiKey = process.env.VAPI_API_KEY;
  private baseUrl = 'https://api.vapi.ai';

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      // Assistants
      {
        name: 'vapi_list_assistants',
        description: 'List all voice assistants',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
        ],
      },
      {
        name: 'vapi_get_assistant',
        description: 'Get assistant details',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant ID', required: true },
        ],
      },
      {
        name: 'vapi_create_assistant',
        description: 'Create a new voice assistant',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Assistant name', required: true },
          { name: 'model', type: 'object', description: 'Model config {provider, model, messages}', required: true },
          { name: 'voice', type: 'object', description: 'Voice config {provider, voiceId}', required: false },
          { name: 'first_message', type: 'string', description: 'First message to say', required: false },
          { name: 'transcriber', type: 'object', description: 'Transcriber config', required: false },
        ],
      },
      {
        name: 'vapi_update_assistant',
        description: 'Update an assistant',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant ID', required: true },
          { name: 'name', type: 'string', description: 'Assistant name', required: false },
          { name: 'model', type: 'object', description: 'Model config', required: false },
          { name: 'voice', type: 'object', description: 'Voice config', required: false },
          { name: 'first_message', type: 'string', description: 'First message', required: false },
        ],
      },
      {
        name: 'vapi_delete_assistant',
        description: 'Delete an assistant',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant ID', required: true },
        ],
      },
      // Calls
      {
        name: 'vapi_list_calls',
        description: 'List calls',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
          { name: 'assistant_id', type: 'string', description: 'Filter by assistant', required: false },
        ],
      },
      {
        name: 'vapi_get_call',
        description: 'Get call details',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'call_id', type: 'string', description: 'Call ID', required: true },
        ],
      },
      {
        name: 'vapi_create_call',
        description: 'Create an outbound call',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant ID', required: true },
          { name: 'phone_number_id', type: 'string', description: 'Phone number ID to call from', required: true },
          { name: 'customer_number', type: 'string', description: 'Customer phone number to call', required: true },
          { name: 'name', type: 'string', description: 'Call name/label', required: false },
        ],
      },
      {
        name: 'vapi_end_call',
        description: 'End an active call',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'call_id', type: 'string', description: 'Call ID', required: true },
        ],
      },
      // Phone Numbers
      {
        name: 'vapi_list_phone_numbers',
        description: 'List phone numbers',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'vapi_get_phone_number',
        description: 'Get phone number details',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'phone_number_id', type: 'string', description: 'Phone number ID', required: true },
        ],
      },
      {
        name: 'vapi_buy_phone_number',
        description: 'Buy a phone number',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'area_code', type: 'string', description: 'Area code', required: true },
          { name: 'assistant_id', type: 'string', description: 'Assistant to assign', required: false },
          { name: 'name', type: 'string', description: 'Phone number name', required: false },
        ],
      },
      // Squads (multiple assistants)
      {
        name: 'vapi_list_squads',
        description: 'List squads',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'vapi_create_squad',
        description: 'Create a squad of assistants',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Squad name', required: true },
          { name: 'members', type: 'array', description: 'Squad members [{assistantId, assistantDestinations}]', required: true },
        ],
      },
      // Analytics
      {
        name: 'vapi_get_call_analytics',
        description: 'Get call analytics and metrics',
        category: 'voice',
        integration: 'vapi',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'start_date', type: 'string', description: 'Start date (ISO 8601)', required: false },
          { name: 'end_date', type: 'string', description: 'End date (ISO 8601)', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || this.apiKey;
    if (!apiKey) {
      return { success: false, error: 'No API key. Please configure Vapi.' };
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'vapi_list_assistants': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.append('limit', String(params.limit));

          const response = await fetch(`${this.baseUrl}/assistant?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_get_assistant': {
          const response = await fetch(`${this.baseUrl}/assistant/${params.assistant_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_create_assistant': {
          const body: Record<string, unknown> = {
            name: params.name,
            model: params.model,
          };
          if (params.voice) body.voice = params.voice;
          if (params.first_message) body.firstMessage = params.first_message;
          if (params.transcriber) body.transcriber = params.transcriber;

          const response = await fetch(`${this.baseUrl}/assistant`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_update_assistant': {
          const body: Record<string, unknown> = {};
          if (params.name) body.name = params.name;
          if (params.model) body.model = params.model;
          if (params.voice) body.voice = params.voice;
          if (params.first_message) body.firstMessage = params.first_message;

          const response = await fetch(`${this.baseUrl}/assistant/${params.assistant_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_delete_assistant': {
          const response = await fetch(`${this.baseUrl}/assistant/${params.assistant_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        case 'vapi_list_calls': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.append('limit', String(params.limit));
          if (params.assistant_id) queryParams.append('assistantId', String(params.assistant_id));

          const response = await fetch(`${this.baseUrl}/call?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_get_call': {
          const response = await fetch(`${this.baseUrl}/call/${params.call_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_create_call': {
          const body: Record<string, unknown> = {
            assistantId: params.assistant_id,
            phoneNumberId: params.phone_number_id,
            customer: {
              number: params.customer_number,
            },
          };
          if (params.name) body.name = params.name;

          const response = await fetch(`${this.baseUrl}/call/phone`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_end_call': {
          const response = await fetch(`${this.baseUrl}/call/${params.call_id}/stop`, {
            method: 'POST',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_list_phone_numbers': {
          const response = await fetch(`${this.baseUrl}/phone-number`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_get_phone_number': {
          const response = await fetch(`${this.baseUrl}/phone-number/${params.phone_number_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_buy_phone_number': {
          const body: Record<string, unknown> = {
            areaCode: params.area_code,
          };
          if (params.assistant_id) body.assistantId = params.assistant_id;
          if (params.name) body.name = params.name;

          const response = await fetch(`${this.baseUrl}/phone-number`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_list_squads': {
          const response = await fetch(`${this.baseUrl}/squad`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_create_squad': {
          const body: Record<string, unknown> = {
            name: params.name,
            members: params.members,
          };

          const response = await fetch(`${this.baseUrl}/squad`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'vapi_get_call_analytics': {
          const queryParams = new URLSearchParams();
          if (params.start_date) queryParams.append('startDate', String(params.start_date));
          if (params.end_date) queryParams.append('endDate', String(params.end_date));

          const response = await fetch(`${this.baseUrl}/analytics?${queryParams}`, { headers });
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

export const vapiIntegration = new VapiIntegration();
