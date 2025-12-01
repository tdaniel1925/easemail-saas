// ===========================================
// GITLAB INTEGRATION
// DevOps platform for code hosting and CI/CD
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class GitLabIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'gitlab',
    name: 'GitLab',
    description: 'DevOps platform for code hosting, CI/CD, and collaboration',
    category: 'developer',
    authType: 'oauth2',
    scopes: ['api', 'read_user', 'read_repository'],
    requiredEnvVars: ['GITLAB_CLIENT_ID', 'GITLAB_CLIENT_SECRET'],
  };

  private clientId = process.env.GITLAB_CLIENT_ID;
  private clientSecret = process.env.GITLAB_CLIENT_SECRET;
  private redirectUri = process.env.GITLAB_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/gitlab/callback`;
  private gitlabUrl = process.env.GITLAB_URL || 'https://gitlab.com';

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(' ') || '';
    return `${this.gitlabUrl}/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch(`${this.gitlabUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'gitlab',
      tenantId: _state,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  }

  async refreshToken(credentials: IntegrationCredentials): Promise<IntegrationCredentials> {
    const response = await fetch(`${this.gitlabUrl}/oauth/token`, {
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
      // Projects
      {
        name: 'gitlab_list_projects',
        description: 'List GitLab projects',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owned', type: 'boolean', description: 'Only owned projects', required: false },
          { name: 'membership', type: 'boolean', description: 'Projects user is member of', required: false },
          { name: 'per_page', type: 'number', description: 'Results per page', required: false, default: 20 },
        ],
      },
      {
        name: 'gitlab_get_project',
        description: 'Get project details',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID or path', required: true },
        ],
      },
      // Issues
      {
        name: 'gitlab_list_issues',
        description: 'List project issues',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'state', type: 'string', description: 'Issue state (opened, closed, all)', required: false },
          { name: 'labels', type: 'string', description: 'Labels (comma-separated)', required: false },
        ],
      },
      {
        name: 'gitlab_get_issue',
        description: 'Get issue details',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'issue_iid', type: 'number', description: 'Issue IID', required: true },
        ],
      },
      {
        name: 'gitlab_create_issue',
        description: 'Create an issue',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'title', type: 'string', description: 'Issue title', required: true },
          { name: 'description', type: 'string', description: 'Issue description', required: false },
          { name: 'labels', type: 'string', description: 'Labels (comma-separated)', required: false },
          { name: 'assignee_ids', type: 'array', description: 'Assignee user IDs', required: false },
        ],
      },
      // Merge Requests
      {
        name: 'gitlab_list_merge_requests',
        description: 'List merge requests',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'state', type: 'string', description: 'MR state (opened, closed, merged, all)', required: false },
        ],
      },
      {
        name: 'gitlab_get_merge_request',
        description: 'Get merge request details',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'merge_request_iid', type: 'number', description: 'MR IID', required: true },
        ],
      },
      {
        name: 'gitlab_create_merge_request',
        description: 'Create a merge request',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'source_branch', type: 'string', description: 'Source branch', required: true },
          { name: 'target_branch', type: 'string', description: 'Target branch', required: true },
          { name: 'title', type: 'string', description: 'MR title', required: true },
          { name: 'description', type: 'string', description: 'MR description', required: false },
        ],
      },
      // Pipelines
      {
        name: 'gitlab_list_pipelines',
        description: 'List project pipelines',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'project_id', type: 'string', description: 'Project ID', required: true },
          { name: 'status', type: 'string', description: 'Pipeline status', required: false },
        ],
      },
      // User
      {
        name: 'gitlab_get_user',
        description: 'Get current user',
        category: 'developer',
        integration: 'gitlab',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect GitLab.' };
    }

    const baseUrl = `${this.gitlabUrl}/api/v4`;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    try {
      switch (toolName) {
        case 'gitlab_list_projects': {
          const queryParams = new URLSearchParams();
          if (params.owned) queryParams.set('owned', 'true');
          if (params.membership) queryParams.set('membership', 'true');
          queryParams.set('per_page', String(params.per_page || 20));

          const response = await fetch(`${baseUrl}/projects?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_get_project': {
          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_list_issues': {
          const queryParams = new URLSearchParams();
          if (params.state) queryParams.set('state', params.state as string);
          if (params.labels) queryParams.set('labels', params.labels as string);

          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}/issues?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_get_issue': {
          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}/issues/${params.issue_iid}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_create_issue': {
          const body: Record<string, unknown> = { title: params.title };
          if (params.description) body.description = params.description;
          if (params.labels) body.labels = params.labels;
          if (params.assignee_ids) body.assignee_ids = params.assignee_ids;

          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}/issues`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_list_merge_requests': {
          const queryParams = new URLSearchParams();
          if (params.state) queryParams.set('state', params.state as string);

          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}/merge_requests?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_get_merge_request': {
          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}/merge_requests/${params.merge_request_iid}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_create_merge_request': {
          const body: Record<string, unknown> = {
            source_branch: params.source_branch,
            target_branch: params.target_branch,
            title: params.title,
          };
          if (params.description) body.description = params.description;

          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}/merge_requests`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_list_pipelines': {
          const queryParams = new URLSearchParams();
          if (params.status) queryParams.set('status', params.status as string);

          const response = await fetch(`${baseUrl}/projects/${encodeURIComponent(params.project_id as string)}/pipelines?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'gitlab_get_user': {
          const response = await fetch(`${baseUrl}/user`, { headers });
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

export const gitlabIntegration = new GitLabIntegration();
