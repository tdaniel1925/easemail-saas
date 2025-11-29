// ===========================================
// MICROSOFT GRAPH INTEGRATION
// Teams, SharePoint, OneDrive, and more
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
  FileItem,
  TeamsChannel,
  TeamsMessage,
} from '../types.js';

// MS Graph base URL
const GRAPH_API_BASE = 'https://graph.microsoft.com/v1.0';

class MSGraphIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'msgraph',
    name: 'Microsoft 365',
    description: 'Teams, SharePoint, OneDrive via Microsoft Graph API',
    category: 'communication',
    authType: 'oauth2',
    scopes: [
      'User.Read',
      'Mail.ReadWrite',
      'Calendars.ReadWrite',
      'Files.ReadWrite.All',
      'Sites.ReadWrite.All',
      'Team.ReadBasic.All',
      'Channel.ReadBasic.All',
      'ChannelMessage.Read.All',
      'ChannelMessage.Send',
      'Chat.ReadWrite',
    ],
    requiredEnvVars: ['MSGRAPH_CLIENT_ID', 'MSGRAPH_CLIENT_SECRET', 'MSGRAPH_TENANT_ID'],
  };

  isConfigured(): boolean {
    return !!(
      process.env.MSGRAPH_CLIENT_ID &&
      process.env.MSGRAPH_CLIENT_SECRET &&
      process.env.MSGRAPH_TENANT_ID
    );
  }

  async initialize(): Promise<void> {
    // MS Graph doesn't need initialization beyond config check
  }

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const params = new URLSearchParams({
      client_id: process.env.MSGRAPH_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: process.env.MSGRAPH_CALLBACK_URL || `${process.env.OAUTH_CALLBACK_URL}/msgraph`,
      scope: this.config.scopes!.join(' '),
      state: state || tenantId,
      response_mode: 'query',
    });

    const msftTenantId = process.env.MSGRAPH_TENANT_ID || 'common';
    return `https://login.microsoftonline.com/${msftTenantId}/oauth2/v2.0/authorize?${params}`;
  }

  async handleCallback(code: string, state: string): Promise<IntegrationCredentials> {
    const msftTenantId = process.env.MSGRAPH_TENANT_ID || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${msftTenantId}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MSGRAPH_CLIENT_ID!,
        client_secret: process.env.MSGRAPH_CLIENT_SECRET!,
        code,
        redirect_uri: process.env.MSGRAPH_CALLBACK_URL || `${process.env.OAUTH_CALLBACK_URL}/msgraph`,
        grant_type: 'authorization_code',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to exchange code');
    }

    // Get user info
    const userResponse = await fetch(`${GRAPH_API_BASE}/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const user = await userResponse.json();

    return {
      integrationId: 'msgraph',
      tenantId: state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      metadata: {
        email: user.mail || user.userPrincipalName,
        displayName: user.displayName,
        msftTenantId: msftTenantId,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const msftTenantId = (credentials.metadata?.msftTenantId as string) || process.env.MSGRAPH_TENANT_ID || 'common';
    const tokenUrl = `https://login.microsoftonline.com/${msftTenantId}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.MSGRAPH_CLIENT_ID!,
        client_secret: process.env.MSGRAPH_CLIENT_SECRET!,
        refresh_token: credentials.refreshToken!,
        grant_type: 'refresh_token',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || 'Failed to refresh token');
    }

    return {
      ...credentials,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || credentials.refreshToken,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  getTools(): ToolDefinition[] {
    return [
      // Teams tools
      {
        name: 'msgraph_list_teams',
        description: 'List all Teams the user is a member of',
        category: 'communication',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'msgraph_list_channels',
        description: 'List channels in a Team',
        category: 'communication',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
        ],
      },
      {
        name: 'msgraph_get_channel_messages',
        description: 'Get messages from a Teams channel',
        category: 'communication',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
          { name: 'channel_id', type: 'string', description: 'Channel ID', required: true },
          { name: 'limit', type: 'number', description: 'Max messages', required: false, default: 50 },
        ],
      },
      {
        name: 'msgraph_send_channel_message',
        description: 'Send a message to a Teams channel',
        category: 'communication',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
          { name: 'channel_id', type: 'string', description: 'Channel ID', required: true },
          { name: 'content', type: 'string', description: 'Message content', required: true },
        ],
      },
      // OneDrive tools
      {
        name: 'msgraph_list_drive_files',
        description: 'List files in OneDrive root or folder',
        category: 'files',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'folder_path', type: 'string', description: 'Folder path (empty for root)', required: false },
        ],
      },
      {
        name: 'msgraph_get_file_content',
        description: 'Get content of a text file from OneDrive',
        category: 'files',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'file_path', type: 'string', description: 'File path in OneDrive', required: true },
        ],
      },
      {
        name: 'msgraph_upload_file',
        description: 'Upload a file to OneDrive',
        category: 'files',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'file_path', type: 'string', description: 'Destination path in OneDrive', required: true },
          { name: 'content', type: 'string', description: 'File content', required: true },
        ],
      },
      {
        name: 'msgraph_search_files',
        description: 'Search files in OneDrive',
        category: 'files',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
        ],
      },
      // SharePoint tools
      {
        name: 'msgraph_list_sharepoint_sites',
        description: 'List SharePoint sites',
        category: 'files',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'msgraph_list_site_files',
        description: 'List files in a SharePoint site',
        category: 'files',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'site_id', type: 'string', description: 'SharePoint site ID', required: true },
          { name: 'folder_path', type: 'string', description: 'Folder path', required: false },
        ],
      },
      // User/Profile tools
      {
        name: 'msgraph_get_user_profile',
        description: 'Get current user profile from Microsoft 365',
        category: 'contacts',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'msgraph_search_users',
        description: 'Search users in the organization',
        category: 'contacts',
        integration: 'msgraph',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const startTime = Date.now();

    try {
      let result: unknown;

      switch (toolName) {
        // Teams
        case 'msgraph_list_teams':
          result = await this.listTeams(credentials);
          break;
        case 'msgraph_list_channels':
          result = await this.listChannels(credentials, params.team_id as string);
          break;
        case 'msgraph_get_channel_messages':
          result = await this.getChannelMessages(
            credentials,
            params.team_id as string,
            params.channel_id as string,
            params.limit as number
          );
          break;
        case 'msgraph_send_channel_message':
          result = await this.sendChannelMessage(
            credentials,
            params.team_id as string,
            params.channel_id as string,
            params.content as string
          );
          break;

        // OneDrive
        case 'msgraph_list_drive_files':
          result = await this.listDriveFiles(credentials, params.folder_path as string);
          break;
        case 'msgraph_get_file_content':
          result = await this.getFileContent(credentials, params.file_path as string);
          break;
        case 'msgraph_upload_file':
          result = await this.uploadFile(credentials, params.file_path as string, params.content as string);
          break;
        case 'msgraph_search_files':
          result = await this.searchFiles(credentials, params.query as string);
          break;

        // SharePoint
        case 'msgraph_list_sharepoint_sites':
          result = await this.listSharePointSites(credentials);
          break;
        case 'msgraph_list_site_files':
          result = await this.listSiteFiles(credentials, params.site_id as string, params.folder_path as string);
          break;

        // User
        case 'msgraph_get_user_profile':
          result = await this.getUserProfile(credentials);
          break;
        case 'msgraph_search_users':
          result = await this.searchUsers(credentials, params.query as string);
          break;

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }

      return {
        success: true,
        data: result,
        metadata: {
          integration: 'msgraph',
          tool: toolName,
          duration: Date.now() - startTime,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          integration: 'msgraph',
          tool: toolName,
          duration: Date.now() - startTime,
        },
      };
    }
  }

  // ===========================================
  // TEAMS METHODS
  // ===========================================

  private async listTeams(credentials: IntegrationCredentials): Promise<unknown> {
    const response = await this.graphRequest(credentials, '/me/joinedTeams');
    return response.value;
  }

  private async listChannels(credentials: IntegrationCredentials, teamId: string): Promise<TeamsChannel[]> {
    const response = await this.graphRequest(credentials, `/teams/${teamId}/channels`);
    return response.value.map((c: Record<string, unknown>) => ({
      id: c.id,
      displayName: c.displayName,
      description: c.description,
      teamId,
    }));
  }

  private async getChannelMessages(
    credentials: IntegrationCredentials,
    teamId: string,
    channelId: string,
    limit = 50
  ): Promise<TeamsMessage[]> {
    const response = await this.graphRequest(
      credentials,
      `/teams/${teamId}/channels/${channelId}/messages?$top=${limit}`
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.value.map((m: any) => ({
      id: m.id,
      content: m.body?.content || '',
      from: {
        displayName: m.from?.user?.displayName || 'Unknown',
      },
      createdAt: new Date(m.createdDateTime as string),
      channelId,
    }));
  }

  private async sendChannelMessage(
    credentials: IntegrationCredentials,
    teamId: string,
    channelId: string,
    content: string
  ): Promise<unknown> {
    return this.graphRequest(
      credentials,
      `/teams/${teamId}/channels/${channelId}/messages`,
      'POST',
      {
        body: {
          contentType: 'html',
          content,
        },
      }
    );
  }

  // ===========================================
  // ONEDRIVE METHODS
  // ===========================================

  private async listDriveFiles(credentials: IntegrationCredentials, folderPath?: string): Promise<FileItem[]> {
    const path = folderPath ? `/me/drive/root:/${folderPath}:/children` : '/me/drive/root/children';
    const response = await this.graphRequest(credentials, path);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.value.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.parentReference?.path || '',
      mimeType: f.file?.mimeType,
      size: f.size,
      createdAt: f.createdDateTime ? new Date(f.createdDateTime as string) : undefined,
      modifiedAt: f.lastModifiedDateTime ? new Date(f.lastModifiedDateTime as string) : undefined,
      isFolder: !!f.folder,
      webUrl: f.webUrl,
    }));
  }

  private async getFileContent(credentials: IntegrationCredentials, filePath: string): Promise<string> {
    const response = await this.graphRequest(credentials, `/me/drive/root:/${filePath}:/content`, 'GET', undefined, true);
    return response;
  }

  private async uploadFile(credentials: IntegrationCredentials, filePath: string, content: string): Promise<unknown> {
    return this.graphRequest(
      credentials,
      `/me/drive/root:/${filePath}:/content`,
      'PUT',
      content,
      false,
      'text/plain'
    );
  }

  private async searchFiles(credentials: IntegrationCredentials, query: string): Promise<FileItem[]> {
    const response = await this.graphRequest(credentials, `/me/drive/root/search(q='${encodeURIComponent(query)}')`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.value.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.parentReference?.path || '',
      isFolder: !!f.folder,
      webUrl: f.webUrl,
    }));
  }

  // ===========================================
  // SHAREPOINT METHODS
  // ===========================================

  private async listSharePointSites(credentials: IntegrationCredentials): Promise<unknown> {
    const response = await this.graphRequest(credentials, '/sites?search=*');
    return response.value;
  }

  private async listSiteFiles(credentials: IntegrationCredentials, siteId: string, folderPath?: string): Promise<FileItem[]> {
    const path = folderPath
      ? `/sites/${siteId}/drive/root:/${folderPath}:/children`
      : `/sites/${siteId}/drive/root/children`;
    const response = await this.graphRequest(credentials, path);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return response.value.map((f: any) => ({
      id: f.id,
      name: f.name,
      path: f.parentReference?.path || '',
      isFolder: !!f.folder,
      webUrl: f.webUrl,
    }));
  }

  // ===========================================
  // USER METHODS
  // ===========================================

  private async getUserProfile(credentials: IntegrationCredentials): Promise<unknown> {
    return this.graphRequest(credentials, '/me');
  }

  private async searchUsers(credentials: IntegrationCredentials, query: string): Promise<unknown> {
    const response = await this.graphRequest(
      credentials,
      `/users?$filter=startswith(displayName,'${encodeURIComponent(query)}') or startswith(mail,'${encodeURIComponent(query)}')`
    );
    return response.value;
  }

  // ===========================================
  // HELPER METHODS
  // ===========================================

  private async graphRequest(
    credentials: IntegrationCredentials,
    endpoint: string,
    method: string = 'GET',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any,
    rawResponse = false,
    contentType = 'application/json'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${GRAPH_API_BASE}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${credentials.accessToken}`,
    };

    if (body && !rawResponse) {
      headers['Content-Type'] = contentType;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? (contentType === 'application/json' ? JSON.stringify(body) : body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.error?.message || error.message || 'Graph API error');
    }

    if (rawResponse) {
      return response.text();
    }

    return response.json();
  }
}

export const msGraphIntegration = new MSGraphIntegration();
