// ===========================================
// LINEAR INTEGRATION
// Modern issue tracking and project management
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class LinearIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'linear',
    name: 'Linear',
    description: 'Modern issue tracking and project management',
    category: 'productivity',
    authType: 'oauth2',
    scopes: ['read', 'write', 'issues:create', 'comments:create'],
    requiredEnvVars: ['LINEAR_CLIENT_ID', 'LINEAR_CLIENT_SECRET'],
  };

  private clientId = process.env.LINEAR_CLIENT_ID;
  private clientSecret = process.env.LINEAR_CLIENT_SECRET;
  private redirectUri = process.env.LINEAR_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/linear/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    const scopes = this.config.scopes?.join(',') || 'read,write';
    return `https://linear.app/oauth/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&response_type=code&scope=${scopes}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://api.linear.app/oauth/token', {
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
    if (data.error) throw new Error(data.error_description || data.error);

    return {
      integrationId: 'linear',
      tenantId: _state,
      accessToken: data.access_token,
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'linear_list_issues',
        description: 'List Linear issues',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'first', type: 'number', description: 'Number of issues', required: false, default: 50 },
          { name: 'filter', type: 'object', description: 'Filter criteria', required: false },
        ],
      },
      {
        name: 'linear_get_issue',
        description: 'Get issue details',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'issue_id', type: 'string', description: 'Issue ID', required: true },
        ],
      },
      {
        name: 'linear_create_issue',
        description: 'Create a new issue',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'title', type: 'string', description: 'Issue title', required: true },
          { name: 'description', type: 'string', description: 'Issue description', required: false },
          { name: 'team_id', type: 'string', description: 'Team ID', required: true },
          { name: 'assignee_id', type: 'string', description: 'Assignee ID', required: false },
          { name: 'priority', type: 'number', description: 'Priority (0-4)', required: false },
        ],
      },
      {
        name: 'linear_update_issue',
        description: 'Update an issue',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'issue_id', type: 'string', description: 'Issue ID', required: true },
          { name: 'title', type: 'string', description: 'New title', required: false },
          { name: 'description', type: 'string', description: 'New description', required: false },
          { name: 'state_id', type: 'string', description: 'State ID', required: false },
          { name: 'assignee_id', type: 'string', description: 'Assignee ID', required: false },
        ],
      },
      {
        name: 'linear_list_teams',
        description: 'List Linear teams',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'linear_list_projects',
        description: 'List Linear projects',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'first', type: 'number', description: 'Number of projects', required: false, default: 50 },
        ],
      },
      {
        name: 'linear_add_comment',
        description: 'Add a comment to an issue',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'issue_id', type: 'string', description: 'Issue ID', required: true },
          { name: 'body', type: 'string', description: 'Comment body', required: true },
        ],
      },
      {
        name: 'linear_search_issues',
        description: 'Search issues',
        category: 'productivity',
        integration: 'linear',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
        ],
      },
    ];
  }

  private async graphqlRequest(token: string, query: string, variables?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    const data = await response.json();
    if (data.errors) throw new Error(data.errors[0].message);
    return data.data;
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Linear.' };
    }

    try {
      switch (toolName) {
        case 'linear_list_issues': {
          const query = `
            query Issues($first: Int, $filter: IssueFilter) {
              issues(first: $first, filter: $filter) {
                nodes {
                  id
                  identifier
                  title
                  description
                  priority
                  state { id name }
                  assignee { id name }
                  createdAt
                  updatedAt
                }
              }
            }
          `;
          const data = await this.graphqlRequest(token, query, {
            first: params.first || 50,
            filter: params.filter,
          }) as { issues: { nodes: unknown[] } };
          return { success: true, data: data.issues.nodes };
        }

        case 'linear_get_issue': {
          const query = `
            query Issue($id: String!) {
              issue(id: $id) {
                id
                identifier
                title
                description
                priority
                state { id name }
                assignee { id name }
                team { id name }
                project { id name }
                createdAt
                updatedAt
                comments { nodes { id body user { name } createdAt } }
              }
            }
          `;
          const data = await this.graphqlRequest(token, query, { id: params.issue_id }) as { issue: unknown };
          return { success: true, data: data.issue };
        }

        case 'linear_create_issue': {
          const mutation = `
            mutation CreateIssue($input: IssueCreateInput!) {
              issueCreate(input: $input) {
                success
                issue {
                  id
                  identifier
                  title
                }
              }
            }
          `;
          const input: Record<string, unknown> = {
            title: params.title,
            teamId: params.team_id,
          };
          if (params.description) input.description = params.description;
          if (params.assignee_id) input.assigneeId = params.assignee_id;
          if (params.priority !== undefined) input.priority = params.priority;

          const data = await this.graphqlRequest(token, mutation, { input }) as { issueCreate: { issue: unknown } };
          return { success: true, data: data.issueCreate.issue };
        }

        case 'linear_update_issue': {
          const mutation = `
            mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
              issueUpdate(id: $id, input: $input) {
                success
                issue {
                  id
                  identifier
                  title
                }
              }
            }
          `;
          const input: Record<string, unknown> = {};
          if (params.title) input.title = params.title;
          if (params.description) input.description = params.description;
          if (params.state_id) input.stateId = params.state_id;
          if (params.assignee_id) input.assigneeId = params.assignee_id;

          const data = await this.graphqlRequest(token, mutation, {
            id: params.issue_id,
            input,
          }) as { issueUpdate: { issue: unknown } };
          return { success: true, data: data.issueUpdate.issue };
        }

        case 'linear_list_teams': {
          const query = `
            query Teams {
              teams {
                nodes {
                  id
                  name
                  key
                  description
                }
              }
            }
          `;
          const data = await this.graphqlRequest(token, query) as { teams: { nodes: unknown[] } };
          return { success: true, data: data.teams.nodes };
        }

        case 'linear_list_projects': {
          const query = `
            query Projects($first: Int) {
              projects(first: $first) {
                nodes {
                  id
                  name
                  description
                  state
                  progress
                }
              }
            }
          `;
          const data = await this.graphqlRequest(token, query, { first: params.first || 50 }) as { projects: { nodes: unknown[] } };
          return { success: true, data: data.projects.nodes };
        }

        case 'linear_add_comment': {
          const mutation = `
            mutation CreateComment($input: CommentCreateInput!) {
              commentCreate(input: $input) {
                success
                comment {
                  id
                  body
                  createdAt
                }
              }
            }
          `;
          const data = await this.graphqlRequest(token, mutation, {
            input: {
              issueId: params.issue_id,
              body: params.body,
            },
          }) as { commentCreate: { comment: unknown } };
          return { success: true, data: data.commentCreate.comment };
        }

        case 'linear_search_issues': {
          const query = `
            query SearchIssues($query: String!) {
              searchIssues(query: $query) {
                nodes {
                  id
                  identifier
                  title
                  description
                  state { name }
                }
              }
            }
          `;
          const data = await this.graphqlRequest(token, query, { query: params.query }) as { searchIssues: { nodes: unknown[] } };
          return { success: true, data: data.searchIssues.nodes };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const linearIntegration = new LinearIntegration();
