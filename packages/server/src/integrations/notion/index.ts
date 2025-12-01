// ===========================================
// NOTION INTEGRATION
// Knowledge management and collaboration
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class NotionIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'notion',
    name: 'Notion',
    description: 'Knowledge management and collaboration platform',
    category: 'files',
    authType: 'oauth2',
    requiredEnvVars: ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'],
  };

  private clientId = process.env.NOTION_CLIENT_ID;
  private clientSecret = process.env.NOTION_CLIENT_SECRET;
  private redirectUri = process.env.NOTION_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/notion/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    return `https://api.notion.com/v1/oauth/authorize?client_id=${this.clientId}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const response = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return {
      integrationId: 'notion',
      tenantId: _state,
      accessToken: data.access_token,
      metadata: {
        workspaceId: data.workspace_id,
        workspaceName: data.workspace_name,
        botId: data.bot_id,
      },
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'notion_search',
        description: 'Search Notion pages and databases',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'query', type: 'string', description: 'Search query', required: true },
          { name: 'filter', type: 'string', description: 'Filter type (page, database)', required: false },
        ],
      },
      {
        name: 'notion_list_databases',
        description: 'List Notion databases',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'notion_query_database',
        description: 'Query a Notion database',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'database_id', type: 'string', description: 'Database ID', required: true },
          { name: 'page_size', type: 'number', description: 'Results per page', required: false, default: 100 },
        ],
      },
      {
        name: 'notion_get_page',
        description: 'Get a Notion page',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'page_id', type: 'string', description: 'Page ID', required: true },
        ],
      },
      {
        name: 'notion_create_page',
        description: 'Create a new Notion page',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'parent_id', type: 'string', description: 'Parent page or database ID', required: true },
          { name: 'parent_type', type: 'string', description: 'Parent type (page_id or database_id)', required: true },
          { name: 'title', type: 'string', description: 'Page title', required: true },
          { name: 'content', type: 'string', description: 'Page content (markdown)', required: false },
        ],
      },
      {
        name: 'notion_update_page',
        description: 'Update a Notion page properties',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'page_id', type: 'string', description: 'Page ID', required: true },
          { name: 'properties', type: 'object', description: 'Properties to update', required: true },
        ],
      },
      {
        name: 'notion_get_block_children',
        description: 'Get children blocks of a page or block',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'block_id', type: 'string', description: 'Block or page ID', required: true },
        ],
      },
      {
        name: 'notion_append_blocks',
        description: 'Append blocks to a page',
        category: 'productivity',
        integration: 'notion',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'block_id', type: 'string', description: 'Block or page ID', required: true },
          { name: 'children', type: 'array', description: 'Array of block objects', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Notion.' };
    }

    const baseUrl = 'https://api.notion.com/v1';
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    };

    try {
      switch (toolName) {
        case 'notion_search': {
          const body: Record<string, unknown> = { query: params.query };
          if (params.filter) {
            body.filter = { value: params.filter, property: 'object' };
          }

          const response = await fetch(`${baseUrl}/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'notion_list_databases': {
          const response = await fetch(`${baseUrl}/search`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ filter: { value: 'database', property: 'object' } }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'notion_query_database': {
          const response = await fetch(`${baseUrl}/databases/${params.database_id}/query`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ page_size: params.page_size || 100 }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'notion_get_page': {
          const response = await fetch(`${baseUrl}/pages/${params.page_id}`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'notion_create_page': {
          const body: Record<string, unknown> = {
            parent: { [params.parent_type as string]: params.parent_id },
            properties: {
              title: {
                title: [{ text: { content: params.title } }],
              },
            },
          };

          if (params.content) {
            body.children = [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [{ type: 'text', text: { content: params.content } }],
                },
              },
            ];
          }

          const response = await fetch(`${baseUrl}/pages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'notion_update_page': {
          const response = await fetch(`${baseUrl}/pages/${params.page_id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ properties: params.properties }),
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'notion_get_block_children': {
          const response = await fetch(`${baseUrl}/blocks/${params.block_id}/children`, { headers });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data: data.results };
        }

        case 'notion_append_blocks': {
          const response = await fetch(`${baseUrl}/blocks/${params.block_id}/children`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ children: params.children }),
          });
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

export const notionIntegration = new NotionIntegration();
