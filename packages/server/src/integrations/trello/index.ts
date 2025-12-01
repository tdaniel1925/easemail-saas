// ===========================================
// TRELLO INTEGRATION
// Project management with boards and cards
// ===========================================

import {
  Integration,
  IntegrationConfig,
  IntegrationCredentials,
  ToolDefinition,
  ToolResult,
} from '../types.js';

class TrelloIntegration implements Integration {
  config: IntegrationConfig = {
    id: 'trello',
    name: 'Trello',
    description: 'Project management with boards, lists, and cards',
    category: 'productivity',
    authType: 'oauth1', // Trello uses OAuth 1.0a
    requiredEnvVars: ['TRELLO_API_KEY', 'TRELLO_API_SECRET'],
  };

  private apiKey = process.env.TRELLO_API_KEY;
  private apiSecret = process.env.TRELLO_API_SECRET;
  private redirectUri = process.env.TRELLO_REDIRECT_URI || `${process.env.BASE_URL || 'http://localhost:3050'}/integrations/trello/callback`;

  isConfigured(): boolean {
    return !!(this.apiKey && this.apiSecret);
  }

  async initialize(): Promise<void> {}

  async getAuthUrl(tenantId: string, state?: string): Promise<string> {
    const stateParam = state || tenantId;
    // Trello uses a simplified OAuth flow with API key
    return `https://trello.com/1/authorize?expiration=never&name=BotMakers&scope=read,write&response_type=token&key=${this.apiKey}&callback_method=fragment&return_url=${encodeURIComponent(this.redirectUri)}?state=${stateParam}`;
  }

  async handleCallback(code: string, _state: string): Promise<IntegrationCredentials> {
    // For Trello, the token is returned directly
    return {
      integrationId: 'trello',
      tenantId: _state,
      accessToken: code, // Token passed directly
    };
  }

  getTools(): ToolDefinition[] {
    return [
      {
        name: 'trello_list_boards',
        description: 'List all Trello boards',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
        ],
      },
      {
        name: 'trello_get_board',
        description: 'Get a Trello board details',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'board_id', type: 'string', description: 'Board ID', required: true },
        ],
      },
      {
        name: 'trello_list_lists',
        description: 'List all lists in a board',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'board_id', type: 'string', description: 'Board ID', required: true },
        ],
      },
      {
        name: 'trello_list_cards',
        description: 'List cards in a list or board',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'list_id', type: 'string', description: 'List ID', required: false },
          { name: 'board_id', type: 'string', description: 'Board ID (if no list_id)', required: false },
        ],
      },
      {
        name: 'trello_create_card',
        description: 'Create a new card',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'list_id', type: 'string', description: 'List ID', required: true },
          { name: 'name', type: 'string', description: 'Card name', required: true },
          { name: 'desc', type: 'string', description: 'Card description', required: false },
          { name: 'due', type: 'string', description: 'Due date (ISO format)', required: false },
        ],
      },
      {
        name: 'trello_update_card',
        description: 'Update a card',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'card_id', type: 'string', description: 'Card ID', required: true },
          { name: 'name', type: 'string', description: 'Card name', required: false },
          { name: 'desc', type: 'string', description: 'Card description', required: false },
          { name: 'due', type: 'string', description: 'Due date', required: false },
          { name: 'list_id', type: 'string', description: 'Move to list', required: false },
        ],
      },
      {
        name: 'trello_delete_card',
        description: 'Delete a card',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'card_id', type: 'string', description: 'Card ID', required: true },
        ],
      },
      {
        name: 'trello_add_comment',
        description: 'Add a comment to a card',
        category: 'productivity',
        integration: 'trello',
        parameters: [
          { name: 'tenant_id', type: 'string', description: 'Tenant ID', required: true },
          { name: 'card_id', type: 'string', description: 'Card ID', required: true },
          { name: 'text', type: 'string', description: 'Comment text', required: true },
        ],
      },
    ];
  }

  async executeTool(toolName: string, params: Record<string, unknown>, credentials: IntegrationCredentials): Promise<ToolResult> {
    const token = credentials.accessToken;
    if (!token) {
      return { success: false, error: 'No access token. Please connect Trello.' };
    }

    const baseUrl = 'https://api.trello.com/1';
    const authParams = `key=${this.apiKey}&token=${token}`;

    try {
      switch (toolName) {
        case 'trello_list_boards': {
          const response = await fetch(`${baseUrl}/members/me/boards?${authParams}`);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'trello_get_board': {
          const response = await fetch(`${baseUrl}/boards/${params.board_id}?${authParams}`);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'trello_list_lists': {
          const response = await fetch(`${baseUrl}/boards/${params.board_id}/lists?${authParams}`);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'trello_list_cards': {
          const endpoint = params.list_id
            ? `${baseUrl}/lists/${params.list_id}/cards?${authParams}`
            : `${baseUrl}/boards/${params.board_id}/cards?${authParams}`;
          const response = await fetch(endpoint);
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'trello_create_card': {
          const body = new URLSearchParams({
            idList: params.list_id as string,
            name: params.name as string,
          });
          if (params.desc) body.set('desc', params.desc as string);
          if (params.due) body.set('due', params.due as string);

          const response = await fetch(`${baseUrl}/cards?${authParams}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'trello_update_card': {
          const body = new URLSearchParams();
          if (params.name) body.set('name', params.name as string);
          if (params.desc) body.set('desc', params.desc as string);
          if (params.due) body.set('due', params.due as string);
          if (params.list_id) body.set('idList', params.list_id as string);

          const response = await fetch(`${baseUrl}/cards/${params.card_id}?${authParams}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          const data = await response.json();
          return { success: true, data };
        }

        case 'trello_delete_card': {
          const response = await fetch(`${baseUrl}/cards/${params.card_id}?${authParams}`, {
            method: 'DELETE',
          });
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return { success: true, data: { deleted: true } };
        }

        case 'trello_add_comment': {
          const response = await fetch(`${baseUrl}/cards/${params.card_id}/actions/comments?${authParams}&text=${encodeURIComponent(params.text as string)}`, {
            method: 'POST',
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

export const trelloIntegration = new TrelloIntegration();
