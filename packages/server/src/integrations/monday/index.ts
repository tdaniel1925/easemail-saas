// ===========================================
// MONDAY.COM INTEGRATION
// Work OS for project and workflow management
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class MondayIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'monday',
    name: 'Monday.com',
    description: 'Work OS for project and workflow management',
    category: 'productivity',
    authType: 'oauth2',
    scopes: ['boards:read', 'boards:write', 'workspaces:read'],
    requiredEnvVars: ['MONDAY_CLIENT_ID', 'MONDAY_CLIENT_SECRET'],
  };

  private clientId = process.env.MONDAY_CLIENT_ID;
  private clientSecret = process.env.MONDAY_CLIENT_SECRET;
  private redirectUri = process.env.MONDAY_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/monday/callback`;

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    return `https://auth.monday.com/oauth2/authorize?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}&state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    const response = await fetch('https://auth.monday.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    return {
      integrationId: 'monday',
      tenantId: _state,
      accessToken: data.access_token,
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'monday_list_boards',
        description: 'List Monday.com boards',
        category: 'productivity',
        integration: 'monday',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'limit', type: 'number', description: 'Max boards', required: false, default: 25 },
        ],
      },
      {
        name: 'monday_get_board',
        description: 'Get board details with items',
        category: 'productivity',
        integration: 'monday',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'board_id', type: 'string', description: 'Board ID', required: true },
        ],
      },
      {
        name: 'monday_list_items',
        description: 'List items in a board',
        category: 'productivity',
        integration: 'monday',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'board_id', type: 'string', description: 'Board ID', required: true },
          { name: 'limit', type: 'number', description: 'Max items', required: false, default: 100 },
        ],
      },
      {
        name: 'monday_create_item',
        description: 'Create a new item in a board',
        category: 'productivity',
        integration: 'monday',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'board_id', type: 'string', description: 'Board ID', required: true },
          { name: 'item_name', type: 'string', description: 'Item name', required: true },
          { name: 'group_id', type: 'string', description: 'Group ID', required: false },
          { name: 'column_values', type: 'object', description: 'Column values (JSON)', required: false },
        ],
      },
      {
        name: 'monday_update_item',
        description: 'Update item column values',
        category: 'productivity',
        integration: 'monday',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'board_id', type: 'string', description: 'Board ID', required: true },
          { name: 'item_id', type: 'string', description: 'Item ID', required: true },
          { name: 'column_values', type: 'object', description: 'Column values to update', required: true },
        ],
      },
      {
        name: 'monday_delete_item',
        description: 'Delete an item',
        category: 'productivity',
        integration: 'monday',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'item_id', type: 'string', description: 'Item ID', required: true },
        ],
      },
      {
        name: 'monday_add_update',
        description: 'Add an update/comment to an item',
        category: 'productivity',
        integration: 'monday',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'item_id', type: 'string', description: 'Item ID', required: true },
          { name: 'body', type: 'string', description: 'Update body text', required: true },
        ],
      },
    ];
  }

  private async graphqlRequest(token: string, query: string, variables?: Record<string, unknown>): Promise<unknown> {
    const response = await fetch('https://api.monday.com/v2', {
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
      return { success: false, error: 'No access token. Please connect Monday.com.' };
    }

    try {
      switch (toolName) {
        case 'monday_list_boards': {
          const query = `query { boards(limit: ${params.limit || 25}) { id name state board_folder_id } }`;
          const data = await this.graphqlRequest(token, query) as { boards: unknown[] };
          return { success: true, data: data.boards };
        }

        case 'monday_get_board': {
          const query = `query { boards(ids: [${params.board_id}]) { id name state columns { id title type } groups { id title } items_page(limit: 100) { items { id name column_values { id value text } } } } }`;
          const data = await this.graphqlRequest(token, query) as { boards: unknown[] };
          return { success: true, data: data.boards[0] };
        }

        case 'monday_list_items': {
          const query = `query { boards(ids: [${params.board_id}]) { items_page(limit: ${params.limit || 100}) { items { id name column_values { id value text } group { id title } } } } }`;
          const data = await this.graphqlRequest(token, query) as { boards: Array<{ items_page: { items: unknown[] } }> };
          return { success: true, data: data.boards[0]?.items_page?.items || [] };
        }

        case 'monday_create_item': {
          let mutation = `mutation { create_item(board_id: ${params.board_id}, item_name: "${params.item_name}"`;
          if (params.group_id) mutation += `, group_id: "${params.group_id}"`;
          if (params.column_values) mutation += `, column_values: ${JSON.stringify(JSON.stringify(params.column_values))}`;
          mutation += `) { id name } }`;

          const data = await this.graphqlRequest(token, mutation) as { create_item: unknown };
          return { success: true, data: data.create_item };
        }

        case 'monday_update_item': {
          const mutation = `mutation { change_multiple_column_values(board_id: ${params.board_id}, item_id: ${params.item_id}, column_values: ${JSON.stringify(JSON.stringify(params.column_values))}) { id name } }`;
          const data = await this.graphqlRequest(token, mutation) as { change_multiple_column_values: unknown };
          return { success: true, data: data.change_multiple_column_values };
        }

        case 'monday_delete_item': {
          const mutation = `mutation { delete_item(item_id: ${params.item_id}) { id } }`;
          const data = await this.graphqlRequest(token, mutation) as { delete_item: unknown };
          return { success: true, data: data.delete_item };
        }

        case 'monday_add_update': {
          const mutation = `mutation { create_update(item_id: ${params.item_id}, body: "${(params.body as string).replace(/"/g, '\\"')}") { id body } }`;
          const data = await this.graphqlRequest(token, mutation) as { create_update: unknown };
          return { success: true, data: data.create_update };
        }

        default:
          return { success: false, error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const mondayIntegration = new MondayIntegration();
