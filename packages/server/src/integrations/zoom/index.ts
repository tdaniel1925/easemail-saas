// ===========================================
// ZOOM INTEGRATION
// Video conferencing and meetings
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class ZoomIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'zoom',
    name: 'Zoom',
    description: 'Video conferencing and meetings platform',
    category: 'communication',
    authType: 'oauth2',
    scopes: ['meeting:read', 'meeting:write', 'user:read', 'recording:read'],
    requiredEnvVars: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
  };

  private clientId = process.env.ZOOM_CLIENT_ID;
  private clientSecret = process.env.ZOOM_CLIENT_SECRET;
  private redirectUri = process.env.ZOOM_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/zoom/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    return `https://zoom.us/oauth/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://zoom.us/oauth/token', {
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
    if (data.error) throw new Error(data.error);

    return {
      integrationId: 'zoom',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://zoom.us/oauth/token', {
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
      {
        name: 'zoom_list_meetings',
        description: 'List Zoom meetings',
        category: 'communication',
        integration: 'zoom',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'type', type: 'string', description: 'Meeting type (scheduled, live, upcoming)', required: false },
        ],
      },
      {
        name: 'zoom_get_meeting',
        description: 'Get Zoom meeting details',
        category: 'communication',
        integration: 'zoom',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'meeting_id', type: 'string', description: 'Meeting ID', required: true },
        ],
      },
      {
        name: 'zoom_create_meeting',
        description: 'Create a new Zoom meeting',
        category: 'communication',
        integration: 'zoom',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'topic', type: 'string', description: 'Meeting topic', required: true },
          { name: 'start_time', type: 'string', description: 'Start time (ISO)', required: true },
          { name: 'duration', type: 'number', description: 'Duration in minutes', required: false, default: 60 },
          { name: 'timezone', type: 'string', description: 'Timezone', required: false },
          { name: 'agenda', type: 'string', description: 'Meeting agenda', required: false },
        ],
      },
      {
        name: 'zoom_delete_meeting',
        description: 'Delete a Zoom meeting',
        category: 'communication',
        integration: 'zoom',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'meeting_id', type: 'string', description: 'Meeting ID', required: true },
        ],
      },
      {
        name: 'zoom_list_recordings',
        description: 'List Zoom cloud recordings',
        category: 'communication',
        integration: 'zoom',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'from', type: 'string', description: 'Start date (YYYY-MM-DD)', required: false },
          { name: 'to', type: 'string', description: 'End date (YYYY-MM-DD)', required: false },
        ],
      },
      {
        name: 'zoom_get_user',
        description: 'Get current Zoom user info',
        category: 'communication',
        integration: 'zoom',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Zoom.' };
    }

    const baseUrl = 'https://api.zoom.us/v2';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'zoom_list_meetings': {
          const type = params.type || 'scheduled';
          const response = await fetch(`${baseUrl}/users/me/meetings?type=${type}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.meetings };
        }

        case 'zoom_get_meeting': {
          const response = await fetch(`${baseUrl}/meetings/${params.meeting_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'zoom_create_meeting': {
          const body = {
            topic: params.topic,
            type: 2, // Scheduled meeting
            start_time: params.start_time,
            duration: params.duration || 60,
            timezone: params.timezone || 'UTC',
            agenda: params.agenda,
          };

          const response = await fetch(`${baseUrl}/users/me/meetings`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'zoom_delete_meeting': {
          const response = await fetch(`${baseUrl}/meetings/${params.meeting_id}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok && response.status !== 204) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        case 'zoom_list_recordings': {
          let url = `${baseUrl}/users/me/recordings`;
          const queryParams = new URLSearchParams();
          if (params.from) queryParams.set('from', params.from as string);
          if (params.to) queryParams.set('to', params.to as string);
          if (queryParams.toString()) url += `?${queryParams}`;

          const response = await fetch(url, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.meetings };
        }

        case 'zoom_get_user': {
          const response = await fetch(`${baseUrl}/users/me`, { headers });
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

export const zoomIntegration = new ZoomIntegration();
