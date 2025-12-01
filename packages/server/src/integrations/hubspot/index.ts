// ===========================================
// HUBSPOT INTEGRATION
// CRM, marketing, and sales platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class HubSpotIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'hubspot',
    name: 'HubSpot',
    description: 'CRM, marketing automation, and sales platform',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write', 'crm.objects.companies.read', 'crm.objects.companies.write', 'crm.objects.deals.read', 'crm.objects.deals.write'],
    requiredEnvVars: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET'],
  };

  private clientId = process.env.HUBSPOT_CLIENT_ID;
  private clientSecret = process.env.HUBSPOT_CLIENT_SECRET;
  private redirectUri = process.env.HUBSPOT_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/hubspot/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const scopes = this.config.scopes?.join(' ') || '';
    const stateParam = state || tenantId;
    return `https://app.hubspot.com/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'hubspot',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
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
        name: 'hubspot_list_contacts',
        description: 'List HubSpot contacts',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Number of contacts', required: false, default: 100 },
          { name: 'after', type: 'string', description: 'Pagination cursor', required: false },
        ],
      },
      {
        name: 'hubspot_get_contact',
        description: 'Get a contact by ID',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
        ],
      },
      {
        name: 'hubspot_create_contact',
        description: 'Create a new contact',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email', type: 'string', description: 'Email address', required: true },
          { name: 'firstname', type: 'string', description: 'First name', required: false },
          { name: 'lastname', type: 'string', description: 'Last name', required: false },
          { name: 'phone', type: 'string', description: 'Phone number', required: false },
          { name: 'company', type: 'string', description: 'Company name', required: false },
        ],
      },
      {
        name: 'hubspot_update_contact',
        description: 'Update a contact',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
          { name: 'properties', type: 'object', description: 'Properties to update', required: true },
        ],
      },
      {
        name: 'hubspot_search_contacts',
        description: 'Search contacts',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
        ],
      },
      // Companies
      {
        name: 'hubspot_list_companies',
        description: 'List HubSpot companies',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Number of companies', required: false, default: 100 },
        ],
      },
      {
        name: 'hubspot_create_company',
        description: 'Create a new company',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Company name', required: true },
          { name: 'domain', type: 'string', description: 'Company domain', required: false },
          { name: 'industry', type: 'string', description: 'Industry', required: false },
        ],
      },
      // Deals
      {
        name: 'hubspot_list_deals',
        description: 'List HubSpot deals',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Number of deals', required: false, default: 100 },
        ],
      },
      {
        name: 'hubspot_create_deal',
        description: 'Create a new deal',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'dealname', type: 'string', description: 'Deal name', required: true },
          { name: 'amount', type: 'number', description: 'Deal amount', required: false },
          { name: 'dealstage', type: 'string', description: 'Deal stage', required: false },
          { name: 'pipeline', type: 'string', description: 'Pipeline ID', required: false },
        ],
      },
      {
        name: 'hubspot_update_deal',
        description: 'Update a deal',
        category: 'crm',
        integration: 'hubspot',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'deal_id', type: 'string', description: 'Deal ID', required: true },
          { name: 'properties', type: 'object', description: 'Properties to update', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect HubSpot.' };
    }

    const baseUrl = 'https://api.hubapi.com';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'hubspot_list_contacts': {
          const limit = params.limit || 100;
          let url = `${baseUrl}/crm/v3/objects/contacts?limit=${limit}`;
          if (params.after) url += `&after=${params.after}`;
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'hubspot_get_contact': {
          const response = await fetch(`${baseUrl}/crm/v3/objects/contacts/${params.contact_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'hubspot_create_contact': {
          const properties: Record<string, string> = { email: params.email as string };
          if (params.firstname) properties.firstname = params.firstname as string;
          if (params.lastname) properties.lastname = params.lastname as string;
          if (params.phone) properties.phone = params.phone as string;
          if (params.company) properties.company = params.company as string;

          const response = await fetch(`${baseUrl}/crm/v3/objects/contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ properties }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'hubspot_update_contact': {
          const response = await fetch(`${baseUrl}/crm/v3/objects/contacts/${params.contact_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ properties: params.properties }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'hubspot_search_contacts': {
          const response = await fetch(`${baseUrl}/crm/v3/objects/contacts/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              query: params.query,
              limit: 100,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'hubspot_list_companies': {
          const response = await fetch(`${baseUrl}/crm/v3/objects/companies?limit=${params.limit || 100}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'hubspot_create_company': {
          const properties: Record<string, string> = { name: params.name as string };
          if (params.domain) properties.domain = params.domain as string;
          if (params.industry) properties.industry = params.industry as string;

          const response = await fetch(`${baseUrl}/crm/v3/objects/companies`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ properties }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'hubspot_list_deals': {
          const response = await fetch(`${baseUrl}/crm/v3/objects/deals?limit=${params.limit || 100}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'hubspot_create_deal': {
          const properties: Record<string, unknown> = { dealname: params.dealname };
          if (params.amount) properties.amount = params.amount;
          if (params.dealstage) properties.dealstage = params.dealstage;
          if (params.pipeline) properties.pipeline = params.pipeline;

          const response = await fetch(`${baseUrl}/crm/v3/objects/deals`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ properties }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'hubspot_update_deal': {
          const response = await fetch(`${baseUrl}/crm/v3/objects/deals/${params.deal_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ properties: params.properties }),
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

export const hubspotIntegration = new HubSpotIntegration();
