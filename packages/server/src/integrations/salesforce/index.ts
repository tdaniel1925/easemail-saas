// ===========================================
// SALESFORCE INTEGRATION
// Enterprise CRM platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class SalesforceIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Enterprise CRM and business platform',
    category: 'crm',
    authType: 'oauth2',
    scopes: ['api', 'refresh_token'],
    requiredEnvVars: ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET'],
  };

  private clientId = process.env.SALESFORCE_CLIENT_ID;
  private clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  private redirectUri = process.env.SALESFORCE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/salesforce/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    return `https://login.salesforce.com/services/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
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
      integrationId: 'salesforce',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      metadata: {
        instanceUrl: data.instance_url,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://login.salesforce.com/services/oauth2/token', {
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
      metadata: {
        ...credentials.metadata,
        instanceUrl: data.instance_url || credentials.metadata?.instanceUrl,
      },
    };
  }

  getTools(): ToolDefinition[] {
    return [
      // Query
      {
        name: 'salesforce_query',
        description: 'Execute a SOQL query',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'SOQL query', required: true },
        ],
      },
      // Accounts
      {
        name: 'salesforce_list_accounts',
        description: 'List Salesforce accounts',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max records', required: false, default: 100 },
        ],
      },
      {
        name: 'salesforce_get_account',
        description: 'Get account by ID',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'account_id', type: 'string', description: 'Account ID', required: true },
        ],
      },
      {
        name: 'salesforce_create_account',
        description: 'Create a new account',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'Name', type: 'string', description: 'Account name', required: true },
          { name: 'fields', type: 'object', description: 'Additional fields', required: false },
        ],
      },
      // Contacts
      {
        name: 'salesforce_list_contacts',
        description: 'List Salesforce contacts',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max records', required: false, default: 100 },
        ],
      },
      {
        name: 'salesforce_create_contact',
        description: 'Create a new contact',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'LastName', type: 'string', description: 'Last name', required: true },
          { name: 'FirstName', type: 'string', description: 'First name', required: false },
          { name: 'Email', type: 'string', description: 'Email', required: false },
          { name: 'AccountId', type: 'string', description: 'Account ID', required: false },
        ],
      },
      // Opportunities
      {
        name: 'salesforce_list_opportunities',
        description: 'List Salesforce opportunities',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max records', required: false, default: 100 },
        ],
      },
      {
        name: 'salesforce_create_opportunity',
        description: 'Create a new opportunity',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'Name', type: 'string', description: 'Opportunity name', required: true },
          { name: 'StageName', type: 'string', description: 'Stage name', required: true },
          { name: 'CloseDate', type: 'string', description: 'Close date (YYYY-MM-DD)', required: true },
          { name: 'Amount', type: 'number', description: 'Amount', required: false },
          { name: 'AccountId', type: 'string', description: 'Account ID', required: false },
        ],
      },
      {
        name: 'salesforce_update_opportunity',
        description: 'Update an opportunity',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'opportunity_id', type: 'string', description: 'Opportunity ID', required: true },
          { name: 'fields', type: 'object', description: 'Fields to update', required: true },
        ],
      },
      // Leads
      {
        name: 'salesforce_list_leads',
        description: 'List Salesforce leads',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max records', required: false, default: 100 },
        ],
      },
      {
        name: 'salesforce_create_lead',
        description: 'Create a new lead',
        category: 'crm',
        integration: 'salesforce',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'LastName', type: 'string', description: 'Last name', required: true },
          { name: 'Company', type: 'string', description: 'Company', required: true },
          { name: 'FirstName', type: 'string', description: 'First name', required: false },
          { name: 'Email', type: 'string', description: 'Email', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    const instanceUrl = credentials.metadata?.instanceUrl;
    if (!token || !instanceUrl) {
      return { success: false, error: 'No access token or instance URL. Please connect Salesforce.' };
    }

    const baseUrl = `${instanceUrl}/services/data/v58.0`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'salesforce_query': {
          const response = await fetch(`${baseUrl}/query?q=${encodeURIComponent(params.query as string)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.records };
        }

        case 'salesforce_list_accounts': {
          const query = `SELECT Id, Name, Industry, Website, Phone FROM Account LIMIT ${params.limit || 100}`;
          const response = await fetch(`${baseUrl}/query?q=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.records };
        }

        case 'salesforce_get_account': {
          const response = await fetch(`${baseUrl}/sobjects/Account/${params.account_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'salesforce_create_account': {
          const body: Record<string, unknown> = { Name: params.Name };
          if (params.fields) Object.assign(body, params.fields);

          const response = await fetch(`${baseUrl}/sobjects/Account`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'salesforce_list_contacts': {
          const query = `SELECT Id, FirstName, LastName, Email, Phone, AccountId FROM Contact LIMIT ${params.limit || 100}`;
          const response = await fetch(`${baseUrl}/query?q=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.records };
        }

        case 'salesforce_create_contact': {
          const body: Record<string, unknown> = { LastName: params.LastName };
          if (params.FirstName) body.FirstName = params.FirstName;
          if (params.Email) body.Email = params.Email;
          if (params.AccountId) body.AccountId = params.AccountId;

          const response = await fetch(`${baseUrl}/sobjects/Contact`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'salesforce_list_opportunities': {
          const query = `SELECT Id, Name, StageName, Amount, CloseDate, AccountId FROM Opportunity LIMIT ${params.limit || 100}`;
          const response = await fetch(`${baseUrl}/query?q=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.records };
        }

        case 'salesforce_create_opportunity': {
          const body: Record<string, unknown> = {
            Name: params.Name,
            StageName: params.StageName,
            CloseDate: params.CloseDate,
          };
          if (params.Amount) body.Amount = params.Amount;
          if (params.AccountId) body.AccountId = params.AccountId;

          const response = await fetch(`${baseUrl}/sobjects/Opportunity`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'salesforce_update_opportunity': {
          const response = await fetch(`${baseUrl}/sobjects/Opportunity/${params.opportunity_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(params.fields),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { updated: true } };
        }

        case 'salesforce_list_leads': {
          const query = `SELECT Id, FirstName, LastName, Company, Email, Status FROM Lead LIMIT ${params.limit || 100}`;
          const response = await fetch(`${baseUrl}/query?q=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.records };
        }

        case 'salesforce_create_lead': {
          const body: Record<string, unknown> = {
            LastName: params.LastName,
            Company: params.Company,
          };
          if (params.FirstName) body.FirstName = params.FirstName;
          if (params.Email) body.Email = params.Email;

          const response = await fetch(`${baseUrl}/sobjects/Lead`, {
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

export const salesforceIntegration = new SalesforceIntegration();
