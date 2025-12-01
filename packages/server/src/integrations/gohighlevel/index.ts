// ===========================================
// GOHIGHLEVEL INTEGRATION
// All-in-one marketing and CRM platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class GoHighLevelIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'gohighlevel',
    name: 'GoHighLevel',
    description: 'All-in-one marketing, CRM, and automation platform',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['contacts.readonly', 'contacts.write', 'opportunities.readonly', 'opportunities.write'],
    requiredEnvVars: ['GOHIGHLEVEL_CLIENT_ID', 'GOHIGHLEVEL_CLIENT_SECRET'],
  };

  private clientId = process.env.GOHIGHLEVEL_CLIENT_ID;
  private clientSecret = process.env.GOHIGHLEVEL_CLIENT_SECRET;
  private redirectUri = process.env.GOHIGHLEVEL_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/gohighlevel/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(' ') || '';
    return `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'gohighlevel',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      metadata: {
        locationId: data.locationId,
        companyId: data.companyId,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
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
      // Contacts
      {
        name: 'ghl_list_contacts',
        description: 'List GoHighLevel contacts',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'location_id', type: 'string', description: 'Location ID', required: true },
          { name: 'limit', type: 'number', description: 'Max contacts', required: false, default: 100 },
          { name: 'query', type: 'string', description: 'Search query', required: false },
        ],
      },
      {
        name: 'ghl_get_contact',
        description: 'Get contact details',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
        ],
      },
      {
        name: 'ghl_create_contact',
        description: 'Create a new contact',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'location_id', type: 'string', description: 'Location ID', required: true },
          { name: 'email', type: 'string', description: 'Email', required: false },
          { name: 'phone', type: 'string', description: 'Phone', required: false },
          { name: 'firstName', type: 'string', description: 'First name', required: false },
          { name: 'lastName', type: 'string', description: 'Last name', required: false },
        ],
      },
      {
        name: 'ghl_update_contact',
        description: 'Update a contact',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
          { name: 'fields', type: 'object', description: 'Fields to update', required: true },
        ],
      },
      // Opportunities
      {
        name: 'ghl_list_opportunities',
        description: 'List opportunities',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'location_id', type: 'string', description: 'Location ID', required: true },
          { name: 'pipeline_id', type: 'string', description: 'Pipeline ID', required: false },
        ],
      },
      {
        name: 'ghl_create_opportunity',
        description: 'Create an opportunity',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'location_id', type: 'string', description: 'Location ID', required: true },
          { name: 'name', type: 'string', description: 'Opportunity name', required: true },
          { name: 'pipeline_id', type: 'string', description: 'Pipeline ID', required: true },
          { name: 'stage_id', type: 'string', description: 'Stage ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: false },
          { name: 'monetaryValue', type: 'number', description: 'Deal value', required: false },
        ],
      },
      {
        name: 'ghl_update_opportunity',
        description: 'Update an opportunity',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'opportunity_id', type: 'string', description: 'Opportunity ID', required: true },
          { name: 'fields', type: 'object', description: 'Fields to update', required: true },
        ],
      },
      // Pipelines
      {
        name: 'ghl_list_pipelines',
        description: 'List pipelines',
        category: 'crm',
        integration: 'gohighlevel',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'location_id', type: 'string', description: 'Location ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect GoHighLevel.' };
    }

    const baseUrl = 'https://services.leadconnectorhq.com';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Version': '2021-07-28',
    };

    try {
      switch (toolName) {
        case 'ghl_list_contacts': {
          const queryParams = new URLSearchParams();
          queryParams.set('locationId', params.location_id as string);
          queryParams.set('limit', String(params.limit || 100));
          if (params.query) queryParams.set('query', params.query as string);

          const response = await fetch(`${baseUrl}/contacts/?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.contacts };
        }

        case 'ghl_get_contact': {
          const response = await fetch(`${baseUrl}/contacts/${params.contact_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.contact };
        }

        case 'ghl_create_contact': {
          const body: Record<string, unknown> = { locationId: params.location_id };
          if (params.email) body.email = params.email;
          if (params.phone) body.phone = params.phone;
          if (params.firstName) body.firstName = params.firstName;
          if (params.lastName) body.lastName = params.lastName;

          const response = await fetch(`${baseUrl}/contacts/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.contact };
        }

        case 'ghl_update_contact': {
          const response = await fetch(`${baseUrl}/contacts/${params.contact_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(params.fields),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.contact };
        }

        case 'ghl_list_opportunities': {
          const queryParams = new URLSearchParams();
          queryParams.set('location_id', params.location_id as string);
          if (params.pipeline_id) queryParams.set('pipeline_id', params.pipeline_id as string);

          const response = await fetch(`${baseUrl}/opportunities/search?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.opportunities };
        }

        case 'ghl_create_opportunity': {
          const body: Record<string, unknown> = {
            locationId: params.location_id,
            name: params.name,
            pipelineId: params.pipeline_id,
            pipelineStageId: params.stage_id,
          };
          if (params.contact_id) body.contactId = params.contact_id;
          if (params.monetaryValue) body.monetaryValue = params.monetaryValue;

          const response = await fetch(`${baseUrl}/opportunities/`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.opportunity };
        }

        case 'ghl_update_opportunity': {
          const response = await fetch(`${baseUrl}/opportunities/${params.opportunity_id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(params.fields),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.opportunity };
        }

        case 'ghl_list_pipelines': {
          const response = await fetch(`${baseUrl}/opportunities/pipelines?locationId=${params.location_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.pipelines };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const gohighlevelIntegration = new GoHighLevelIntegration();
