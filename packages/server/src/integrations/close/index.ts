// ===========================================
// CLOSE CRM INTEGRATION
// Sales CRM built for startups and SMBs
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class CloseIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'close',
    name: 'Close',
    description: 'Sales CRM built for closing more deals',
    category: 'crm',
    authType: 'api_key',
    requiredEnvVars: ['CLOSE_API_KEY'],
  };

  isConfigured(): boolean {
    return !!process.env.CLOSE_API_KEY;
  }

  async initialize(): Promise<void> {}

  getTools(): ToolDefinition[] {
    return [
      // Leads
      {
        name: 'close_list_leads',
        description: 'List Close leads',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max leads', required: false, default: 100 },
          { name: 'query', type: 'string', description: 'Search query', required: false },
        ],
      },
      {
        name: 'close_get_lead',
        description: 'Get lead details',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID', required: true },
        ],
      },
      {
        name: 'close_create_lead',
        description: 'Create a new lead',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Company name', required: true },
          { name: 'contacts', type: 'array', description: 'Contacts array', required: false },
          { name: 'status_id', type: 'string', description: 'Lead status ID', required: false },
        ],
      },
      {
        name: 'close_update_lead',
        description: 'Update a lead',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID', required: true },
          { name: 'fields', type: 'object', description: 'Fields to update', required: true },
        ],
      },
      // Contacts
      {
        name: 'close_list_contacts',
        description: 'List contacts',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID (optional)', required: false },
        ],
      },
      {
        name: 'close_create_contact',
        description: 'Create a contact',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID', required: true },
          { name: 'name', type: 'string', description: 'Contact name', required: true },
          { name: 'emails', type: 'array', description: 'Email addresses', required: false },
          { name: 'phones', type: 'array', description: 'Phone numbers', required: false },
        ],
      },
      // Opportunities
      {
        name: 'close_list_opportunities',
        description: 'List opportunities',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID (optional)', required: false },
        ],
      },
      {
        name: 'close_create_opportunity',
        description: 'Create an opportunity',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID', required: true },
          { name: 'status_id', type: 'string', description: 'Status ID', required: true },
          { name: 'value', type: 'number', description: 'Deal value (cents)', required: false },
          { name: 'note', type: 'string', description: 'Note', required: false },
        ],
      },
      // Activities
      {
        name: 'close_list_activities',
        description: 'List activities',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID (optional)', required: false },
        ],
      },
      {
        name: 'close_create_note',
        description: 'Create a note activity',
        category: 'crm',
        integration: 'close',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'lead_id', type: 'string', description: 'Lead ID', required: true },
          { name: 'note', type: 'string', description: 'Note text', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const apiKey = credentials.accessToken || process.env.CLOSE_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'No API key. Please configure Close.' };
    }

    const baseUrl = 'https://api.close.com/api/v1';
    const auth = Buffer.from(`${apiKey}:`).toString('base64');
    const headers = {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'close_list_leads': {
          const queryParams = new URLSearchParams();
          queryParams.set('_limit', String(params.limit || 100));
          if (params.query) queryParams.set('query', params.query as string);

          const response = await fetch(`${baseUrl}/lead/?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'close_get_lead': {
          const response = await fetch(`${baseUrl}/lead/${params.lead_id}/`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'close_create_lead': {
          const body: Record<string, unknown> = { name: params.name };
          if (params.contacts) body.contacts = params.contacts;
          if (params.status_id) body.status_id = params.status_id;

          const response = await fetch(`${baseUrl}/lead/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'close_update_lead': {
          const response = await fetch(`${baseUrl}/lead/${params.lead_id}/`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(params.fields),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'close_list_contacts': {
          let url = `${baseUrl}/contact/`;
          if (params.lead_id) url += `?lead_id=${params.lead_id}`;
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'close_create_contact': {
          const body: Record<string, unknown> = {
            lead_id: params.lead_id,
            name: params.name,
          };
          if (params.emails) body.emails = params.emails;
          if (params.phones) body.phones = params.phones;

          const response = await fetch(`${baseUrl}/contact/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'close_list_opportunities': {
          let url = `${baseUrl}/opportunity/`;
          if (params.lead_id) url += `?lead_id=${params.lead_id}`;
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'close_create_opportunity': {
          const body: Record<string, unknown> = {
            lead_id: params.lead_id,
            status_id: params.status_id,
          };
          if (params.value) body.value = params.value;
          if (params.note) body.note = params.note;

          const response = await fetch(`${baseUrl}/opportunity/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'close_list_activities': {
          let url = `${baseUrl}/activity/`;
          if (params.lead_id) url += `?lead_id=${params.lead_id}`;
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'close_create_note': {
          const response = await fetch(`${baseUrl}/activity/note/`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              lead_id: params.lead_id,
              note: params.note,
            }),
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

export const closeIntegration = new CloseIntegration();
