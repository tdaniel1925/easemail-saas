// ===========================================
// AIRTABLE INTEGRATION
// Spreadsheet-database hybrid platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class AirtableIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'airtable',
    name: 'Airtable',
    description: 'Spreadsheet-database hybrid for organizing data',
    category: 'files',
    authType: 'oauth2',
    scopes: ['data.records:read', 'data.records:write', 'schema.bases:read'],
    requiredEnvVars: ['AIRTABLE_CLIENT_ID', 'AIRTABLE_CLIENT_SECRET'],
  };

  private clientId = process.env.AIRTABLE_CLIENT_ID;
  private clientSecret = process.env.AIRTABLE_CLIENT_SECRET;
  private redirectUri = process.env.AIRTABLE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/airtable/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const scopes = this.config.scopes?.join(' ') || '';
    const stateParam = state || tenantId;
    return `https://airtable.com/oauth2/v1/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://airtable.com/oauth2/v1/token', {
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
      integrationId: 'airtable',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://airtable.com/oauth2/v1/token', {
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
      {
        name: 'airtable_list_bases',
        description: 'List Airtable bases',
        category: 'productivity',
        integration: 'airtable',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'airtable_get_base_schema',
        description: 'Get schema of an Airtable base',
        category: 'productivity',
        integration: 'airtable',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'base_id', type: 'string', description: 'Base ID', required: true },
        ],
      },
      {
        name: 'airtable_list_records',
        description: 'List records from an Airtable table',
        category: 'productivity',
        integration: 'airtable',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { name: 'table_id', type: 'string', description: 'Table ID or name', required: true },
          { name: 'max_records', type: 'number', description: 'Max records to return', required: false, default: 100 },
          { name: 'view', type: 'string', description: 'View name or ID', required: false },
        ],
      },
      {
        name: 'airtable_get_record',
        description: 'Get a single Airtable record',
        category: 'productivity',
        integration: 'airtable',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { name: 'table_id', type: 'string', description: 'Table ID or name', required: true },
          { name: 'record_id', type: 'string', description: 'Record ID', required: true },
        ],
      },
      {
        name: 'airtable_create_record',
        description: 'Create a new Airtable record',
        category: 'productivity',
        integration: 'airtable',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { name: 'table_id', type: 'string', description: 'Table ID or name', required: true },
          { name: 'fields', type: 'object', description: 'Record fields', required: true },
        ],
      },
      {
        name: 'airtable_update_record',
        description: 'Update an Airtable record',
        category: 'productivity',
        integration: 'airtable',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { name: 'table_id', type: 'string', description: 'Table ID or name', required: true },
          { name: 'record_id', type: 'string', description: 'Record ID', required: true },
          { name: 'fields', type: 'object', description: 'Fields to update', required: true },
        ],
      },
      {
        name: 'airtable_delete_record',
        description: 'Delete an Airtable record',
        category: 'productivity',
        integration: 'airtable',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'base_id', type: 'string', description: 'Base ID', required: true },
          { name: 'table_id', type: 'string', description: 'Table ID or name', required: true },
          { name: 'record_id', type: 'string', description: 'Record ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Airtable.' };
    }

    const baseUrl = 'https://api.airtable.com/v0';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'airtable_list_bases': {
          const response = await fetch(`${baseUrl}/meta/bases`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.bases };
        }

        case 'airtable_get_base_schema': {
          const response = await fetch(`${baseUrl}/meta/bases/${params.base_id}/tables`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.tables };
        }

        case 'airtable_list_records': {
          const queryParams = new URLSearchParams();
          if (params.max_records) queryParams.set('maxRecords', String(params.max_records));
          if (params.view) queryParams.set('view', params.view as string);

          const response = await fetch(
            `${baseUrl}/${params.base_id}/${encodeURIComponent(params.table_id as string)}?${queryParams}`,
            { headers }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.records };
        }

        case 'airtable_get_record': {
          const response = await fetch(
            `${baseUrl}/${params.base_id}/${encodeURIComponent(params.table_id as string)}/${params.record_id}`,
            { headers }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'airtable_create_record': {
          const response = await fetch(
            `${baseUrl}/${params.base_id}/${encodeURIComponent(params.table_id as string)}`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({ fields: params.fields }),
            }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'airtable_update_record': {
          const response = await fetch(
            `${baseUrl}/${params.base_id}/${encodeURIComponent(params.table_id as string)}/${params.record_id}`,
            {
              method: 'PATCH',
              headers,
              body: JSON.stringify({ fields: params.fields }),
            }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'airtable_delete_record': {
          const response = await fetch(
            `${baseUrl}/${params.base_id}/${encodeURIComponent(params.table_id as string)}/${params.record_id}`,
            { method: 'DELETE', headers }
          );
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

export const airtableIntegration = new AirtableIntegration();
