// ===========================================
// XERO INTEGRATION
// Cloud-based accounting software
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class XeroIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'xero',
    name: 'Xero',
    description: 'Cloud-based accounting software for small businesses',
    category: 'finance',
    authType: 'oauth2',
    scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'accounting.settings'],
    requiredEnvVars: ['XERO_CLIENT_ID', 'XERO_CLIENT_SECRET'],
  };

  private clientId = process.env.XERO_CLIENT_ID;
  private clientSecret = process.env.XERO_CLIENT_SECRET;
  private redirectUri = process.env.XERO_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/xero/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(' ') || '';
    return `https://login.xero.com/identity/connect/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://identity.xero.com/connect/token', {
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

    // Get tenant ID (organization) from connections
    const connectionsResponse = await fetch('https://api.xero.com/connections', {
      headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    const connections = await connectionsResponse.json();

    return {
      integrationId: 'xero',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      metadata: {
        xeroTenantId: connections[0]?.tenantId,
        tenantName: connections[0]?.tenantName,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://identity.xero.com/connect/token', {
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
      // Contacts
      {
        name: 'xero_list_contacts',
        description: 'List Xero contacts',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
        ],
      },
      {
        name: 'xero_get_contact',
        description: 'Get contact details',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
        ],
      },
      {
        name: 'xero_create_contact',
        description: 'Create a new contact',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Contact name', required: true },
          { name: 'email', type: 'string', description: 'Email address', required: false },
          { name: 'first_name', type: 'string', description: 'First name', required: false },
          { name: 'last_name', type: 'string', description: 'Last name', required: false },
        ],
      },
      // Invoices
      {
        name: 'xero_list_invoices',
        description: 'List invoices',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
          { name: 'status', type: 'string', description: 'Invoice status', required: false },
        ],
      },
      {
        name: 'xero_get_invoice',
        description: 'Get invoice details',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
          { name: 'invoice_id', type: 'string', description: 'Invoice ID', required: true },
        ],
      },
      {
        name: 'xero_create_invoice',
        description: 'Create an invoice',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
          { name: 'contact_id', type: 'string', description: 'Contact ID', required: true },
          { name: 'line_items', type: 'array', description: 'Line items', required: true },
          { name: 'type', type: 'string', description: 'Invoice type (ACCREC or ACCPAY)', required: false },
          { name: 'due_date', type: 'string', description: 'Due date (YYYY-MM-DD)', required: false },
        ],
      },
      // Accounts
      {
        name: 'xero_list_accounts',
        description: 'List chart of accounts',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
        ],
      },
      // Bank Transactions
      {
        name: 'xero_list_bank_transactions',
        description: 'List bank transactions',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
        ],
      },
      // Payments
      {
        name: 'xero_list_payments',
        description: 'List payments',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
        ],
      },
      // Organization
      {
        name: 'xero_get_organization',
        description: 'Get organization details',
        category: 'finance',
        integration: 'xero',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'xero_tenant_id', type: 'string', description: 'Xero Tenant ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    const xeroTenantId = (params.xero_tenant_id as string) || (credentials.metadata?.xeroTenantId as string | undefined);
    if (!token) {
      return { success: false, error: 'No access token. Please connect Xero.' };
    }
    if (!xeroTenantId) {
      return { success: false, error: 'No Xero tenant ID. Please reconnect Xero.' };
    }

    const baseUrl = 'https://api.xero.com/api.xro/2.0';
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Xero-Tenant-Id': xeroTenantId,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      switch (toolName) {
        case 'xero_list_contacts': {
          const response = await fetch(`${baseUrl}/Contacts`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Contacts };
        }

        case 'xero_get_contact': {
          const response = await fetch(`${baseUrl}/Contacts/${params.contact_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Contacts[0] };
        }

        case 'xero_create_contact': {
          const contactData: Record<string, unknown> = {
            Name: params.name,
          };
          if (params.email) contactData.EmailAddress = params.email;
          if (params.first_name) contactData.FirstName = params.first_name;
          if (params.last_name) contactData.LastName = params.last_name;

          const response = await fetch(`${baseUrl}/Contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ Contacts: [contactData] }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Contacts[0] };
        }

        case 'xero_list_invoices': {
          let url = `${baseUrl}/Invoices`;
          if (params.status) url += `?where=Status=="${params.status}"`;
          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Invoices };
        }

        case 'xero_get_invoice': {
          const response = await fetch(`${baseUrl}/Invoices/${params.invoice_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Invoices[0] };
        }

        case 'xero_create_invoice': {
          const invoiceData: Record<string, unknown> = {
            Type: params.type || 'ACCREC',
            Contact: { ContactID: params.contact_id },
            LineItems: params.line_items,
          };
          if (params.due_date) invoiceData.DueDate = params.due_date;

          const response = await fetch(`${baseUrl}/Invoices`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ Invoices: [invoiceData] }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Invoices[0] };
        }

        case 'xero_list_accounts': {
          const response = await fetch(`${baseUrl}/Accounts`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Accounts };
        }

        case 'xero_list_bank_transactions': {
          const response = await fetch(`${baseUrl}/BankTransactions`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.BankTransactions };
        }

        case 'xero_list_payments': {
          const response = await fetch(`${baseUrl}/Payments`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Payments };
        }

        case 'xero_get_organization': {
          const response = await fetch(`${baseUrl}/Organisation`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Organisations[0] };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const xeroIntegration = new XeroIntegration();
