// ===========================================
// ASANA INTEGRATION
// Work management and project tracking
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class AsanaIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'asana',
    name: 'Asana',
    description: 'Work management and project tracking platform',
    category: 'productivity',
    authType: 'oauth2',
    scopes: ['default'],
    requiredEnvVars: ['ASANA_CLIENT_ID', 'ASANA_CLIENT_SECRET'],
  };

  private clientId = process.env.ASANA_CLIENT_ID;
  private clientSecret = process.env.ASANA_CLIENT_SECRET;
  private redirectUri = process.env.ASANA_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/asana/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    return `https://app.asana.com/-/oauth_authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        redirect_uri: this.redirectUri,
        code,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return {
      integrationId: 'asana',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://app.asana.com/-/oauth_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
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
        name: 'asana_list_workspaces',
        description: 'List Asana workspaces',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'asana_list_projects',
        description: 'List projects in a workspace',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'workspace_gid', type: 'string', description: 'Workspace GID', required: true },
        ],
      },
      {
        name: 'asana_get_project',
        description: 'Get project details',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_gid', type: 'string', description: 'Project GID', required: true },
        ],
      },
      {
        name: 'asana_list_tasks',
        description: 'List tasks in a project',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_gid', type: 'string', description: 'Project GID', required: true },
        ],
      },
      {
        name: 'asana_get_task',
        description: 'Get task details',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'task_gid', type: 'string', description: 'Task GID', required: true },
        ],
      },
      {
        name: 'asana_create_task',
        description: 'Create a new task',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'workspace_gid', type: 'string', description: 'Workspace GID', required: true },
          { name: 'name', type: 'string', description: 'Task name', required: true },
          { name: 'notes', type: 'string', description: 'Task notes/description', required: false },
          { name: 'due_on', type: 'string', description: 'Due date (YYYY-MM-DD)', required: false },
          { name: 'project_gid', type: 'string', description: 'Project GID to add to', required: false },
          { name: 'assignee', type: 'string', description: 'Assignee GID or email', required: false },
        ],
      },
      {
        name: 'asana_update_task',
        description: 'Update a task',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'task_gid', type: 'string', description: 'Task GID', required: true },
          { name: 'name', type: 'string', description: 'Task name', required: false },
          { name: 'notes', type: 'string', description: 'Task notes', required: false },
          { name: 'due_on', type: 'string', description: 'Due date', required: false },
          { name: 'completed', type: 'boolean', description: 'Mark as completed', required: false },
        ],
      },
      {
        name: 'asana_delete_task',
        description: 'Delete a task',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'task_gid', type: 'string', description: 'Task GID', required: true },
        ],
      },
      {
        name: 'asana_search_tasks',
        description: 'Search tasks in a workspace',
        category: 'productivity',
        integration: 'asana',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'workspace_gid', type: 'string', description: 'Workspace GID', required: true },
          { name: 'text', type: 'string', description: 'Search text', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Asana.' };
    }

    const baseUrl = 'https://app.asana.com/api/1.0';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'asana_list_workspaces': {
          const response = await fetch(`${baseUrl}/workspaces`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'asana_list_projects': {
          const response = await fetch(`${baseUrl}/workspaces/${params.workspace_gid}/projects`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'asana_get_project': {
          const response = await fetch(`${baseUrl}/projects/${params.project_gid}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'asana_list_tasks': {
          const response = await fetch(`${baseUrl}/projects/${params.project_gid}/tasks`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'asana_get_task': {
          const response = await fetch(`${baseUrl}/tasks/${params.task_gid}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'asana_create_task': {
          const taskData: Record<string, unknown> = {
            workspace: params.workspace_gid,
            name: params.name,
          };
          if (params.notes) taskData.notes = params.notes;
          if (params.due_on) taskData.due_on = params.due_on;
          if (params.project_gid) taskData.projects = [params.project_gid];
          if (params.assignee) taskData.assignee = params.assignee;

          const response = await fetch(`${baseUrl}/tasks`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ data: taskData }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'asana_update_task': {
          const taskData: Record<string, unknown> = {};
          if (params.name) taskData.name = params.name;
          if (params.notes) taskData.notes = params.notes;
          if (params.due_on) taskData.due_on = params.due_on;
          if (params.completed !== undefined) taskData.completed = params.completed;

          const response = await fetch(`${baseUrl}/tasks/${params.task_gid}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ data: taskData }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        case 'asana_delete_task': {
          const response = await fetch(`${baseUrl}/tasks/${params.task_gid}`, {
            method: 'DELETE',
            headers,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        case 'asana_search_tasks': {
          const searchParams = new URLSearchParams({
            'text': params.text as string,
          });
          const response = await fetch(`${baseUrl}/workspaces/${params.workspace_gid}/tasks/search?${searchParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.data };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const asanaIntegration = new AsanaIntegration();
