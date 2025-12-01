// ===========================================
// GITHUB INTEGRATION
// Code hosting and collaboration platform
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class GitHubIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'github',
    name: 'GitHub',
    description: 'Code hosting, version control, and collaboration',
    category: 'developer',
    authType: 'oauth2',
    scopes: ['repo', 'read:user', 'read:org'],
    requiredEnvVars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
  };

  private clientId = process.env.GITHUB_CLIENT_ID;
  private clientSecret = process.env.GITHUB_CLIENT_SECRET;
  private redirectUri = process.env.GITHUB_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/github/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(' ') || '';
    return `https://github.com/login/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'github',
      tenantId: _state,
      accessToken: data.access_token,
      // GitHub tokens don't expire by default
    };
  }

  getTools(): ToolDefinition[] {
    return [
      // Repos
      {
        name: 'github_list_repos',
        description: 'List repositories for authenticated user',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'type', type: 'string', description: 'Type (all, owner, public, private, member)', required: false },
          { name: 'sort', type: 'string', description: 'Sort by (created, updated, pushed, full_name)', required: false },
          { name: 'per_page', type: 'number', description: 'Results per page', required: false, default: 30 },
        ],
      },
      {
        name: 'github_get_repo',
        description: 'Get a repository',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
        ],
      },
      {
        name: 'github_create_repo',
        description: 'Create a repository',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'name', type: 'string', description: 'Repository name', required: true },
          { name: 'description', type: 'string', description: 'Description', required: false },
          { name: 'private', type: 'boolean', description: 'Private repository', required: false },
        ],
      },
      // Issues
      {
        name: 'github_list_issues',
        description: 'List issues for a repository',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'state', type: 'string', description: 'State (open, closed, all)', required: false },
          { name: 'labels', type: 'string', description: 'Labels (comma-separated)', required: false },
        ],
      },
      {
        name: 'github_get_issue',
        description: 'Get an issue',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'issue_number', type: 'number', description: 'Issue number', required: true },
        ],
      },
      {
        name: 'github_create_issue',
        description: 'Create an issue',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'title', type: 'string', description: 'Issue title', required: true },
          { name: 'body', type: 'string', description: 'Issue body', required: false },
          { name: 'labels', type: 'array', description: 'Labels', required: false },
          { name: 'assignees', type: 'array', description: 'Assignees', required: false },
        ],
      },
      {
        name: 'github_update_issue',
        description: 'Update an issue',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'issue_number', type: 'number', description: 'Issue number', required: true },
          { name: 'title', type: 'string', description: 'New title', required: false },
          { name: 'body', type: 'string', description: 'New body', required: false },
          { name: 'state', type: 'string', description: 'State (open, closed)', required: false },
        ],
      },
      // Pull Requests
      {
        name: 'github_list_pull_requests',
        description: 'List pull requests',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'state', type: 'string', description: 'State (open, closed, all)', required: false },
        ],
      },
      {
        name: 'github_get_pull_request',
        description: 'Get a pull request',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'pull_number', type: 'number', description: 'Pull request number', required: true },
        ],
      },
      {
        name: 'github_create_pull_request',
        description: 'Create a pull request',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'owner', type: 'string', description: 'Repository owner', required: true },
          { name: 'repo', type: 'string', description: 'Repository name', required: true },
          { name: 'title', type: 'string', description: 'PR title', required: true },
          { name: 'head', type: 'string', description: 'Head branch', required: true },
          { name: 'base', type: 'string', description: 'Base branch', required: true },
          { name: 'body', type: 'string', description: 'PR body', required: false },
        ],
      },
      // User
      {
        name: 'github_get_user',
        description: 'Get authenticated user',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      // Search
      {
        name: 'github_search_code',
        description: 'Search code',
        category: 'developer',
        integration: 'github',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect GitHub.' };
    }

    const baseUrl = 'https://api.github.com';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };

    try {
      switch (toolName) {
        case 'github_list_repos': {
          const queryParams = new URLSearchParams();
          if (params.type) queryParams.set('type', params.type as string);
          if (params.sort) queryParams.set('sort', params.sort as string);
          queryParams.set('per_page', String(params.per_page || 30));

          const response = await fetch(`${baseUrl}/user/repos?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_get_repo': {
          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_create_repo': {
          const body: Record<string, unknown> = { name: params.name };
          if (params.description) body.description = params.description;
          if (params.private !== undefined) body.private = params.private;

          const response = await fetch(`${baseUrl}/user/repos`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_list_issues': {
          const queryParams = new URLSearchParams();
          if (params.state) queryParams.set('state', params.state as string);
          if (params.labels) queryParams.set('labels', params.labels as string);

          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}/issues?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_get_issue': {
          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_create_issue': {
          const body: Record<string, unknown> = { title: params.title };
          if (params.body) body.body = params.body;
          if (params.labels) body.labels = params.labels;
          if (params.assignees) body.assignees = params.assignees;

          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}/issues`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_update_issue': {
          const body: Record<string, unknown> = {};
          if (params.title) body.title = params.title;
          if (params.body) body.body = params.body;
          if (params.state) body.state = params.state;

          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}/issues/${params.issue_number}`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_list_pull_requests': {
          const queryParams = new URLSearchParams();
          if (params.state) queryParams.set('state', params.state as string);

          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}/pulls?${queryParams}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_get_pull_request': {
          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}/pulls/${params.pull_number}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_create_pull_request': {
          const body: Record<string, unknown> = {
            title: params.title,
            head: params.head,
            base: params.base,
          };
          if (params.body) body.body = params.body;

          const response = await fetch(`${baseUrl}/repos/${params.owner}/${params.repo}/pulls`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_get_user': {
          const response = await fetch(`${baseUrl}/user`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'github_search_code': {
          const response = await fetch(`${baseUrl}/search/code?q=${encodeURIComponent(params.query as string)}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.items };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const githubIntegration = new GitHubIntegration();
