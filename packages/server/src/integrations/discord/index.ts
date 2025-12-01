// ===========================================
// DISCORD INTEGRATION
// Community messaging and voice platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class DiscordIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'discord',
    name: 'Discord',
    description: 'Community messaging and voice platform',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['identify', 'guilds', 'guilds.members.read', 'messages.read'],
    requiredEnvVars: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
  };

  private clientId = process.env.DISCORD_CLIENT_ID;
  private clientSecret = process.env.DISCORD_CLIENT_SECRET;
  private redirectUri = process.env.DISCORD_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/discord/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const scopes = this.config.scopes?.join(' ') || '';
    const stateParam = state || tenantId;
    return `https://discord.com/api/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://discord.com/api/oauth2/token', {
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
      integrationId: 'discord',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://discord.com/api/oauth2/token', {
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
      {
        name: 'discord_list_guilds',
        description: 'List Discord servers (guilds) the bot has access to',
        category: 'communication',
        integration: 'discord',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'discord_get_guild',
        description: 'Get Discord server details',
        category: 'communication',
        integration: 'discord',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'guild_id', type: 'string', description: 'Guild/Server ID', required: true },
        ],
      },
      {
        name: 'discord_list_channels',
        description: 'List channels in a Discord server',
        category: 'communication',
        integration: 'discord',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'guild_id', type: 'string', description: 'Guild/Server ID', required: true },
        ],
      },
      {
        name: 'discord_send_message',
        description: 'Send a message to a Discord channel',
        category: 'communication',
        integration: 'discord',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'channel_id', type: 'string', description: 'Channel ID', required: true },
          { name: 'content', type: 'string', description: 'Message content', required: true },
        ],
      },
      {
        name: 'discord_get_messages',
        description: 'Get messages from a Discord channel',
        category: 'communication',
        integration: 'discord',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'channel_id', type: 'string', description: 'Channel ID', required: true },
          { name: 'limit', type: 'number', description: 'Max messages (1-100)', required: false, default: 50 },
        ],
      },
      {
        name: 'discord_list_members',
        description: 'List members in a Discord server',
        category: 'communication',
        integration: 'discord',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'guild_id', type: 'string', description: 'Guild/Server ID', required: true },
          { name: 'limit', type: 'number', description: 'Max members', required: false, default: 100 },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Discord.' };
    }

    const baseUrl = 'https://discord.com/api/v10';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'discord_list_guilds': {
          const response = await fetch(`${baseUrl}/users/@me/guilds`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'discord_get_guild': {
          const response = await fetch(`${baseUrl}/guilds/${params.guild_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'discord_list_channels': {
          const response = await fetch(`${baseUrl}/guilds/${params.guild_id}/channels`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'discord_send_message': {
          const response = await fetch(`${baseUrl}/channels/${params.channel_id}/messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ content: params.content }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'discord_get_messages': {
          const limit = Math.min(params.limit as number || 50, 100);
          const response = await fetch(`${baseUrl}/channels/${params.channel_id}/messages?limit=${limit}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'discord_list_members': {
          const response = await fetch(`${baseUrl}/guilds/${params.guild_id}/members?limit=${params.limit || 100}`, { headers });
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

export const discordIntegration = new DiscordIntegration();
