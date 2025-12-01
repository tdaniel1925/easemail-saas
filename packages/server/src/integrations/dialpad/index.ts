// ===========================================
// DIALPAD INTEGRATION
// Business phone system and contact center
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class DialpadIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'dialpad',
    name: 'Dialpad',
    description: 'Business phone system and contact center',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['calls', 'contacts', 'users', 'recordings'],
    requiredEnvVars: ['DIALPAD_CLIENT_ID', 'DIALPAD_CLIENT_SECRET'],
  };

  isConfigured(): boolean {
    return !!(process.env.DIALPAD_CLIENT_ID && process.env.DIALPAD_CLIENT_SECRET);
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: process.env.DIALPAD_CLIENT_ID!,
      redirect_uri: `${process.env.API_URL}/integrations/callback/dialpad`,
      response_type: 'code',
      state: state || tenantId,
    });

    return `https://dialpad.com/oauth2/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<IntegrationCredentials> {
    const tokenResponse = await fetch('https://dialpad.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.DIALPAD_CLIENT_ID!,
        client_secret: process.env.DIALPAD_CLIENT_SECRET!,
        redirect_uri: `${process.env.API_URL}/integrations/callback/dialpad`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // Get user info
    const userResponse = await fetch('https://dialpad.com/api/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    let email = '';
    let displayName = '';
    if (userResponse.ok) {
      const userData = await userResponse.json() as {
        email?: string;
        first_name?: string;
        last_name?: string;
      };
      email = userData.email || '';
      displayName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim();
    }

    return {
      integrationId: 'dialpad',
      tenantId: state,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      metadata: {
        email,
        displayName,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    if (!credentials.refreshToken) {
      throw new Error('No refresh token available');
    }

    const tokenResponse = await fetch('https://dialpad.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: credentials.refreshToken,
        client_id: process.env.DIALPAD_CLIENT_ID!,
        client_secret: process.env.DIALPAD_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to refresh token');
    }

    const tokens = await tokenResponse.json() as {
      access_token: string;
      expires_in: number;
    };

    return {
      ...credentials,
      accessToken: tokens.access_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'dialpad_list_calls',
        description: 'List recent Dialpad calls',
        category: 'communication',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max calls to return', required: false, default: 50 },
          { name: 'start_date', type: 'string', description: 'Start date (ISO)', required: false },
          { name: 'end_date', type: 'string', description: 'End date (ISO)', required: false },
        ],
      },
      {
        name: 'dialpad_get_call',
        description: 'Get details of a specific Dialpad call',
        category: 'communication',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'call_id', type: 'string', description: 'Call ID', required: true },
        ],
      },
      {
        name: 'dialpad_list_contacts',
        description: 'List Dialpad contacts',
        category: 'contacts',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max contacts', required: false, default: 50 },
          { name: 'search', type: 'string', description: 'Search query', required: false },
        ],
      },
      {
        name: 'dialpad_create_contact',
        description: 'Create a new Dialpad contact',
        category: 'contacts',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'first_name', type: 'string', description: 'First name', required: true },
          { name: 'last_name', type: 'string', description: 'Last name', required: false },
          { name: 'phone', type: 'string', description: 'Phone number', required: true },
          { name: 'email', type: 'string', description: 'Email address', required: false },
          { name: 'company', type: 'string', description: 'Company name', required: false },
        ],
      },
      {
        name: 'dialpad_search_contacts',
        description: 'Search Dialpad contacts',
        category: 'contacts',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
          { name: 'limit', type: 'number', description: 'Max results', required: false, default: 25 },
        ],
      },
      {
        name: 'dialpad_list_users',
        description: 'List Dialpad users in the organization',
        category: 'communication',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max users', required: false, default: 50 },
        ],
      },
      {
        name: 'dialpad_get_user',
        description: 'Get details of a specific Dialpad user',
        category: 'communication',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'user_id', type: 'string', description: 'User ID (or "me" for current user)', required: true },
        ],
      },
      {
        name: 'dialpad_list_recordings',
        description: 'List call recordings',
        category: 'communication',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max recordings', required: false, default: 50 },
          { name: 'start_date', type: 'string', description: 'Start date (ISO)', required: false },
          { name: 'end_date', type: 'string', description: 'End date (ISO)', required: false },
        ],
      },
      {
        name: 'dialpad_get_call_stats',
        description: 'Get call statistics for the organization',
        category: 'communication',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'start_date', type: 'string', description: 'Start date (ISO)', required: true },
          { name: 'end_date', type: 'string', description: 'End date (ISO)', required: true },
        ],
      },
      {
        name: 'dialpad_send_sms',
        description: 'Send an SMS via Dialpad',
        category: 'communication',
        integration: 'dialpad',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'to', type: 'string', description: 'Recipient phone number', required: true },
          { name: 'message', type: 'string', description: 'Message text', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const accessToken = credentials.accessToken;
    if (!accessToken) {
      return { success: false, error: 'No access token available' };
    }

    const baseUrl = 'https://dialpad.com/api/v2';
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'dialpad_list_calls': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.set('limit', String(params.limit));
          if (params.start_date) queryParams.set('start_date', params.start_date as string);
          if (params.end_date) queryParams.set('end_date', params.end_date as string);

          const response = await fetch(`${baseUrl}/calls?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_get_call': {
          const response = await fetch(`${baseUrl}/calls/${params.call_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_list_contacts': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.set('limit', String(params.limit));
          if (params.search) queryParams.set('q', params.search as string);

          const response = await fetch(`${baseUrl}/contacts?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_create_contact': {
          const body = {
            first_name: params.first_name,
            last_name: params.last_name,
            phones: [{ number: params.phone, type: 'work' }],
            emails: params.email ? [{ email: params.email, type: 'work' }] : [],
            company: params.company,
          };

          const response = await fetch(`${baseUrl}/contacts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_search_contacts': {
          const queryParams = new URLSearchParams({
            q: params.query as string,
            limit: String(params.limit || 25),
          });

          const response = await fetch(`${baseUrl}/contacts?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_list_users': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.set('limit', String(params.limit));

          const response = await fetch(`${baseUrl}/users?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_get_user': {
          const userId = params.user_id as string;
          const response = await fetch(`${baseUrl}/users/${userId}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_list_recordings': {
          const queryParams = new URLSearchParams();
          if (params.limit) queryParams.set('limit', String(params.limit));
          if (params.start_date) queryParams.set('start_date', params.start_date as string);
          if (params.end_date) queryParams.set('end_date', params.end_date as string);

          const response = await fetch(`${baseUrl}/recordings?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_get_call_stats': {
          const queryParams = new URLSearchParams({
            start_date: params.start_date as string,
            end_date: params.end_date as string,
          });

          const response = await fetch(`${baseUrl}/stats/calls?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'dialpad_send_sms': {
          const body = {
            to_number: params.to,
            text: params.message,
          };

          const response = await fetch(`${baseUrl}/sms`, {
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
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

export const dialpadIntegration = new DialpadIntegration();
