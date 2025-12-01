// ===========================================
// STRIPE INTEGRATION
// Payment processing and billing
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class StripeIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing, billing, and financial infrastructure',
    category: 'finance',
    authType: 'oauth2',
    scopes: ['read_write'],
    requiredEnvVars: ['STRIPE_CLIENT_ID', 'STRIPE_SECRET_KEY'],
  };

  private clientId = process.env.STRIPE_CLIENT_ID;
  private secretKey = process.env.STRIPE_SECRET_KEY;
  private redirectUri = process.env.STRIPE_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/stripe/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.secretKey);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    return `https://connect.stripe.com/oauth/authorize?response_type=code&client_id=${this.clientId}&scope=read_write&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_secret: this.secretKey!,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'stripe',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      metadata: {
        stripeUserId: data.stripe_user_id,
        livemode: data.livemode,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://connect.stripe.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken!,
        client_secret: this.secretKey!,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  getTools(): ToolDefinition[] {
    return [
      // Customers
      {
        name: 'stripe_list_customers',
        description: 'List Stripe customers',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max customers', required: false, default: 100 },
          { name: 'email', type: 'string', description: 'Filter by email', required: false },
        ],
      },
      {
        name: 'stripe_get_customer',
        description: 'Get customer details',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'customer_id', type: 'string', description: 'Customer ID', required: true },
        ],
      },
      {
        name: 'stripe_create_customer',
        description: 'Create a new customer',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'email', type: 'string', description: 'Customer email', required: true },
          { name: 'name', type: 'string', description: 'Customer name', required: false },
          { name: 'description', type: 'string', description: 'Description', required: false },
        ],
      },
      // Payments
      {
        name: 'stripe_list_payments',
        description: 'List payment intents',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
          { name: 'customer', type: 'string', description: 'Customer ID', required: false },
        ],
      },
      {
        name: 'stripe_get_payment',
        description: 'Get payment intent details',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'payment_id', type: 'string', description: 'Payment Intent ID', required: true },
        ],
      },
      {
        name: 'stripe_create_payment_intent',
        description: 'Create a payment intent',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'amount', type: 'number', description: 'Amount in cents', required: true },
          { name: 'currency', type: 'string', description: 'Currency code', required: true },
          { name: 'customer', type: 'string', description: 'Customer ID', required: false },
          { name: 'description', type: 'string', description: 'Description', required: false },
        ],
      },
      // Invoices
      {
        name: 'stripe_list_invoices',
        description: 'List invoices',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
          { name: 'customer', type: 'string', description: 'Customer ID', required: false },
          { name: 'status', type: 'string', description: 'Invoice status', required: false },
        ],
      },
      {
        name: 'stripe_create_invoice',
        description: 'Create an invoice',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'customer', type: 'string', description: 'Customer ID', required: true },
          { name: 'auto_advance', type: 'boolean', description: 'Auto-advance to finalize', required: false },
        ],
      },
      // Subscriptions
      {
        name: 'stripe_list_subscriptions',
        description: 'List subscriptions',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 100 },
          { name: 'customer', type: 'string', description: 'Customer ID', required: false },
          { name: 'status', type: 'string', description: 'Subscription status', required: false },
        ],
      },
      {
        name: 'stripe_get_subscription',
        description: 'Get subscription details',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'subscription_id', type: 'string', description: 'Subscription ID', required: true },
        ],
      },
      // Balance
      {
        name: 'stripe_get_balance',
        description: 'Get account balance',
        category: 'finance',
        integration: 'stripe',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Stripe.' };
    }

    const baseUrl = 'https://api.stripe.com/v1';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    try {
      switch (toolName) {
        case 'stripe_list_customers': {
          const queryParams = new URLSearchParams();
          queryParams.set('limit', String(params.limit || 100));
          if (params.email) queryParams.set('email', params.email as string);

          const response = await fetch(`${baseUrl}/customers?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'stripe_get_customer': {
          const response = await fetch(`${baseUrl}/customers/${params.customer_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'stripe_create_customer': {
          const body = new URLSearchParams();
          body.set('email', params.email as string);
          if (params.name) body.set('name', params.name as string);
          if (params.description) body.set('description', params.description as string);

          const response = await fetch(`${baseUrl}/customers`, {
            method: 'POST',
            headers,
            body,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'stripe_list_payments': {
          const queryParams = new URLSearchParams();
          queryParams.set('limit', String(params.limit || 100));
          if (params.customer) queryParams.set('customer', params.customer as string);

          const response = await fetch(`${baseUrl}/payment_intents?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'stripe_get_payment': {
          const response = await fetch(`${baseUrl}/payment_intents/${params.payment_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'stripe_create_payment_intent': {
          const body = new URLSearchParams();
          body.set('amount', String(params.amount));
          body.set('currency', params.currency as string);
          if (params.customer) body.set('customer', params.customer as string);
          if (params.description) body.set('description', params.description as string);

          const response = await fetch(`${baseUrl}/payment_intents`, {
            method: 'POST',
            headers,
            body,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'stripe_list_invoices': {
          const queryParams = new URLSearchParams();
          queryParams.set('limit', String(params.limit || 100));
          if (params.customer) queryParams.set('customer', params.customer as string);
          if (params.status) queryParams.set('status', params.status as string);

          const response = await fetch(`${baseUrl}/invoices?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'stripe_create_invoice': {
          const body = new URLSearchParams();
          body.set('customer', params.customer as string);
          if (params.auto_advance !== undefined) body.set('auto_advance', String(params.auto_advance));

          const response = await fetch(`${baseUrl}/invoices`, {
            method: 'POST',
            headers,
            body,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'stripe_list_subscriptions': {
          const queryParams = new URLSearchParams();
          queryParams.set('limit', String(params.limit || 100));
          if (params.customer) queryParams.set('customer', params.customer as string);
          if (params.status) queryParams.set('status', params.status as string);

          const response = await fetch(`${baseUrl}/subscriptions?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'stripe_get_subscription': {
          const response = await fetch(`${baseUrl}/subscriptions/${params.subscription_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'stripe_get_balance': {
          const response = await fetch(`${baseUrl}/balance`, { headers });
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

export const stripeIntegration = new StripeIntegration();
