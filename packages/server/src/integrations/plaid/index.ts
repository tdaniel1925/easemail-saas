// ===========================================
// PLAID INTEGRATION
// Financial data and banking connectivity
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class PlaidIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'plaid',
    name: 'Plaid',
    description: 'Financial data connectivity for banking and investments',
    category: 'finance',
    authType: 'api_key',
    requiredEnvVars: ['PLAID_CLIENT_ID', 'PLAID_SECRET'],
  };

  private clientId = process.env.PLAID_CLIENT_ID;
  private secret = process.env.PLAID_SECRET;
  private environment = process.env.PLAID_ENV || 'sandbox';

  isConfigured(): boolean {
    return !!(this.clientId && this.secret);
  }

  async initialize(): Promise<void> {}

  private getBaseUrl(): string {
    switch (this.environment) {
      case 'production': return 'https://production.plaid.com';
      case 'development': return 'https://development.plaid.com';
      default: return 'https://sandbox.plaid.com';
    }
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'plaid_create_link_token',
        description: 'Create a Plaid Link token for connecting accounts',
        category: 'finance',
        integration: 'plaid',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'user_id', type: 'string', description: 'User ID', required: true },
          { name: 'products', type: 'array', description: 'Products (transactions, auth, identity)', required: false },
        ],
      },
      {
        name: 'plaid_exchange_token',
        description: 'Exchange public token for access token',
        category: 'finance',
        integration: 'plaid',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'public_token', type: 'string', description: 'Public token from Link', required: true },
        ],
      },
      {
        name: 'plaid_get_accounts',
        description: 'Get linked bank accounts',
        category: 'finance',
        integration: 'plaid',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'access_token', type: 'string', description: 'Plaid access token', required: true },
        ],
      },
      {
        name: 'plaid_get_transactions',
        description: 'Get account transactions',
        category: 'finance',
        integration: 'plaid',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'access_token', type: 'string', description: 'Plaid access token', required: true },
          { name: 'start_date', type: 'string', description: 'Start date (YYYY-MM-DD)', required: true },
          { name: 'end_date', type: 'string', description: 'End date (YYYY-MM-DD)', required: true },
        ],
      },
      {
        name: 'plaid_get_balance',
        description: 'Get account balances',
        category: 'finance',
        integration: 'plaid',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'access_token', type: 'string', description: 'Plaid access token', required: true },
        ],
      },
      {
        name: 'plaid_get_identity',
        description: 'Get account holder identity',
        category: 'finance',
        integration: 'plaid',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'access_token', type: 'string', description: 'Plaid access token', required: true },
        ],
      },
      {
        name: 'plaid_get_auth',
        description: 'Get account and routing numbers',
        category: 'finance',
        integration: 'plaid',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'access_token', type: 'string', description: 'Plaid access token', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, _credentials: IntegrationCredentials): Promise<ToolResult> {
    if (!this.clientId || !this.secret) {
      return { success: false, error: 'Plaid not configured. Missing client_id or secret.' };
    }

    const baseUrl = this.getBaseUrl();
    const headers = {
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'plaid_create_link_token': {
          const response = await fetch(`${baseUrl}/link/token/create`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              client_id: this.clientId,
              secret: this.secret,
              user: { client_user_id: params.user_id },
              client_name: 'BotMakers',
              products: params.products || ['transactions'],
              country_codes: ['US'],
              language: 'en',
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'plaid_exchange_token': {
          const response = await fetch(`${baseUrl}/item/public_token/exchange`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              client_id: this.clientId,
              secret: this.secret,
              public_token: params.public_token,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'plaid_get_accounts': {
          const response = await fetch(`${baseUrl}/accounts/get`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              client_id: this.clientId,
              secret: this.secret,
              access_token: params.access_token,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.accounts };
        }

        case 'plaid_get_transactions': {
          const response = await fetch(`${baseUrl}/transactions/get`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              client_id: this.clientId,
              secret: this.secret,
              access_token: params.access_token,
              start_date: params.start_date,
              end_date: params.end_date,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.transactions };
        }

        case 'plaid_get_balance': {
          const response = await fetch(`${baseUrl}/accounts/balance/get`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              client_id: this.clientId,
              secret: this.secret,
              access_token: params.access_token,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.accounts };
        }

        case 'plaid_get_identity': {
          const response = await fetch(`${baseUrl}/identity/get`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              client_id: this.clientId,
              secret: this.secret,
              access_token: params.access_token,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.accounts };
        }

        case 'plaid_get_auth': {
          const response = await fetch(`${baseUrl}/auth/get`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              client_id: this.clientId,
              secret: this.secret,
              access_token: params.access_token,
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

export const plaidIntegration = new PlaidIntegration();
