// ===========================================
// MICROSOFT TEAMS INTEGRATION
// Team collaboration and communication
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class TeamsIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Team collaboration, chat, and video meetings',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['Team.ReadBasic.All', 'Channel.ReadBasic.All', 'Chat.ReadWrite', 'ChannelMessage.Send', 'User.Read'],
    requiredEnvVars: ['TEAMS_CLIENT_ID', 'TEAMS_CLIENT_SECRET'],
  };

  private clientId = process.env.TEAMS_CLIENT_ID;
  private clientSecret = process.env.TEAMS_CLIENT_SECRET;
  private redirectUri = process.env.TEAMS_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/teams/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(' ') || '';
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${this.clientId}&response_type=code&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(scopes + ' offline_access')}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        code,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'teams',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        refresh_token: credentials.refreshToken!,
        grant_type: 'refresh_token',
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
      // Teams
      {
        name: 'teams_list_teams',
        description: 'List teams the user is a member of',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'teams_get_team',
        description: 'Get team details',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
        ],
      },
      // Channels
      {
        name: 'teams_list_channels',
        description: 'List channels in a team',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
        ],
      },
      {
        name: 'teams_get_channel',
        description: 'Get channel details',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
          { name: 'channel_id', type: 'string', description: 'Channel ID', required: true },
        ],
      },
      // Messages
      {
        name: 'teams_list_channel_messages',
        description: 'List messages in a channel',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
          { name: 'channel_id', type: 'string', description: 'Channel ID', required: true },
          { name: 'top', type: 'number', description: 'Number of messages', required: false, default: 50 },
        ],
      },
      {
        name: 'teams_send_channel_message',
        description: 'Send a message to a channel',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
          { name: 'channel_id', type: 'string', description: 'Channel ID', required: true },
          { name: 'content', type: 'string', description: 'Message content', required: true },
        ],
      },
      // Chats
      {
        name: 'teams_list_chats',
        description: 'List user chats',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'teams_get_chat',
        description: 'Get chat details',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'chat_id', type: 'string', description: 'Chat ID', required: true },
        ],
      },
      {
        name: 'teams_list_chat_messages',
        description: 'List messages in a chat',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'chat_id', type: 'string', description: 'Chat ID', required: true },
          { name: 'top', type: 'number', description: 'Number of messages', required: false, default: 50 },
        ],
      },
      {
        name: 'teams_send_chat_message',
        description: 'Send a message in a chat',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'chat_id', type: 'string', description: 'Chat ID', required: true },
          { name: 'content', type: 'string', description: 'Message content', required: true },
        ],
      },
      // User
      {
        name: 'teams_get_user',
        description: 'Get current user profile',
        category: 'communication',
        integration: 'teams',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Microsoft Teams.' };
    }

    const baseUrl = 'https://graph.microsoft.com/v1.0';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'teams_list_teams': {
          const response = await fetch(`${baseUrl}/me/joinedTeams`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.value };
        }

        case 'teams_get_team': {
          const response = await fetch(`${baseUrl}/teams/${params.team_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'teams_list_channels': {
          const response = await fetch(`${baseUrl}/teams/${params.team_id}/channels`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.value };
        }

        case 'teams_get_channel': {
          const response = await fetch(`${baseUrl}/teams/${params.team_id}/channels/${params.channel_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'teams_list_channel_messages': {
          const response = await fetch(
            `${baseUrl}/teams/${params.team_id}/channels/${params.channel_id}/messages?$top=${params.top || 50}`,
            { headers }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.value };
        }

        case 'teams_send_channel_message': {
          const response = await fetch(
            `${baseUrl}/teams/${params.team_id}/channels/${params.channel_id}/messages`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                body: { content: params.content },
              }),
            }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'teams_list_chats': {
          const response = await fetch(`${baseUrl}/me/chats`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.value };
        }

        case 'teams_get_chat': {
          const response = await fetch(`${baseUrl}/chats/${params.chat_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'teams_list_chat_messages': {
          const response = await fetch(
            `${baseUrl}/chats/${params.chat_id}/messages?$top=${params.top || 50}`,
            { headers }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.value };
        }

        case 'teams_send_chat_message': {
          const response = await fetch(
            `${baseUrl}/chats/${params.chat_id}/messages`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                body: { content: params.content },
              }),
            }
          );
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'teams_get_user': {
          const response = await fetch(`${baseUrl}/me`, { headers });
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

export const teamsIntegration = new TeamsIntegration();
