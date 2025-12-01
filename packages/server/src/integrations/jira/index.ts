// ===========================================
// JIRA INTEGRATION
// Project management and issue tracking
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class JiraIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'jira',
    name: 'Jira',
    description: 'Project management and issue tracking for teams',
    category: 'productivity',
    authType: 'oauth2',
    scopes: ['read:jira-user', 'read:jira-work', 'write:jira-work', 'offline_access'],
    requiredEnvVars: ['JIRA_CLIENT_ID', 'JIRA_CLIENT_SECRET'],
  };

  private clientId = process.env.JIRA_CLIENT_ID;
  private clientSecret = process.env.JIRA_CLIENT_SECRET;
  private redirectUri = process.env.JIRA_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/jira/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(' ') || '';
    return `https://auth.atlassian.com/authorize?audience=api.atlassian.com&client_id=${this.clientId}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${stateParam}&response_type=code&prompt=consent`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    // Get accessible resources (cloud IDs)
    const resourcesResponse = await fetch('https://api.atlassian.com/oauth/token/accessible-resources', {
      headers: { 'Authorization': `Bearer ${data.access_token}` },
    });
    const resources = await resourcesResponse.json();

    return {
      integrationId: 'jira',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      metadata: {
        cloudId: resources[0]?.id,
        siteName: resources[0]?.name,
        siteUrl: resources[0]?.url,
      },
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch('https://auth.atlassian.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: credentials.refreshToken,
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
      // Issues
      {
        name: 'jira_search_issues',
        description: 'Search issues using JQL',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'jql', type: 'string', description: 'JQL query', required: true },
          { name: 'max_results', type: 'number', description: 'Max results', required: false, default: 50 },
        ],
      },
      {
        name: 'jira_get_issue',
        description: 'Get issue details',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'issue_key', type: 'string', description: 'Issue key (e.g., PROJ-123)', required: true },
        ],
      },
      {
        name: 'jira_create_issue',
        description: 'Create a new issue',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_key', type: 'string', description: 'Project key', required: true },
          { name: 'summary', type: 'string', description: 'Issue summary', required: true },
          { name: 'issue_type', type: 'string', description: 'Issue type (Task, Bug, Story, etc)', required: true },
          { name: 'description', type: 'string', description: 'Issue description', required: false },
          { name: 'priority', type: 'string', description: 'Priority name', required: false },
          { name: 'assignee', type: 'string', description: 'Assignee account ID', required: false },
        ],
      },
      {
        name: 'jira_update_issue',
        description: 'Update an issue',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'issue_key', type: 'string', description: 'Issue key', required: true },
          { name: 'fields', type: 'object', description: 'Fields to update', required: true },
        ],
      },
      {
        name: 'jira_transition_issue',
        description: 'Transition an issue to a new status',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'issue_key', type: 'string', description: 'Issue key', required: true },
          { name: 'transition_id', type: 'string', description: 'Transition ID', required: true },
        ],
      },
      {
        name: 'jira_add_comment',
        description: 'Add a comment to an issue',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'issue_key', type: 'string', description: 'Issue key', required: true },
          { name: 'body', type: 'string', description: 'Comment body', required: true },
        ],
      },
      // Projects
      {
        name: 'jira_list_projects',
        description: 'List Jira projects',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'jira_get_project',
        description: 'Get project details',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_key', type: 'string', description: 'Project key', required: true },
        ],
      },
      // Users
      {
        name: 'jira_get_myself',
        description: 'Get current user',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'jira_search_users',
        description: 'Search for users',
        category: 'productivity',
        integration: 'jira',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    const cloudId = credentials.metadata?.cloudId;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Jira.' };
    }
    if (!cloudId) {
      return { success: false, error: 'No cloud ID. Please reconnect Jira.' };
    }

    const baseUrl = `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    try {
      switch (toolName) {
        case 'jira_search_issues': {
          const response = await fetch(`${baseUrl}/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              jql: params.jql,
              maxResults: params.max_results || 50,
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.issues };
        }

        case 'jira_get_issue': {
          const response = await fetch(`${baseUrl}/issue/${params.issue_key}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'jira_create_issue': {
          const fields: Record<string, unknown> = {
            project: { key: params.project_key },
            summary: params.summary,
            issuetype: { name: params.issue_type },
          };
          if (params.description) {
            fields.description = {
              type: 'doc',
              version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: params.description }] }],
            };
          }
          if (params.priority) fields.priority = { name: params.priority };
          if (params.assignee) fields.assignee = { accountId: params.assignee };

          const response = await fetch(`${baseUrl}/issue`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ fields }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'jira_update_issue': {
          const response = await fetch(`${baseUrl}/issue/${params.issue_key}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ fields: params.fields }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { updated: true } };
        }

        case 'jira_transition_issue': {
          const response = await fetch(`${baseUrl}/issue/${params.issue_key}/transitions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ transition: { id: params.transition_id } }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { transitioned: true } };
        }

        case 'jira_add_comment': {
          const response = await fetch(`${baseUrl}/issue/${params.issue_key}/comment`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              body: {
                type: 'doc',
                version: 1,
                content: [{ type: 'paragraph', content: [{ type: 'text', text: params.body }] }],
              },
            }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'jira_list_projects': {
          const response = await fetch(`${baseUrl}/project`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'jira_get_project': {
          const response = await fetch(`${baseUrl}/project/${params.project_key}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'jira_get_myself': {
          const response = await fetch(`${baseUrl}/myself`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'jira_search_users': {
          const response = await fetch(`${baseUrl}/user/search?query=${encodeURIComponent(params.query as string)}`, { headers });
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

export const jiraIntegration = new JiraIntegration();
