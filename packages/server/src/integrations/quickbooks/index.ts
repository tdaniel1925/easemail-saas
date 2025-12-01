// ===========================================
// QUICKBOOKS INTEGRATION
// Small business accounting software
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class QuickBooksIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Small business accounting and financial management',
    category: 'finance',
    authType: 'oauth2',
    scopes: ['com.intuit.quickbooks.accounting'],
    requiredEnvVars: ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET'],
  };

  private clientId = process.env.QUICKBOOKS_CLIENT_ID;
  private clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;
  private redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/quickbooks/callback`;
  private environment = process.env.QUICKBOOKS_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(' ') || 'com.intuit.quickbooks.accounting';
    return `https://appcenter.intuit.com/connect/oauth2?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    // Extract realmId from the callback URL (passed in state or query params)
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
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
      integrationId: 'quickbooks',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
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
      // Company
      {
        name: 'quickbooks_get_company_info',
        description: 'Get QuickBooks company info',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
        ],
      },
      // Customers
      {
        name: 'quickbooks_list_customers',
        description: 'List QuickBooks customers',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'max_results', type: 'number', description: 'Max results', required: false, default: 100 },
        ],
      },
      {
        name: 'quickbooks_get_customer',
        description: 'Get customer details',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'customer_id', type: 'string', description: 'Customer ID', required: true },
        ],
      },
      {
        name: 'quickbooks_create_customer',
        description: 'Create a new customer',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'display_name', type: 'string', description: 'Display name', required: true },
          { name: 'email', type: 'string', description: 'Email address', required: false },
          { name: 'phone', type: 'string', description: 'Phone number', required: false },
        ],
      },
      // Invoices
      {
        name: 'quickbooks_list_invoices',
        description: 'List invoices',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'max_results', type: 'number', description: 'Max results', required: false, default: 100 },
        ],
      },
      {
        name: 'quickbooks_get_invoice',
        description: 'Get invoice details',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'invoice_id', type: 'string', description: 'Invoice ID', required: true },
        ],
      },
      {
        name: 'quickbooks_create_invoice',
        description: 'Create an invoice',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'customer_id', type: 'string', description: 'Customer ID', required: true },
          { name: 'line_items', type: 'array', description: 'Line items', required: true },
        ],
      },
      // Accounts
      {
        name: 'quickbooks_list_accounts',
        description: 'List chart of accounts',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
        ],
      },
      // Payments
      {
        name: 'quickbooks_list_payments',
        description: 'List payments received',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'max_results', type: 'number', description: 'Max results', required: false, default: 100 },
        ],
      },
      // Reports
      {
        name: 'quickbooks_profit_loss_report',
        description: 'Get profit and loss report',
        category: 'finance',
        integration: 'quickbooks',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'realm_id', type: 'string', description: 'QuickBooks Realm ID', required: true },
          { name: 'start_date', type: 'string', description: 'Start date (YYYY-MM-DD)', required: false },
          { name: 'end_date', type: 'string', description: 'End date (YYYY-MM-DD)', required: false },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    const realmId = params.realm_id as string;
    if (!token) {
      return { success: false, error: 'No access token. Please connect QuickBooks.' };
    }

    const baseUrl = this.environment === 'production'
      ? `https://quickbooks.api.intuit.com/v3/company/${realmId}`
      : `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}`;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      switch (toolName) {
        case 'quickbooks_get_company_info': {
          const response = await fetch(`${baseUrl}/companyinfo/${realmId}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.CompanyInfo };
        }

        case 'quickbooks_list_customers': {
          const query = `SELECT * FROM Customer MAXRESULTS ${params.max_results || 100}`;
          const response = await fetch(`${baseUrl}/query?query=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.QueryResponse.Customer || [] };
        }

        case 'quickbooks_get_customer': {
          const response = await fetch(`${baseUrl}/customer/${params.customer_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Customer };
        }

        case 'quickbooks_create_customer': {
          const customerData: Record<string, unknown> = {
            DisplayName: params.display_name,
          };
          if (params.email) {
            customerData.PrimaryEmailAddr = { Address: params.email };
          }
          if (params.phone) {
            customerData.PrimaryPhone = { FreeFormNumber: params.phone };
          }

          const response = await fetch(`${baseUrl}/customer`, {
            method: 'POST',
            headers,
            body: JSON.stringify(customerData),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Customer };
        }

        case 'quickbooks_list_invoices': {
          const query = `SELECT * FROM Invoice MAXRESULTS ${params.max_results || 100}`;
          const response = await fetch(`${baseUrl}/query?query=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.QueryResponse.Invoice || [] };
        }

        case 'quickbooks_get_invoice': {
          const response = await fetch(`${baseUrl}/invoice/${params.invoice_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Invoice };
        }

        case 'quickbooks_create_invoice': {
          const invoiceData = {
            CustomerRef: { value: params.customer_id },
            Line: params.line_items,
          };

          const response = await fetch(`${baseUrl}/invoice`, {
            method: 'POST',
            headers,
            body: JSON.stringify(invoiceData),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.Invoice };
        }

        case 'quickbooks_list_accounts': {
          const query = 'SELECT * FROM Account';
          const response = await fetch(`${baseUrl}/query?query=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.QueryResponse.Account || [] };
        }

        case 'quickbooks_list_payments': {
          const query = `SELECT * FROM Payment MAXRESULTS ${params.max_results || 100}`;
          const response = await fetch(`${baseUrl}/query?query=${encodeURIComponent(query)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.QueryResponse.Payment || [] };
        }

        case 'quickbooks_profit_loss_report': {
          let url = `${baseUrl}/reports/ProfitAndLoss`;
          const queryParams = new URLSearchParams();
          if (params.start_date) queryParams.set('start_date', params.start_date as string);
          if (params.end_date) queryParams.set('end_date', params.end_date as string);
          if (queryParams.toString()) url += `?${queryParams}`;

          const response = await fetch(url, { headers });
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

export const quickbooksIntegration = new QuickBooksIntegration();
