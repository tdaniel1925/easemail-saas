// ===========================================
// PIPEDRIVE INTEGRATION
// Sales CRM and pipeline management
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class PipedriveIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'pipedrive',
    name: 'Pipedrive',
    description: 'Sales CRM and pipeline management',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['deals:read', 'deals:write', 'contacts:read', 'contacts:write', 'activities:read', 'activities:write'],
    requiredEnvVars: ['PIPEDRIVE_CLIENT_ID', 'PIPEDRIVE_CLIENT_SECRET'],
  };

  private clientId = process.env.PIPEDRIVE_CLIENT_ID;
  private clientSecret = process.env.PIPEDRIVE_CLIENT_SECRET;
  private redirectUri = process.env.PIPEDRIVE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/pipedrive/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    return `https://oauth.pipedrive.com/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://oauth.pipedrive.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'pipedrive',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      metadata: {
        apiDomain: data.api_domain,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://oauth.pipedrive.com/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken!,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  getTools(): ToolDefinition[] {
    return [
      // Deals
      {
        name: 'pipedrive_list_deals',
        description: 'List Pipedrive deals',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max deals', required: false, default: 100 },
          { name: 'status', type: 'string', description: 'Filter by status (open, won, lost)', required: false },
        ],
      },
      {
        name: 'pipedrive_get_deal',
        description: 'Get deal details',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'deal_id', type: 'number', description: 'Deal ID', required: true },
        ],
      },
      {
        name: 'pipedrive_create_deal',
        description: 'Create a new deal',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'title', type: 'string', description: 'Deal title', required: true },
          { name: 'value', type: 'number', description: 'Deal value', required: false },
          { name: 'currency', type: 'string', description: 'Currency code', required: false },
          { name: 'person_id', type: 'number', description: 'Person ID', required: false },
          { name: 'org_id', type: 'number', description: 'Organization ID', required: false },
        ],
      },
      {
        name: 'pipedrive_update_deal',
        description: 'Update a deal',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'deal_id', type: 'number', description: 'Deal ID', required: true },
          { name: 'fields', type: 'object', description: 'Fields to update', required: true },
        ],
      },
      // Persons (Contacts)
      {
        name: 'pipedrive_list_persons',
        description: 'List Pipedrive persons/contacts',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
        ],
      },
      {
        name: 'pipedrive_create_person',
        description: 'Create a new person/contact',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Person name', required: true },
          { name: 'email', type: 'string', description: 'Email address', required: false },
          { name: 'phone', type: 'string', description: 'Phone number', required: false },
          { name: 'org_id', type: 'number', description: 'Organization ID', required: false },
        ],
      },
      // Organizations
      {
        name: 'pipedrive_list_organizations',
        description: 'List Pipedrive organizations',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
        ],
      },
      {
        name: 'pipedrive_create_organization',
        description: 'Create a new organization',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Organization name', required: true },
        ],
      },
      // Activities
      {
        name: 'pipedrive_list_activities',
        description: 'List Pipedrive activities',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
        ],
      },
      {
        name: 'pipedrive_create_activity',
        description: 'Create a new activity',
        category: 'crm',
        integration: 'pipedrive',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'subject', type: 'string', description: 'Activity subject', required: true },
          { name: 'type', type: 'string', description: 'Activity type (call, meeting, task, etc)', required: true },
          { name: 'due_date', type: 'string', description: 'Due date (YYYY-MM-DD)', required: false },
          { name: 'deal_id', type: 'number', description: 'Associated deal ID', required: false },
          { name: 'person_id', type: 'number', description: 'Associated person ID', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    const apiDomain = credentials.metadata?.apiDomain || 'api.pipedrive.com';
    if (!token) {
      return { success: false, error: 'No access token. Please connect Pipedrive.' };
    }

    const baseUrl = `https://${apiDomain}/v1`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'pipedrive_list_deals': {
          let url = `${baseUrl}/deals?limit=${params.limit || 100}`;
          if (params.status) url += `&status=${params.status}`;
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_get_deal': {
          const response = await fetch(`${baseUrl}/deals/${params.deal_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_create_deal': {
          const body: Record<string, unknown> = { title: params.title };
          if (params.value) body.value = params.value;
          if (params.currency) body.currency = params.currency;
          if (params.person_id) body.person_id = params.person_id;
          if (params.org_id) body.org_id = params.org_id;

          const response = await fetch(`${baseUrl}/deals`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_update_deal': {
          const response = await fetch(`${baseUrl}/deals/${params.deal_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(params.fields),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_list_persons': {
          const response = await fetch(`${baseUrl}/persons?limit=${params.limit || 100}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_create_person': {
          const body: Record<string, unknown> = { name: params.name };
          if (params.email) body.email = [{ value: params.email, primary: true }];
          if (params.phone) body.phone = [{ value: params.phone, primary: true }];
          if (params.org_id) body.org_id = params.org_id;

          const response = await fetch(`${baseUrl}/persons`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_list_organizations': {
          const response = await fetch(`${baseUrl}/organizations?limit=${params.limit || 100}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_create_organization': {
          const response = await fetch(`${baseUrl}/organizations`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name: params.name }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_list_activities': {
          const response = await fetch(`${baseUrl}/activities?limit=${params.limit || 100}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'pipedrive_create_activity': {
          const body: Record<string, unknown> = {
            subject: params.subject,
            type: params.type,
          };
          if (params.due_date) body.due_date = params.due_date;
          if (params.deal_id) body.deal_id = params.deal_id;
          if (params.person_id) body.person_id = params.person_id;

          const response = await fetch(`${baseUrl}/activities`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const pipedriveIntegration = new PipedriveIntegration();
