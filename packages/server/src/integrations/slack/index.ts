// ===========================================
// SLACK INTEGRATION
// Team communication and collaboration
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class SlackIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and collaboration platform',
    category: 'communication',
    authType: 'oauth2',
    scopes: [
      'channels:read',
      'channels:write',
      'chat:write',
      'users:read',
      'groups:read',
      'im:read',
      'mpim:read',
    ],
    requiredEnvVars: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
  };

  private clientId = process.env.SLACK_CLIENT_ID;
  private clientSecret = process.env.SLACK_CLIENT_SECRET;
  private redirectUri = process.env.SLACK_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/slack/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const scopes = this.config.scopes?.join(',') || '';
    const stateParam = state || tenantId;
    return `https://slack.com/oauth/v2/authorize?client_id=${this.clientId}&scope=${scopes}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(data.error || 'OAuth failed');
    }

    return {
      integrationId: 'slack',
      tenantId: _state,
      accessToken: data.access_token,
      metadata: {
        teamId: data.team?.id,
        teamName: data.team?.name,
        botUserId: data.bot_user_id,
      },
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'slack_list_channels',
        description: 'List Slack channels',
        category: 'communication',
        integration: 'slack',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max channels', required: false, default: 100 },
        ],
      },
      {
        name: 'slack_send_message',
        description: 'Send a message to a Slack channel',
        category: 'communication',
        integration: 'slack',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'channel', type: 'string', description: 'Channel ID or name', required: true },
          { name: 'text', type: 'string', description: 'Message text', required: true },
          { name: 'thread_ts', type: 'string', description: 'Thread timestamp for replies', required: false },
        ],
      },
      {
        name: 'slack_get_channel_history',
        description: 'Get message history from a channel',
        category: 'communication',
        integration: 'slack',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'channel', type: 'string', description: 'Channel ID', required: true },
          { name: 'limit', type: 'number', description: 'Max messages', required: false, default: 50 },
        ],
      },
      {
        name: 'slack_list_users',
        description: 'List Slack workspace users',
        category: 'communication',
        integration: 'slack',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max users', required: false, default: 100 },
        ],
      },
      {
        name: 'slack_get_user',
        description: 'Get Slack user info',
        category: 'communication',
        integration: 'slack',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'user_id', type: 'string', description: 'User ID', required: true },
        ],
      },
      {
        name: 'slack_search_messages',
        description: 'Search messages in Slack',
        category: 'communication',
        integration: 'slack',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
          { name: 'count', type: 'number', description: 'Max results', required: false, default: 20 },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Slack.' };
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'slack_list_channels': {
          const response = await fetch(`https://slack.com/api/conversations.list?limit=${params.limit || 100}`, { headers });
          const data = await response.json();
          if (!data.ok) throw new Error(data.error);
          return { success: true, data: data.channels };
        }

        case 'slack_send_message': {
          const body: Record<string, unknown> = {
            channel: params.channel,
            text: params.text,
          };
          if (params.thread_ts) body.thread_ts = params.thread_ts;

          const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          const data = await response.json();
          if (!data.ok) throw new Error(data.error);
          return { success: true, data };
        }

        case 'slack_get_channel_history': {
          const response = await fetch(
            `https://slack.com/api/conversations.history?channel=${params.channel}&limit=${params.limit || 50}`,
            { headers }
          );
          const data = await response.json();
          if (!data.ok) throw new Error(data.error);
          return { success: true, data: data.messages };
        }

        case 'slack_list_users': {
          const response = await fetch(`https://slack.com/api/users.list?limit=${params.limit || 100}`, { headers });
          const data = await response.json();
          if (!data.ok) throw new Error(data.error);
          return { success: true, data: data.members };
        }

        case 'slack_get_user': {
          const response = await fetch(`https://slack.com/api/users.info?user=${params.user_id}`, { headers });
          const data = await response.json();
          if (!data.ok) throw new Error(data.error);
          return { success: true, data: data.user };
        }

        case 'slack_search_messages': {
          const response = await fetch(
            `https://slack.com/api/search.messages?query=${encodeURIComponent(params.query as string)}&count=${params.count || 20}`,
            { headers }
          );
          const data = await response.json();
          if (!data.ok) throw new Error(data.error);
          return { success: true, data: data.messages };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const slackIntegration = new SlackIntegration();
